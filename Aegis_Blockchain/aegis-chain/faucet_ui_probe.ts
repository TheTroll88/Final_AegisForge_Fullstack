// faucet_ui_probe.ts — check what QuickNode & Alchemy faucets actually require
import { chromium } from 'playwright-core';

const TARGET = '7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY';
const SS = 'C:\\Users\\natha';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  for (const { name, url } of [
    { name: 'quicknode', url: 'https://faucet.quicknode.com/solana/devnet' },
    { name: 'alchemy', url: 'https://www.alchemy.com/faucets/solana-devnet' },
    { name: 'chainlist', url: 'https://faucets.chain.link/#solana-devnet' },
    { name: 'triangle', url: 'https://faucet.triangleplatform.com/solana/devnet' },
  ]) {
    console.log(`\n--- ${name.toUpperCase()} ---`);
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.screenshot({ path: `${SS}\\faucet_${name}.png` });

      // Gather all visible text + button states
      const text = await page.evaluate(() => document.body.innerText);
      const buttons = await page.$$eval('button', bs => bs.map(b => ({
        text: b.textContent?.trim().replace(/\s+/g, ' ').substring(0, 50),
        disabled: b.disabled,
      })));
      const inputs = await page.$$eval('input', ins => ins.map(i => ({
        type: i.type, placeholder: i.placeholder, name: i.name,
      })));

      console.log('Inputs:', JSON.stringify(inputs, null, 2));
      console.log('Buttons:', JSON.stringify(buttons, null, 2));
      // Look for auth requirements
      const authTerms = ['github', 'twitter', 'google', 'discord', 'sign in', 'connect', 'captcha'];
      for (const term of authTerms) {
        if (text.toLowerCase().includes(term)) {
          console.log(`  AUTH REQUIRED: ${term}`);
        }
      }
    } catch (e) {
      console.log(`  Error: ${(e as Error).message.split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\nScreenshots saved to C:\\Users\\natha');
}

main().catch(console.error);
