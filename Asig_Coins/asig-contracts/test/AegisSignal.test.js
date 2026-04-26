const { expect }        = require("chai");
const { ethers }        = require("hardhat");
const { loadFixture }   = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("AegisSignal (ASIG)", function () {
  // ─── Fixture ─────────────────────────────────────────────────────────────

  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const AegisSignal = await ethers.getContractFactory("AegisSignal");
    const token = await AegisSignal.deploy();
    return { token, owner, alice, bob };
  }

  // ─── Deployment ──────────────────────────────────────────────────────────

  describe("deployment", function () {
    it("sets the correct metadata", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("Aegis Signal");
      expect(await token.symbol()).to.equal("ASIG");
      expect(await token.decimals()).to.equal(18);
    });

    it("mints 1,000,000 ASIG to the deployer", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      const supply = ethers.parseUnits("1000000", 18);
      expect(await token.totalSupply()).to.equal(supply);
      expect(await token.balanceOf(owner.address)).to.equal(supply);
    });

    it("emits a Transfer event from address(0) on mint", async function () {
      const AegisSignal = await ethers.getContractFactory("AegisSignal");
      const [owner] = await ethers.getSigners();
      const supply  = ethers.parseUnits("1000000", 18);
      await expect(AegisSignal.deploy())
        .to.emit(await AegisSignal.deploy(), "Transfer")  // re-deploy for event capture
        .withArgs(ethers.ZeroAddress, owner.address, supply);
    });
  });

  // ─── transfer ────────────────────────────────────────────────────────────

  describe("transfer", function () {
    it("moves tokens from caller to recipient", async function () {
      const { token, owner, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("100", 18);
      await token.transfer(alice.address, amount);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("emits a Transfer event", async function () {
      const { token, owner, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("50", 18);
      await expect(token.transfer(alice.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, alice.address, amount);
    });

    it("reverts when balance is insufficient", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);
      await expect(
        token.connect(alice).transfer(bob.address, 1n)
      ).to.be.revertedWith("ASIG: insufficient balance");
    });
  });

  // ─── approve / transferFrom ───────────────────────────────────────────────

  describe("approve + transferFrom", function () {
    it("sets allowance and emits Approval", async function () {
      const { token, owner, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("200", 18);
      await expect(token.approve(alice.address, amount))
        .to.emit(token, "Approval")
        .withArgs(owner.address, alice.address, amount);
      expect(await token.allowance(owner.address, alice.address)).to.equal(amount);
    });

    it("transferFrom moves tokens and reduces allowance", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("150", 18);
      await token.approve(alice.address, amount);
      await token.connect(alice).transferFrom(owner.address, bob.address, amount);
      expect(await token.balanceOf(bob.address)).to.equal(amount);
      expect(await token.allowance(owner.address, alice.address)).to.equal(0n);
    });

    it("reverts transferFrom when allowance is exceeded", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);
      await token.approve(alice.address, ethers.parseUnits("10", 18));
      await expect(
        token.connect(alice).transferFrom(
          owner.address, bob.address, ethers.parseUnits("11", 18)
        )
      ).to.be.revertedWith("ASIG: allowance exceeded");
    });
  });
});
