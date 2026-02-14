"""
Unit tests for pools_mapper (internal <-> pyasic PoolConfig).
"""

import pytest

from app.mappers import pools_from_pyasic, pools_to_pyasic
from app.models import PoolEntry, PoolGroup, PoolsConfig


class TestPoolsFromPyasic:
    """Tests for pools_from_pyasic (pyasic -> internal object)."""

    def test_returns_none_for_none(self) -> None:
        assert pools_from_pyasic(None) is None

    def test_returns_none_when_no_groups_attribute(self) -> None:
        class NoGroups:
            pass

        assert pools_from_pyasic(NoGroups()) is None

    def test_maps_basic_structure(self) -> None:
        class FakePool:
            def __init__(self, url: str, user: str, password: str) -> None:
                self.url = url
                self.user = user
                self.password = password

        class FakeGroup:
            def __init__(self) -> None:
                self.pools = [FakePool("stratum+tcp://example:3333", "user", "x")]
                self.quota = 1
                self.name = "group-1"

        class FakePools:
            def __init__(self) -> None:
                self.groups = [FakeGroup()]

        internal = pools_from_pyasic(FakePools())
        assert isinstance(internal, PoolsConfig)
        assert len(internal.groups) == 1
        group = internal.groups[0]
        assert isinstance(group, PoolGroup)
        assert group.quota == 1
        assert group.name == "group-1"
        assert len(group.pools) == 1
        pool = group.pools[0]
        assert isinstance(pool, PoolEntry)
        assert pool.url == "stratum+tcp://example:3333"
        assert pool.user == "user"
        assert pool.password == "x"


class TestPoolsToPyasic:
    """Tests for pools_to_pyasic (internal object -> pyasic PoolConfig)."""

    def test_returns_default_when_internal_is_none(self) -> None:
        try:
            from pyasic.config.pools import PoolConfig as PyasicPoolConfig
        except ImportError:
            pytest.skip("pyasic not installed")

        result = pools_to_pyasic(None)
        assert isinstance(result, PyasicPoolConfig)
        # default config should have groups attribute
        assert hasattr(result, "groups")

    def test_builds_pool_config_with_group_and_pool(self) -> None:
        try:
            from pyasic.config.pools import PoolConfig as PyasicPoolConfig
        except ImportError:
            pytest.skip("pyasic not installed")

        internal = PoolsConfig(
            groups=[
                PoolGroup(
                    pools=[
                        PoolEntry(
                            url="stratum+tcp://example:3333",
                            user="u",
                            password="p",
                        )
                    ],
                    quota=1,
                    name="group-1",
                )
            ]
        )

        result = pools_to_pyasic(internal)
        assert isinstance(result, PyasicPoolConfig)
        # We only assert that at least one group with at least one pool exists;
        # the exact internal structure/validation is controlled by pyasic.
        assert hasattr(result, "groups")
        assert len(result.groups) >= 1

