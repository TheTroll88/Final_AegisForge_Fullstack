const { expect }        = require("chai");
const { ethers }        = require("hardhat");
const { loadFixture }   = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("EchoBeacon", function () {
  async function deployFixture() {
    const [owner, other] = await ethers.getSigners();
    const EchoBeacon = await ethers.getContractFactory("EchoBeacon");
    const echo = await EchoBeacon.deploy("Hello, Aegis.");
    return { echo, owner, other };
  }

  describe("deployment", function () {
    it("stores the initial message", async function () {
      const { echo } = await loadFixture(deployFixture);
      expect(await echo.message()).to.equal("Hello, Aegis.");
    });
  });

  describe("updateMessage", function () {
    it("updates the stored message", async function () {
      const { echo } = await loadFixture(deployFixture);
      await echo.updateMessage("Signal acquired.");
      expect(await echo.message()).to.equal("Signal acquired.");
    });

    it("emits Echoed with old and new messages", async function () {
      const { echo } = await loadFixture(deployFixture);
      await expect(echo.updateMessage("Signal acquired."))
        .to.emit(echo, "Echoed")
        .withArgs("Hello, Aegis.", "Signal acquired.");
    });

    it("reverts on empty message", async function () {
      const { echo } = await loadFixture(deployFixture);
      await expect(echo.updateMessage("")).to.be.revertedWith("EchoBeacon: empty message");
    });

    it("allows any caller to update", async function () {
      const { echo, other } = await loadFixture(deployFixture);
      await echo.connect(other).updateMessage("External signal.");
      expect(await echo.message()).to.equal("External signal.");
    });
  });
});
