/**
 * faucet_browser2.ts — targeted faucet.solana.com automation
 * Takes a screenshot, inspects the page, fills fields properly
 */
import { chromium } from "playwright-core";

const ADDR = "7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY";
const UA   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36";
const SS   = "C:\\Users\\natha\\faucet_ss";

async function shoot(page: any, name: string) {
  await page.screenshot({ path: `${SS}_${name}.png`, fullPage: true });
  console.log(`  📸 screenshot: ${SS}_${name}.png`);
}

async function tryFaucetSolana() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const ctx  = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  console.log("→ Loading faucet.solana.com...");
  await page.goto("https://faucet.solana.com", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  await shoot(page, "01_loaded");

  // Log all inputs visible on page
  const inputs = await page.locator("input").all();
  console.log(`Found ${inputs.length} input(s):`);
  for (const inp of inputs) {
    const ph   = await inp.getAttribute("placeholder").catch(() => "");
    const type = await inp.getAttribute("type").catch(() => "");
    const name = await inp.getAttribute("name").catch(() => "");
    const id   = await inp.getAttribute("id").catch(() => "");
    console.log(`  input: type=${type} name=${name} id=${id} placeholder=${ph}`);
  }

  // Log all buttons
  const btns = await page.locator("button").all();
  console.log(`Found ${btns.length} button(s):`);
  for (const btn of btns) {
    const txt      = (await btn.textContent().catch(() => "")).trim().slice(0, 60);
    const disabled = await btn.isDisabled().catch(() => false);
    console.log(`  btn: "${txt}" disabled=${disabled}`);
  }

  // Try to fill any text input with the address
  let filled = false;
  for (const inp of inputs) {
    const type = await inp.getAttribute("type").catch(() => "");
    if (type === "text" || type === null || type === "") {
      try {
        await inp.fill(ADDR);
        console.log("✅ Filled address into input");
        filled = true;
        break;
      } catch {}
    }
  }
  await page.waitForTimeout(1500);
  await shoot(page, "02_filled");

  // After filling, check if any button became enabled
  const btns2 = await page.locator("button").all();
  for (const btn of btns2) {
    const txt  = (await btn.textContent().catch(() => "")).trim();
    const dis  = await btn.isDisabled().catch(() => true);
    if (!dis && txt && txt.length > 1) {
      console.log(`  Enabled button: "${txt}"`);
      await btn.click().catch(e => console.log("  click err:", e.message));
      await page.waitForTimeout(3000);
      break;
    }
  }
  await shoot(page, "03_after_click");

  const content = await page.content();
  const success = content.toLowerCase().includes("success") ||
                  content.includes("Transaction") ||
                  content.toLowerCase().includes("confirmed");
  console.log(success ? "✅ SUCCESS signal on page" : "❌ No success signal");

  await browser.close();
  return success;
}

async function tryAlternativeFaucets() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx  = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });

  // solfaucet.togatech.org
  {
    console.log("\n→ Trying solfaucet.togatech.org...");
    const page = await ctx.newPage();
    try {
      await page.goto("https://solfaucet.togatech.org", { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(1500);
      await shoot(page, "togatech_01");

      const inp = page.locator('input[type="text"], input[placeholder*="ddress"], input[id*="wallet"]').first();
      await inp.fill(ADDR);
      await page.waitForTimeout(500);

      const btn = page.locator('button:not([disabled])').first();
      await btn.click();
      await page.waitForTimeout(5000);
      await shoot(page, "togatech_02");

      const txt = await page.textContent("body").catch(() => "");
      if (txt?.includes("Success") || txt?.includes("signature") || txt?.includes("sent")) {
        console.log("✅ togatech: SUCCESS");
      } else {
        console.log("❌ togatech: no success. body snippet:", txt?.slice(0,200));
      }
    } catch (e: any) { console.log("❌ togatech:", e.message); }
    await page.close();
  }

  // solana-devnet faucet at web3auth
  {
    console.log("\n→ Trying web3auth endpoints...");
    try {
      const resp = await fetch("https://faucet.web3auth.io/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": UA },
        body: JSON.stringify({ network: "solana-devnet", chainId: "0x67", address: ADDR }),
        signal: AbortSignal.timeout(10000),
      });
      const txt = await resp.text();
      console.log(`web3auth: ${resp.status}`, txt.slice(0, 200));
    } catch (e: any) { console.log("web3auth:", e.message); }
  }

  await browser.close();
}

async function main() {
  console.log(`Target: ${ADDR}\n`);
  await tryFaucetSolana();
  await tryAlternativeFaucets();

  // Final balance
  const r = await fetch("https://api.devnet.solana.com", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [ADDR] }),
    signal: AbortSignal.timeout(8000),
  });
  const d = await r.json() as any;
  console.log(`\nFinal balance: ${(d?.result?.value ?? 0) / 1e9} SOL`);
}

main().catch(console.error);
