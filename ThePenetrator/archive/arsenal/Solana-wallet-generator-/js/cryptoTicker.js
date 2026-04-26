"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// js code to fecth crypto data
fetch("https://solana-wallet-generator-backend-folder.onrender.com/crypto-data")
  .then((res) => res.json())
  .then((data) => {
    // Loop through each coin's data
    Object.keys(data).forEach((crypto) => {
      const priceData = data[crypto];

      // Helper function to format large numbers
      const formatLargeNumber = (num) => {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + " billion";
        if (num >= 1e6) return (num / 1e6).toFixed(2) + " million";
        return num.toLocaleString(); // Simple formatting for smaller numbers
      };

      // Update Price
      document
        .querySelectorAll(`[class~="${crypto}-price"]`)
        .forEach((priceElement) => {
          if (priceData["price"] !== undefined) {
            priceElement.innerText = `$${priceData["price"].toLocaleString()}`;
          }
        });

      // Update 24h Change (for percentage)
      document
        .querySelectorAll(`[class~="${crypto}-change"]`)
        .forEach((changeElement) => {
          const change = parseFloat(priceData["24h_change"]).toFixed(2); // Change this line
          changeElement.innerText = `(${change}%)`;
          changeElement.classList.remove("cc-red", "cc-green");
          changeElement.classList.add(
            parseFloat(change) < 0 ? "cc-red" : "cc-green"
          );
        });

      // Update 24h Volume
      document
        .querySelectorAll(`[class~="${crypto}-volume"]`)
        .forEach((volumeElement) => {
          if (priceData["24h_volume"] !== undefined) {
            volumeElement.innerText = `$${priceData[
              "24h_volume"
            ].toLocaleString()}`;
          }
        });

      // Update Market Cap (formatted as billions or millions)
      document
        .querySelectorAll(`[class~="${crypto}-marketcap"]`)
        .forEach((marketCapElement) => {
          if (priceData["market_cap"] !== undefined) {
            marketCapElement.innerText = `$${formatLargeNumber(
              priceData["market_cap"]
            )}`;
          }
        });

      // Update Fully Diluted Market Cap (formatted as billions or millions)
      document
        .querySelectorAll(`[class~="${crypto}-fd-marketcap"]`)
        .forEach((fdMarketCapElement) => {
          if (priceData["usd_fully_diluted_market_cap"] !== undefined) {
            fdMarketCapElement.innerText = `Fully Diluted Market Cap: $${formatLargeNumber(
              priceData["usd_fully_diluted_market_cap"]
            )}`;
          }
        });

      // Update Circulating Supply (formatted as millions or billions)
      document
        .querySelectorAll(`[class~="${crypto}-circulating"]`)
        .forEach((circulatingElement) => {
          if (priceData["circulating_supply"] !== undefined) {
            circulatingElement.innerText = ` ${formatLargeNumber(
              priceData["circulating_supply"]
            )}`;
          }
        });

      // Update Total Supply (formatted as millions or billions)
      document
        .querySelectorAll(`[class~="${crypto}-supply"]`)
        .forEach((supplyElement) => {
          if (priceData["total_supply"] !== undefined) {
            supplyElement.innerText = ` ${formatLargeNumber(
              priceData["total_supply"]
            )}`;
          }
        });

      // Update All Time High (ATH)
      document
        .querySelectorAll(`[class~="${crypto}-ath"]`)
        .forEach((athElement) => {
          if (priceData["ath"] !== undefined) {
            athElement.innerText = ` $${priceData["ath"].toLocaleString()}`;
          }
        });

      // Update All Time Low (ATL)
      document
        .querySelectorAll(`[class~="${crypto}-atl"]`)
        .forEach((atlElement) => {
          if (priceData["atl"] !== undefined) {
            atlElement.innerText = `$${priceData["atl"].toLocaleString()}`;
          }
        });

      // Update Market Dominance with % symbol
      document
        .querySelectorAll(`[class~="${crypto}-dominance"]`)
        .forEach((dominanceElement) => {
          if (priceData["market_dominance"] !== undefined) {
            dominanceElement.innerText = `${priceData["market_dominance"]}%`;
          }
        });

      // Update Market Rank
      document
        .querySelectorAll(`[class~="${crypto}-rank"]`)
        .forEach((rankElement) => {
          if (priceData["market_rank"] !== undefined) {
            rankElement.innerText = `#${priceData["market_rank"]}`;
          }
        });
    });
  })
  .catch((err) => console.error(err));
