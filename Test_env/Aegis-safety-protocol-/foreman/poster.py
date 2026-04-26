"""
poster.py — Twitter/X posting for Foreman
Two modes:
  "api"        — uses Twitter API v2 (needs developer account + keys)
  "playwright" — uses saved browser session (needs one manual login)
"""

import json
import logging
import time
from pathlib import Path

logger = logging.getLogger("foreman.poster")


class TwitterPoster:
    def __init__(self, config: dict):
        self.config = config
        self.mode = config.get("twitter", {}).get("mode", "playwright")

    def post(self, text: str) -> dict:
        if len(text) > 280:
            logger.warning(f"Post truncated from {len(text)} to 280 chars")
            text = text[:277] + "..."

        logger.info(f"Posting ({self.mode}): {text[:80]}...")

        if self.mode == "api":
            return self._post_api(text)
        else:
            return self._post_playwright(text)

    def _post_api(self, text: str) -> dict:
        """Post via Twitter API v2."""
        try:
            import tweepy
            tw = self.config["twitter"]
            client = tweepy.Client(
                consumer_key=tw["api_key"],
                consumer_secret=tw["api_secret"],
                access_token=tw["access_token"],
                access_token_secret=tw["access_secret"],
                wait_on_rate_limit=True,
            )
            response = client.create_tweet(text=text)
            tweet_id = response.data["id"]
            logger.info(f"Posted tweet id={tweet_id}")
            return {"success": True, "id": tweet_id, "url": f"https://x.com/i/web/status/{tweet_id}"}
        except ImportError:
            logger.error("tweepy not installed. Run: pip install tweepy")
            return {"success": False, "error": "tweepy not installed"}
        except Exception as e:
            logger.error(f"Twitter API error: {e}")
            return {"success": False, "error": str(e)}

    def _post_playwright(self, text: str) -> dict:
        """Post via saved Playwright browser session."""
        session_file = Path(self.config["twitter"].get("session_file", ""))

        if not session_file.exists():
            logger.error(f"No Twitter session found at {session_file}")
            logger.info("Run: python ../session_auth/save_session.py --site twitter")
            return {"success": False, "error": "no session file"}

        try:
            from playwright.sync_api import sync_playwright

            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(storage_state=str(session_file))
                page = context.new_page()

                # Navigate to X compose
                page.goto("https://x.com/compose/tweet", wait_until="networkidle", timeout=30000)
                time.sleep(2)

                # Find the tweet text area
                editor = page.locator('[data-testid="tweetTextarea_0"]')
                editor.click()
                editor.fill(text)
                time.sleep(1)

                # Click Tweet button
                btn = page.locator('[data-testid="tweetButtonInline"]')
                btn.click()
                time.sleep(3)

                # Check success
                url = page.url
                logger.info(f"Post submitted. URL: {url}")

                # Save updated session
                context.storage_state(path=str(session_file))
                browser.close()

                return {"success": True, "url": url}

        except Exception as e:
            logger.error(f"Playwright posting error: {e}")
            return {"success": False, "error": str(e)}
