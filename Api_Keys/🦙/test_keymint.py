#!/usr/bin/env python3
"""Tests for Llamma KeyMint."""

import sys
import unittest
from pathlib import Path

# Allow running from repo root or from 🦙/ directly
sys.path.insert(0, str(Path(__file__).parent))

import keymint


class TestIssue(unittest.TestCase):
    def test_issue_returns_prefixed_key(self):
        key = keymint.issue("test_bot_alpha")
        self.assertTrue(key.startswith("aegis_"), key)

    def test_issue_different_bots_different_keys(self):
        k1 = keymint.issue("bot_x")
        k2 = keymint.issue("bot_y")
        self.assertNotEqual(k1, k2)

    def test_issue_same_bot_rotates_key(self):
        k1 = keymint.issue("rotate_me")
        k2 = keymint.issue("rotate_me")
        self.assertNotEqual(k1, k2)

    def test_issue_empty_name_raises(self):
        with self.assertRaises(ValueError):
            keymint.issue("")


class TestValidate(unittest.TestCase):
    def test_valid_key_returns_bot_name(self):
        key = keymint.issue("logos")
        owner = keymint.validate(key)
        self.assertEqual(owner, "logos")

    def test_garbage_key_returns_none(self):
        self.assertIsNone(keymint.validate("not_a_real_key"))

    def test_empty_key_returns_none(self):
        self.assertIsNone(keymint.validate(""))

    def test_wrong_prefix_returns_none(self):
        self.assertIsNone(keymint.validate("sk-fake1234"))

    def test_rotated_old_key_invalid(self):
        old = keymint.issue("rotation_test")
        new = keymint.issue("rotation_test")  # rotates
        self.assertIsNone(keymint.validate(old))
        self.assertEqual(keymint.validate(new), "rotation_test")


class TestRevoke(unittest.TestCase):
    def test_revoke_invalidates_key(self):
        key = keymint.issue("vixen")
        self.assertIsNotNone(keymint.validate(key))
        keymint.revoke("vixen")
        self.assertIsNone(keymint.validate(key))

    def test_revoke_unknown_bot_returns_false(self):
        self.assertFalse(keymint.revoke("ghost_bot_that_never_existed_xyz"))


class TestList(unittest.TestCase):
    def test_list_contains_issued_bot(self):
        keymint.issue("anvil")
        bots = keymint.list_bots()
        names = [b["bot"] for b in bots]
        self.assertIn("anvil", names)

    def test_revoked_bot_shown_as_inactive(self):
        keymint.issue("temp_bot")
        keymint.revoke("temp_bot")
        bots = {b["bot"]: b for b in keymint.list_bots()}
        self.assertFalse(bots["temp_bot"]["active"])


class TestGetKey(unittest.TestCase):
    def test_get_active_key(self):
        expected = keymint.issue("plutus")
        result = keymint.get_key("plutus")
        self.assertEqual(result, expected)

    def test_get_revoked_key_none(self):
        keymint.issue("shadow")
        keymint.revoke("shadow")
        self.assertIsNone(keymint.get_key("shadow"))


class TestFreedomOfMovement(unittest.TestCase):
    """All bots with valid keys are equal — no route restriction."""

    def test_fleet_all_valid(self):
        fleet = ["logos", "vixen", "anvil", "llamma", "plutus"]
        keys = {bot: keymint.issue(bot) for bot in fleet}
        for bot, key in keys.items():
            owner = keymint.validate(key)
            self.assertEqual(
                owner,
                bot,
                f"{bot} key failed validation",
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
