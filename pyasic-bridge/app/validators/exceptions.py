"""
Exceptions for config validators and config update flow.
"""


class ConfigValidationError(ValueError):
    """
    Exception raised when config validation fails.

    Caught by API handlers and returned as 400 Bad Request.
    """

    pass


class ExtraConfigNotAvailableError(ValueError):
    """
    Exception raised when miner config has no extra_config from pyasic.

    The update logic requires existing_cfg.extra_config to reuse its type; if it is None,
    we cannot update. Caught by API handlers and returned as 400 Bad Request.
    """

    pass
