"""Bound loan files are not readable or writable without the owning session."""

import os
import tempfile
import unittest

_DB = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite:///{_DB.name}"
os.environ["SECRET_KEY"] = "test-secret-not-for-production"
os.environ["XAI_API_KEY"] = ""
os.environ["LLM_BASE_URL"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app.db import init_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.security import tokenize_tax_id  # noqa: E402

init_db()


def _client() -> TestClient:
    return TestClient(create_app())


class FileAccessTests(unittest.TestCase):
    def test_unbound_file_is_readable_by_its_id(self):
        anon = _client()
        created = anon.post("/api/cx1/processes")
        self.assertEqual(created.status_code, 200)
        process_id = created.json()["processId"]
        again = anon.get(f"/api/cx1/processes/{process_id}")
        self.assertEqual(again.status_code, 200)

    def test_bound_file_rejects_other_sessions_and_hides_the_ssn_token(self):
        owner = _client()
        signed = owner.post(
            "/api/cx1/auth/signup",
            json={"email": "owner@example.com", "password": "password1", "name": "Owner"},
        )
        self.assertEqual(signed.status_code, 200)
        self.assertNotIn("token", signed.json())
        created = owner.post("/api/cx1/processes")
        self.assertEqual(created.status_code, 200)
        body = created.json()
        process_id = body["processId"]
        self.assertTrue(body["userId"])

        stranger = _client()
        stranger.post(
            "/api/cx1/auth/signup",
            json={"email": "other@example.com", "password": "password1", "name": "Other"},
        )
        denied = stranger.get(f"/api/cx1/processes/{process_id}")
        self.assertEqual(denied.status_code, 403)
        overwritten = stranger.put(
            f"/api/cx1/processes/{process_id}/customer",
            json={"firstName": "Stolen"},
        )
        self.assertEqual(overwritten.status_code, 403)

        anonymous = _client()
        self.assertEqual(anonymous.get(f"/api/cx1/processes/{process_id}").status_code, 401)

        owned = owner.get(f"/api/cx1/processes/{process_id}")
        self.assertEqual(owned.status_code, 200)
        self.assertNotIn("ssnToken", str(owned.json()))

    def test_tax_id_token_is_keyed(self):
        token, last4 = tokenize_tax_id("123-45-6789")
        self.assertEqual(last4, "6789")
        self.assertEqual(len(token), 64)
        self.assertNotEqual(token, tokenize_tax_id("123-45-0000")[0])


if __name__ == "__main__":
    unittest.main()
