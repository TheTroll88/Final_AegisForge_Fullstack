/**
 * fund_wallets.ts — Use Playwright to claim devnet SOL for all 3 hackathon wallets
 */

import { chromium } from "playwright-core";

const WALLETS = [
  "2suPrTtXuJJZ13XwvSmCFFXmLN5okREfJis6LhXv8xAn", // admin
  "49HuVnEuP6Gihgs2EnHvTMCzgjFFnHCMaZkEuWKfkz25", // manager
  "DFrWvyLDUrfneHd3AfVQJ2HXivxyHBBWNhLuve3BB5jA",  // user
];

async function main() {
  console.log("Launching browser to claim devnet SOL...");
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36" });

  for (const wallet of WALLETS) {
    const page = await ctx.newPage();
    console.log(`\nFunding: ${wallet.slice(0, 12)}...`);

    try {
      await page.goto("https://faucet.solana.com/", { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);

      // Fill in the wallet address
      const input = page.locator("input").first();
      await input.fill(wallet);
      await page.waitForTimeout(1000);

      // Select devnet from the network dropdown
      const selects = page.locator("select");
      const count = await selects.count();
      if (count > 0) {
        // Try to select devnet by value or index
        try {
          await selects.first().selectOption({ value: "devnet" });
        } catch {
          try { await selects.first().selectOption({ index: 1 }); } catch {}
        }
        await page.waitForTimeout(500);
      }

      // Click the Confirm Airdrop button
      const btn = page.locator("button").filter({ hasText: /airdrop|confirm|request|send/i }).first();
      await btn.click();
      await page.waitForTimeout(3000);

      // Check result
      const bodyText = await page.textContent("body");
      if (bodyText?.match(/success|0.5 sol|1 sol|signature/i)) {
        console.log(`  ✓ SUCCESS for ${wallet.slice(0, 12)}...`);
      } else if (bodyText?.match(/rate limit|too many|error/i)) {
        console.log(`  ✗ Rate limited`);
      } else {
        console.log(`  ? Unknown result — check browser window`);
      }

      await page.screenshot({ path: `faucet_${wallet.slice(0, 8)}.png` });
    } catch (e: any) {
      console.log(`  Error: ${e.message}`);
    }

    await page.close();
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log("\nDone. Closing browser in 10s...");
  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
}

main().catch(console.error);
