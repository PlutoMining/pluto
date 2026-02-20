"""
Mapper between internal PoolsConfig model and pyasic PoolConfig types.

Uses explicit field-by-field mapping only (no dict-based conversion).
"""

from __future__ import annotations

from typing import Any

from app.models import PoolEntry, PoolsConfig
from app.models import PoolGroup as InternalPoolGroup

try:  # pragma: no cover - pyasic is an optional dependency
    from pyasic.config.pools import (
        Pool as PyasicPool,
    )
    from pyasic.config.pools import (
        PoolConfig as PyasicPoolConfig,
    )
    from pyasic.config.pools import (
        PoolGroup as PyasicPoolGroup,
    )
except ImportError:  # pragma: no cover - handled gracefully at runtime
    PyasicPool = None  # type: ignore[assignment]
    PyasicPoolConfig = None  # type: ignore[assignment]
    PyasicPoolGroup = None  # type: ignore[assignment]


def pools_from_pyasic(pools: Any) -> PoolsConfig | None:
    """
    Convert a pyasic PoolConfig instance to internal PoolsConfig.

    Returns None when the input is falsy or has no ``groups`` attribute.
    """
    if pools is None:
        return None

    groups = getattr(pools, "groups", None)
    if groups is None:
        return None

    out_groups: list[InternalPoolGroup] = []
    for group in groups:
        pool_list = getattr(group, "pools", []) or []
        out_pools: list[PoolEntry] = []
        for pool in pool_list:
            out_pools.append(
                PoolEntry(
                    url=getattr(pool, "url", None),
                    user=getattr(pool, "user", None),
                    password=getattr(pool, "password", None),
                )
            )
        out_groups.append(
            InternalPoolGroup(
                pools=out_pools,
                quota=getattr(group, "quota", None),
                name=getattr(group, "name", None),
            )
        )

    return PoolsConfig(groups=out_groups)


def pools_to_pyasic(internal: PoolsConfig | None) -> Any:
    """
    Convert internal PoolsConfig to a pyasic PoolConfig instance.

    Falls back to pyasic defaults when internal is None or has no groups.
    """
    if PyasicPoolConfig is None:
        return None

    if internal is None or not internal.groups:
        return PyasicPoolConfig.default()

    groups: list[Any] = []
    for group in internal.groups:
        pools: list[Any] = []
        for pool in group.pools:
            pools.append(
                PyasicPool(  # type: ignore[call-arg]
                    url=pool.url or "",
                    user=pool.user or "",
                    password=pool.password or "",
                )
            )
        groups.append(
            PyasicPoolGroup(  # type: ignore[call-arg]
                pools=pools,
                quota=group.quota,
                name=group.name,
            )
        )

    return PyasicPoolConfig(groups=groups)  # type: ignore[call-arg]

