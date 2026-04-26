const { expect }        = require("chai");
const { ethers }        = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MetaSignalRegistry", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const MetaSignalRegistry = await ethers.getContractFactory("MetaSignalRegistry");
    const registry = await MetaSignalRegistry.deploy();
    return { registry, owner, user1, user2 };
  }

  describe("deployment", function () {
    it("starts with zero signals", async function () {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.totalSignals()).to.equal(0n);
    });
  });

  describe("logSignal", function () {
    it("stores a signal and increments totalSignals", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);
      await registry.connect(user1).logSignal("ping");
      expect(await registry.totalSignals()).to.equal(1n);
    });

    it("stores the correct sender and message", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);
      await registry.connect(user1).logSignal("hello world");
      const signal = await registry.getSignal(0);
      expect(signal.sender).to.equal(user1.address);
      expect(signal.message).to.equal("hello world");
    });

    it("stores a block timestamp within expected range", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);
      const before = BigInt(await time.latest());
      await registry.connect(user1).logSignal("time-check");
      const after  = BigInt(await time.latest());
      const signal = await registry.getSignal(0);
      expect(signal.timestamp).to.be.gte(before);
      expect(signal.timestamp).to.be.lte(after);
    });

    it("emits SignalLogged with correct parameters", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);
      await expect(registry.connect(user1).logSignal("event-test"))
        .to.emit(registry, "SignalLogged")
        .withArgs(0n, user1.address, "event-test", await time.latest() + 1);
    });

    it("reverts on empty message", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);
      await expect(registry.connect(user1).logSignal(""))
        .to.be.revertedWith("MetaSignalRegistry: empty message");
    });

    it("allows multiple senders and preserves order", async function () {
      const { registry, user1, user2 } = await loadFixture(deployFixture);
      await registry.connect(user1).logSignal("first");
      await registry.connect(user2).logSignal("second");
      expect(await registry.totalSignals()).to.equal(2n);
      expect((await registry.getSignal(0)).sender).to.equal(user1.address);
      expect((await registry.getSignal(1)).sender).to.equal(user2.address);
    });
  });

  describe("getSignal", function () {
    it("reverts on out-of-bounds index", async function () {
      const { registry } = await loadFixture(deployFixture);
      await expect(registry.getSignal(0))
        .to.be.revertedWith("MetaSignalRegistry: index out of bounds");
    });
  });
});
