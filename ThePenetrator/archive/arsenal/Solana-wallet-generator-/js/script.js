"use strict";

function generateWallet() {
  try {
    const keypair = solanaWeb3.Keypair.generate(); // Generate Keypair

    const publicKey = keypair.publicKey.toBase58(); // Public Key in Base58
    const privateKey = Array.from(keypair.secretKey).join(", "); // Add space after commas

    document.getElementById("publicKey").innerText = publicKey;
    document.getElementById("privateKey").innerText = privateKey;

    // Generate QR codes for public and private keys
    QRCode.toCanvas(
      document.getElementById("publicKeyQR"),
      publicKey,
      {
        width: 150,
        height: 150,
      },
      function (error) {
        if (error) console.error(error);
        console.log("Public key QR code generated!");
      }
    );
  } catch (error) {
    console.error("Error generating wallet:", error);
    alert("Failed to generate wallet. Check the console for errors.");
  }
  ////////////////////////////////////////////////////////////////////
  // code to display wallet--details after genrate wallet has been clicked

  // Always show the wallet details after generation
  const walletDetails = document.getElementById("walletDetails");
  walletDetails.style.display = "block";
  //

  // Force reflow to reset animation
  void walletDetails.offsetWidth;

  // Add visible class with animation
  walletDetails.classList.add("visible");

  //code to hide the wallet instruction container when wallet details is displayed

  const containerB = document.querySelector(".instruct");
  containerB.style.display = "none";
}

////////////////////////////////////////////////////////////////////
// javascript code to get current year
const yearEl = document.querySelector(".year");
const currentYear = new Date().getFullYear();
console.log(currentYear);
yearEl.textContent = currentYear;

////////////////////////////////////////////////////////////////////
// javascript code to copy to clipbaord
function copyAddress() {
  const addressEl = document.querySelector(".publicaddress");
  const addressText = addressEl.innerText;

  navigator.clipboard
    .writeText(addressText)
    .then(() => {
      showToast("Copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy address: ", err);
      showToast("Failed to copy 😢");
    });
}
function copyPrivate() {
  const privateEl = document.querySelector(".private--key");
  const privateText = privateEl.innerText;

  navigator.clipboard
    .writeText(privateText)
    .then(() => {
      showToast("Copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy address: ", err);
      showToast("Failed to copy 😢");
    });
}

////////////////////////////////////////////////////////////////////
// javascript code to show toast message when the copy btn is clicked

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show";

  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

////////////////////////////////////////////////////////////////////
// print wallet

function printWallet() {
  // Check if wallet exists
  const publicKey = document.getElementById("publicKey").textContent.trim();

  if (!publicKey) {
    showToast("Please generate a wallet before printing", true);
    return; // Stop execution here
  }

  // Original print logic (unchanged)
  const printContents = document.querySelector(".walletContainer").innerHTML;
  const win = window.open("", "", "width=800,height=600");

  win.document.write(`
    <html>
      <head>
        <title>Print Wallet</title>
        <style>
          body { font-family: "inter", sans-serif; padding: 20px; }
          .no-print { display: none !important; }
          .pub-note{color:   color: #14F195;}
          .p-note{color:   color: #ff4d4d;}
        </style>
      </head>
      <body>
        ${printContents}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          }
        <\/script>
      </body>
    </html>
  `);
  win.document.close();
}

// Updated showToast() function
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast no-print"; // Reset classes

  if (isError) {
    toast.classList.add("error");
  }

  // Force reflow for animation
  void toast.offsetWidth;

  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
////////////////////////////////////////////////////////////////////
//private jkey hidden
// In generateWallet() function:
const privateKeyElement = document.getElementById("privateKey");
privateKeyElement.textContent = privateKey;
privateKeyElement.classList.remove("revealed"); // Start blurred

// Updated toggle function:
function togglePrivateKey() {
  const keyElement = document.getElementById("privateKey");
  const btn = document.querySelector(".btn--view");

  keyElement.classList.toggle("revealed");

  // Update button text based on revealed state
  if (keyElement.classList.contains("revealed")) {
    btn.textContent = "Hide Private Key";
    btn.classList.add("warning");
  } else {
    btn.textContent = "View Private Key";
    btn.classList.remove("warning");
  }
}
////////////////////////////////////////////////////////////////////
//dynamically contrilling the sections
document.addEventListener("DOMContentLoaded", function () {
  const windowEl = document.querySelector(".windows-content");
  const mobileEl = document.querySelector(".mobile-view");

  function updateLayout() {
    if (window.innerWidth > 700) {
      windowEl.style.display = "block";
      mobileEl.style.display = "none";
    } else {
      windowEl.style.display = "none";
      mobileEl.style.display = "block";
    }
  }

  // Initial layout setup
  updateLayout();

  // Update layout when the window is resized
  window.addEventListener("resize", updateLayout);
});

console.log(window.innerWidth);
console.log(windowEl, mobileEl);
