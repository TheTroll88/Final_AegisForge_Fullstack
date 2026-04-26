// Quick price check on the interesting Base tokens + Superteam format fix

async function main() {
  // Coingecko price check for tokens Nathan holds
  const ids = "wormhole,aerodrome-finance,virtual-protocol,degen-base,farverse";
  let prices: Record<string, { usd: number }> = {};

  try {
    const cg = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    prices = (await cg.json()) as any;
    console.log("CoinGecko:", JSON.stringify(prices, null, 2));
  } catch (e: any) {
    console.log("CoinGecko failed:", e.message);

    // Fallback: try DexScreener for W on Base
    try {
      const ds = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/0xB0fFa8000886e57F86dd5264b9582b2Ad87b2b91",
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const data = (await ds.json()) as any;
      const pair = data?.pairs?.[0];
      if (pair) {
        console.log(`W on Base via DexScreener: $${pair.priceUsd}`);
        const wVal = 26383.078 * parseFloat(pair.priceUsd ?? "0");
        console.log(`26,383 W = $${wVal.toFixed(2)}`);
      }
    } catch (e2: any) {
      console.log("DexScreener also failed:", e2.message);
    }
  }

  // Holdings on Base wallet
  const holdings: Record<string, { amount: number; symbol: string }> = {
    wormhole:           { amount: 26383.078, symbol: "W" },
    "aerodrome-finance": { amount: 0.017,    symbol: "AERO" },
    "virtual-protocol": { amount: 0.004,     symbol: "VIRTUAL" },
    "degen-base":        { amount: 1.216,    symbol: "DEGEN" },
  };

  let total = 0;
  console.log("\n=== Base Wallet Estimated Values ===");
  for (const [id, h] of Object.entries(holdings)) {
    const price = prices[id]?.usd ?? 0;
    const val = h.amount * price;
    total += val;
    if (price > 0) {
      console.log(`${h.symbol}: ${h.amount} × $${price} = $${val.toFixed(2)}`);
    }
  }
  console.log(`ESTIMATED TOTAL (priced tokens): $${total.toFixed(2)}`);

  // Also try to get W token address on Base from coingecko platforms
  try {
    const wDetail = await fetch(
      "https://api.coingecko.com/api/v3/coins/wormhole?localization=false&tickers=false&community_data=false&developer_data=false",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const wData = (await wDetail.json()) as any;
    const baseAddr = wData?.platforms?.base;
    const curPrice = wData?.market_data?.current_price?.usd ?? 0;
    const wHolding = 26383.078;
    const wValue = wHolding * curPrice;
    console.log(`\nW (Wormhole) contract on Base: ${baseAddr ?? "unknown"}`);
    console.log(`Current W price: $${curPrice}`);
    console.log(`26,383.078 W = $${wValue.toFixed(2)} ← ← ← !!!`);
  } catch {}

  // Fix Superteam parser
  console.log("\n=== Superteam API (raw) ===");
  try {
    const st = await fetch(
      "https://earn.superteam.fun/api/listings/?open=true&take=10",
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
    );
    const stData = (await st.json()) as any;
    const arr = Array.isArray(stData) ? stData : stData?.bounties ?? stData?.data ?? [];
    console.log(`Type: ${Array.isArray(stData) ? "Array" : "Object"}, length: ${arr.length}`);
    if (arr.length > 0) {
      console.log("Keys:", Object.keys(arr[0]).join(", "));
      for (const item of arr.slice(0, 8)) {
        const reward = item.rewardAmount ?? item.usdValue ?? item.totalRewardAmount ?? item.reward ?? "?";
        const title  = (item.title ?? item.name ?? "?").slice(0, 60);
        const slug   = item.slug ?? item.id ?? "";
        const type   = item.type ?? item.listingType ?? "";
        console.log(`  [${type}] $${reward} — ${title}`);
        if (slug) console.log(`         https://earn.superteam.fun/listings/${slug}`);
      }
    }
  } catch (e: any) {
    console.log("Superteam:", e.message);
  }
}

main().catch(console.error);
