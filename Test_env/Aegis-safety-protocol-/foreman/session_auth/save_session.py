"""
One-time manual login -> saves browser session to disk.
Subsequent runs reuse the saved session (no re-login needed).

Usage:
  python session_auth/save_session.py --site twitter
  python session_auth/save_session.py --site layer3
  python session_auth/save_session.py --site galxe
  python session_auth/save_session.py --site taskon
"""

import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

SITES = {
    "twitter": "https://x.com/home",
    "layer3": "https://app.layer3.xyz",
    "galxe": "https://app.galxe.com",
    "taskon": "https://taskon.xyz",
    "intract": "https://www.intract.io",
}

SESSION_DIR = Path(__file__).parent / "sessions"
SESSION_DIR.mkdir(parents=True, exist_ok=True)


def save_session(site: str):
    url = SITES.get(site)
    if not url:
        print(f"Unknown site '{site}'. Options: {list(SITES.keys())}")
        return

    session_file = SESSION_DIR / f"{site}.json"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=50)
        context = browser.new_context(storage_state=str(session_file) if session_file.exists() else None)
        page = context.new_page()
        page.goto(url, wait_until="networkidle")

        print("=" * 60)
        print(f"Browser opened at: {url}")
        print("Log in manually, then come back and press ENTER.")
        print("=" * 60)
        input("Press ENTER after login is complete... ")

        context.storage_state(path=str(session_file))
        print(f"Session saved: {session_file}")

        browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Save browser auth session for Foreman")
    parser.add_argument("--site", required=True, choices=list(SITES.keys()), help="Platform to authenticate")
    args = parser.parse_args()
    save_session(args.site)
