const { expect }      = require("chai");
const { ethers }      = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Watcher", function () {
  async function deployFixture() {
    const [owner, newWatcher, stranger] = await ethers.getSigners();
    const Watcher = await ethers.getContractFactory("Watcher");
    const watcher = await Watcher.deploy();
    return { watcher, owner, newWatcher, stranger };
  }

  describe("deployment", function () {
    it("sets deployer as initial watcher", async function () {
      const { watcher, owner } = await loadFixture(deployFixture);
      expect(await watcher.watcher()).to.equal(owner.address);
    });

    it("deploys a MetaSignalRegistry at registry()", async function () {
      const { watcher } = await loadFixture(deployFixture);
      expect(await watcher.registry()).to.not.equal(ethers.ZeroAddress);
    });

    it("starts with zero observations", async function () {
      const { watcher } = await loadFixture(deployFixture);
      expect(await watcher.totalObservations()).to.equal(0n);
    });
  });

  describe("observe", function () {
    it("lets the watcher log an observation", async function () {
      const { watcher } = await loadFixture(deployFixture);
      await watcher.observe("system nominal");
      expect(await watcher.totalObservations()).to.equal(1n);
    });

    it("emits Observed event", async function () {
      const { watcher, owner } = await loadFixture(deployFixture);
      await expect(watcher.observe("heartbeat"))
        .to.emit(watcher, "Observed")
        .withArgs(owner.address, "heartbeat", 0n, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
    });

    it("reverts when called by non-watcher", async function () {
      const { watcher, stranger } = await loadFixture(deployFixture);
      await expect(watcher.connect(stranger).observe("intruder"))
        .to.be.revertedWithCustomError(watcher, "Unauthorized")
        .withArgs(stranger.address);
    });
  });

  describe("transferWatcher", function () {
    it("transfers the watcher role", async function () {
      const { watcher, newWatcher } = await loadFixture(deployFixture);
      await watcher.transferWatcher(newWatcher.address);
      expect(await watcher.watcher()).to.equal(newWatcher.address);
    });

    it("emits WatcherTransferred", async function () {
      const { watcher, owner, newWatcher } = await loadFixture(deployFixture);
      await expect(watcher.transferWatcher(newWatcher.address))
        .to.emit(watcher, "WatcherTransferred")
        .withArgs(owner.address, newWatcher.address);
    });

    it("reverts on zero address", async function () {
      const { watcher } = await loadFixture(deployFixture);
      await expect(watcher.transferWatcher(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(watcher, "ZeroAddress");
    });

    it("reverts when called by non-watcher", async function () {
      const { watcher, stranger, newWatcher } = await loadFixture(deployFixture);
      await expect(watcher.connect(stranger).transferWatcher(newWatcher.address))
        .to.be.revertedWithCustomError(watcher, "Unauthorized");
    });
  });
});
