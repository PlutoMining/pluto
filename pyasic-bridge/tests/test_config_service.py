"""
Unit tests for MinerConfigService.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import pytest

from app.models import MinerConfigModel, StatusResponse
from app.services.config_service import MinerConfigService
from app.validators import ConfigValidationError, ExtraConfigNotAvailableError


@dataclass
class StubMinerClient:
    """Minimal stub MinerClient for testing MinerConfigService."""

    existing_cfg: Any
    miner: Any | None = None
    sent_configs: list[tuple[str, Any]] = field(default_factory=list)

    async def get_miner_config_dict(self, ip: str) -> Any:  # pragma: no cover - exercised via service
        return self.existing_cfg

    async def get_miner(self, ip: str) -> Any | None:  # pragma: no cover - exercised via service
        return self.miner

    async def send_miner_config(self, ip: str, config: Any) -> None:  # pragma: no cover - exercised via service
        self.sent_configs.append((ip, config))


class DummyValidator:
    """Capture configs passed to validate()."""

    def __init__(self, should_raise: bool = False, exc: Exception | None = None) -> None:
        self.should_raise = should_raise
        self.exc = exc or ConfigValidationError("invalid config")
        self.last_config: dict[str, Any] | None = None
        self.last_miner: Any | None = None

    def validate(self, config: dict[str, Any], miner: Any) -> None:
        self.last_config = dict(config)
        self.last_miner = miner
        if self.should_raise:
            raise self.exc


@pytest.mark.asyncio
async def test_get_miner_config_conversion_error_returns_empty_model(monkeypatch):
    """If miner_config_from_pyasic raises, service should log and return empty MinerConfigModel."""

    async def fake_get_cfg(ip: str) -> Any:
        return object()

    class DummyClient:
        async def get_miner_config_dict(self, ip: str) -> Any:
            return await fake_get_cfg(ip)

    # Force mapper to raise
    import app.services.config_service as m

    def boom(_cfg: Any) -> MinerConfigModel:  # type: ignore[override]
        raise RuntimeError("bad config shape")

    monkeypatch.setattr(m, "miner_config_from_pyasic", boom)

    service = MinerConfigService(client=DummyClient())  # type: ignore[arg-type]
    result = await service.get_miner_config("192.168.1.10")
    assert isinstance(result, MinerConfigModel)
    # Empty model: no pools / modes / extra_config
    assert result.pools is None
    assert result.extra_config is None


@pytest.mark.asyncio
async def test_update_miner_config_raises_when_miner_not_found(monkeypatch):
    """update_miner_config should raise ValueError when client.get_miner returns None."""

    class ExistingCfg:
        extra_config = object()

    existing_cfg = ExistingCfg()
    client = StubMinerClient(existing_cfg=existing_cfg, miner=None)

    import app.services.config_service as m

    # Mapper returns an empty internal model
    monkeypatch.setattr(m, "miner_config_from_pyasic", lambda _cfg: MinerConfigModel())
    # Validator is a no-op (should not be reached because miner is None)
    monkeypatch.setattr(m, "get_config_validator", lambda _miner: DummyValidator())

    service = MinerConfigService(client=client)  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="Miner not found at 192.168.1.10"):
        await service.update_miner_config("192.168.1.10", {})


@pytest.mark.asyncio
async def test_update_miner_config_raises_when_extra_config_missing(monkeypatch):
    """update_miner_config should raise ExtraConfigNotAvailableError when extra_config is None."""

    class ExistingCfg:
        def __init__(self) -> None:
            self.extra_config = None

    existing_cfg = ExistingCfg()
    miner = object()
    client = StubMinerClient(existing_cfg=existing_cfg, miner=miner)

    import app.services.config_service as m

    monkeypatch.setattr(m, "miner_config_from_pyasic", lambda _cfg: MinerConfigModel())
    monkeypatch.setattr(m, "get_config_validator", lambda _miner: DummyValidator())

    service = MinerConfigService(client=client)  # type: ignore[arg-type]

    with pytest.raises(ExtraConfigNotAvailableError):
        await service.update_miner_config("192.168.1.10", {})


@pytest.mark.asyncio
async def test_update_miner_config_merges_and_sends(monkeypatch):
    """update_miner_config should deep-merge nested dicts and call send_miner_config."""

    class ExistingCfg:
        def __init__(self) -> None:
            # extra_config object must be present so update is allowed
            self.extra_config = object()

    existing_cfg = ExistingCfg()
    miner = object()
    client = StubMinerClient(existing_cfg=existing_cfg, miner=miner)

    import app.services.config_service as m

    # Base internal config has nested structures to be merged
    base_internal = MinerConfigModel(
        fan_mode={"mode": "manual", "speed": 60},
        temperature={"target": 65},
        mining_mode={"mode": "normal"},
        extra_config={"rotation": 0, "invertscreen": 0},
    )

    monkeypatch.setattr(m, "miner_config_from_pyasic", lambda _cfg: base_internal)

    dummy_validator = DummyValidator()
    monkeypatch.setattr(m, "get_config_validator", lambda _miner: dummy_validator)

    captured_internal_models: list[MinerConfigModel] = []

    def fake_to_pyasic(internal: MinerConfigModel, existing: Any) -> Any:
        captured_internal_models.append(internal)
        return {"pyasic": True, "existing": existing}

    monkeypatch.setattr(m, "miner_config_to_pyasic", fake_to_pyasic)

    service = MinerConfigService(client=client)  # type: ignore[arg-type]

    patch_config = {
        "fan_mode": {"speed": 80},  # should merge with existing fan_mode
        "extra_config": {"invertscreen": 1},  # should merge with existing extra_config
    }

    status = await service.update_miner_config("192.168.1.10", patch_config)

    assert isinstance(status, StatusResponse)
    assert status.status == "success"

    # Validator should have seen merged config
    assert dummy_validator.last_config is not None
    merged = dummy_validator.last_config
    assert merged["fan_mode"] == {"mode": "manual", "speed": 80}
    assert merged["extra_config"] == {"rotation": 0, "invertscreen": 1}

    # miner_config_to_pyasic should have been called with a MinerConfigModel
    assert captured_internal_models
    assert isinstance(captured_internal_models[0], MinerConfigModel)

    # Client should have been asked to send the resulting config
    assert client.sent_configs
    ip, sent_cfg = client.sent_configs[0]
    assert ip == "192.168.1.10"
    assert sent_cfg == {"pyasic": True, "existing": existing_cfg}


@pytest.mark.asyncio
async def test_validate_miner_config_valid(monkeypatch):
    """validate_miner_config should return valid=True when validator passes."""

    class ExistingCfg:
        def __init__(self) -> None:
            self.extra_config = object()

    existing_cfg = ExistingCfg()
    miner = object()
    client = StubMinerClient(existing_cfg=existing_cfg, miner=miner)

    import app.services.config_service as m

    base_internal = MinerConfigModel(extra_config={"rotation": 0})
    monkeypatch.setattr(m, "miner_config_from_pyasic", lambda _cfg: base_internal)

    dummy_validator = DummyValidator()
    monkeypatch.setattr(m, "get_config_validator", lambda _miner: dummy_validator)

    service = MinerConfigService(client=client)  # type: ignore[arg-type]

    result = await service.validate_miner_config(
        "192.168.1.10", {"extra_config": {"invertscreen": 1}}
    )

    assert result == {"valid": True, "errors": []}
    assert dummy_validator.last_config is not None
    merged = dummy_validator.last_config
    assert merged["extra_config"] == {"rotation": 0, "invertscreen": 1}


@pytest.mark.asyncio
async def test_validate_miner_config_invalid(monkeypatch):
    """validate_miner_config should return valid=False and capture error message."""

    class ExistingCfg:
        def __init__(self) -> None:
            self.extra_config = object()

    existing_cfg = ExistingCfg()
    miner = object()
    client = StubMinerClient(existing_cfg=existing_cfg, miner=miner)

    import app.services.config_service as m

    base_internal = MinerConfigModel()
    monkeypatch.setattr(m, "miner_config_from_pyasic", lambda _cfg: base_internal)

    dummy_validator = DummyValidator(should_raise=True, exc=ConfigValidationError("boom"))
    monkeypatch.setattr(m, "get_config_validator", lambda _miner: dummy_validator)

    service = MinerConfigService(client=client)  # type: ignore[arg-type]

    result = await service.validate_miner_config("192.168.1.10", {"extra_config": {"frequency": 999}})

    assert result["valid"] is False
    assert len(result["errors"]) == 1
    assert "boom" in result["errors"][0]

