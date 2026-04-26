# Solana Wallet Generator

This is a **client-side Solana wallet generator** built using HTML, CSS, and JavaScript. It uses the `@solana/web3.js` library to generate Solana wallet keypairs directly in the browser. This app is fully open source and works entirely offline after loading.

## Features

- Generate Solana wallets instantly
- View and copy public and private keys
- Display wallet QR code for easy sharing
- Live Solana market data (price, volume, etc.)
- Print or save your wallet details securely

## 📦 Tech Stack

- HTML, CSS, JavaScript
- `@solana/web3.js` library
- `QRCode.js` for QR code generation
- Hosted Python server for fetching live market data

## 🔧 How it works

1. User clicks "Generate Wallet".
2. A new keypair is generated using the Solana JavaScript SDK.
3. The public key is displayed and shown as a QR code.
4. The private key is hidden but can be revealed and copied.
5. Live Solana data is fetched and displayed in a scrolling ticker.

## ⚙️ Python Backend Server

The **live Solana market data** is fetched through a simple **Python server**.

- This server pulls Solana data and makes it available to the frontend.
- The Python server is **hosted on Render**.
- The server code is available on **GitHub** for anyone who wants to self-host or inspect it.

## 🖥️ Desktop View

- This site is optimized for desktop screens.
- On mobile, a friendly notice informs the user that it's best viewed on a larger screen.

## 🛑 Important Notes

- The wallet is generated in your browser. No data is sent to any server.
- Always **save or print** your generated keys. Once you refresh the page, they are lost forever.
- Do **NOT share** your private key with anyone.

## 🔐 Security Reminder

- Only use this tool in a secure, offline environment for maximum safety.
- Do not store private keys on shared or public devices.

## 📄 License

This project is open-source and available under the MIT License.

---

Created by [Daniel Samuel Emeka](https://github.com/mindfullMellow)
