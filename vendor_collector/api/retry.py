"""Reusable retry helpers for transient HTTP failures.

Wraps :mod:`tenacity` so API calls automatically retry on rate-limit (429) and
server (500/503) responses using exponential backoff with jitter.
"""

from __future__ import annotations

from typing import Callable, TypeVar

import requests
from tenacity import (
    RetryCallState,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

from config import settings
from logging_config import get_logger

logger = get_logger(__name__)

T = TypeVar("T")

# HTTP status codes that are safe to retry.
RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class RetryableHTTPError(Exception):
    """Raised for HTTP responses that should trigger a retry."""


def _log_retry(retry_state: RetryCallState) -> None:
    """Emit a warning each time a call is retried."""
    attempt = retry_state.attempt_number
    exc = retry_state.outcome.exception() if retry_state.outcome else None
    logger.warning("Retrying API call (attempt %s) after error: %s", attempt, exc)


def with_retry(func: Callable[..., T]) -> Callable[..., T]:
    """Decorate ``func`` with exponential-backoff retry behaviour."""
    return retry(
        reraise=True,
        stop=stop_after_attempt(settings.max_retries),
        wait=wait_exponential_jitter(initial=1, max=30),
        retry=retry_if_exception_type((RetryableHTTPError, requests.ConnectionError, requests.Timeout)),
        before_sleep=_log_retry,
    )(func)


def raise_for_retryable_status(response: requests.Response) -> None:
    """Raise :class:`RetryableHTTPError` when the status code is retryable.

    Non-retryable error codes raise the standard ``requests`` exception so the
    caller can handle them explicitly.
    """
    if response.status_code in RETRYABLE_STATUS:
        raise RetryableHTTPError(
            f"Retryable status {response.status_code}: {response.text[:200]}"
        )
    response.raise_for_status()
