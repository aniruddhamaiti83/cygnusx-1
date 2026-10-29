"""Runtime configuration tests for the API runner."""
import unittest
from unittest.mock import patch

from app.settings import settings
from runner import validate_runtime_config


class RuntimeConfigTests(unittest.TestCase):
    def test_development_allows_local_sqlite(self):
        with (
            patch.object(settings, "app_env", "development"),
            patch.object(settings, "database_url", "sqlite:///./data/test.db"),
            patch.object(settings, "llm_timeout", 10.0),
            patch.object(settings, "session_days", 14),
        ):
            validate_runtime_config()

    def test_production_accepts_explicit_secure_configuration(self):
        with (
            patch.object(settings, "app_env", "production"),
            patch.object(settings, "secret_key", "pX4fK7rQ9wT2vN6mA8sD1hJ5kL0zB3cE"),
            patch.object(settings, "dashboard_token", "T8uV3wX6yZ9aB2cD5eF7gH0jK4mN1pQ"),
            patch.object(settings, "database_url", "postgresql://app:secret@db.internal:5432/cygnusx1"),
            patch.object(settings, "cors_origins", "https://app.example.org"),
            patch.object(settings, "llm_timeout", 30.0),
            patch.object(settings, "session_days", 14),
        ):
            validate_runtime_config()

    def test_production_rejects_sqlite(self):
        with (
            patch.object(settings, "app_env", "production"),
            patch.object(settings, "secret_key", "pX4fK7rQ9wT2vN6mA8sD1hJ5kL0zB3cE"),
            patch.object(settings, "dashboard_token", "T8uV3wX6yZ9aB2cD5eF7gH0jK4mN1pQ"),
            patch.object(settings, "database_url", "sqlite:///production.db"),
            patch.object(settings, "cors_origins", "https://app.example.org"),
        ):
            with self.assertRaisesRegex(RuntimeError, "Production requires PostgreSQL"):
                validate_runtime_config()

    def test_production_rejects_wildcard_cors(self):
        with (
            patch.object(settings, "app_env", "production"),
            patch.object(settings, "secret_key", "pX4fK7rQ9wT2vN6mA8sD1hJ5kL0zB3cE"),
            patch.object(settings, "dashboard_token", "T8uV3wX6yZ9aB2cD5eF7gH0jK4mN1pQ"),
            patch.object(settings, "database_url", "postgresql://app:secret@db.internal:5432/cygnusx1"),
            patch.object(settings, "cors_origins", "*"),
        ):
            with self.assertRaisesRegex(RuntimeError, "wildcard is forbidden"):
                validate_runtime_config()

    def test_production_requires_distinct_long_secrets(self):
        with (
            patch.object(settings, "app_env", "prod"),
            patch.object(settings, "secret_key", "dev-secret-change-me"),
            patch.object(settings, "dashboard_token", "dev-secret-change-me"),
            patch.object(settings, "database_url", "postgresql://app:secret@db.internal:5432/cygnusx1"),
            patch.object(settings, "cors_origins", "https://app.example.org"),
        ):
            with self.assertRaisesRegex(RuntimeError, "SECRET_KEY"):
                validate_runtime_config()

    def test_nonpositive_llm_timeout_is_rejected(self):
        with (
            patch.object(settings, "app_env", "development"),
            patch.object(settings, "llm_timeout", 0),
        ):
            with self.assertRaisesRegex(RuntimeError, "LLM_TIMEOUT"):
                validate_runtime_config()


if __name__ == "__main__":
    unittest.main()
