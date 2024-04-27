import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'
import { expect } from 'chai'

describe('WNGN', function () {
  async function deployWngnFixture() {
    const [owner, otherAccount] = await ethers.getSigners()

    const Wngn = await ethers.getContractFactory('Wngn')
    const wngn = await Wngn.deploy()
    const wngnAddress = await wngn.getAddress()
    return { wngnAddress, otherAccount, wngn, owner }
  }

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { wngn, owner } = await loadFixture(deployWngnFixture)
      expect(await wngn.owner()).to.equal(owner.address)
    })

    it('Should have a name, symbol and decimals', async function () {
      const { wngn, owner } = await loadFixture(deployWngnFixture)

      expect(await wngn.name()).to.equal('Wrapped Naira')
      expect(await wngn.symbol()).to.equal('WNGN')
      expect(await wngn.decimals()).to.equal(6)
    })
  })

  describe('Minting', function () {
    it('Should mint tokens', async function () {
      const { wngn, otherAccount } = await loadFixture(deployWngnFixture)

      await wngn.mint(otherAccount.address, 1000)
      expect(await wngn.balanceOf(otherAccount.address)).to.equal(1000)
    })

    it('Should revert if non-owner tries to mint', async function () {
      const { wngn, owner, otherAccount } = await loadFixture(deployWngnFixture)

      await expect(wngn.connect(otherAccount).mint(owner.address, 1000)).to.be.revertedWithCustomError(
        wngn,
        'OwnableUnauthorizedAccount'
      )
    })
  })

  describe('Burning', function () {
    it('Should burn tokens', async function () {
      const { wngn, owner } = await loadFixture(deployWngnFixture)

      await wngn.mint(owner.address, 1000)
      await wngn.burn(500)
      expect(await wngn.balanceOf(owner.address)).to.equal(500)
    })

    it('Should revert if insufficient balance', async function () {
      const { wngn, otherAccount } = await loadFixture(deployWngnFixture)
      await expect(wngn.connect(otherAccount).burn(1500)).to.be.reverted
    })
  })

  describe('Pausable', function () {
    it('Should pause transfers', async function () {
      const { wngn, owner, otherAccount } = await loadFixture(deployWngnFixture)

      await wngn.mint(owner.address, 1000)
      await wngn.pause()
      await expect(wngn.transfer(otherAccount.address, 100)).to.be.reverted
    })

    it('Should unpause transfers', async function () {
      const { wngn, owner, otherAccount } = await loadFixture(deployWngnFixture)

      await wngn.mint(owner.address, 1000)
      await wngn.pause()
      await wngn.unpause()
      await wngn.transfer(otherAccount.address, 100)
      expect(await wngn.balanceOf(otherAccount.address)).to.equal(100)
    })

    it('Should revert if non-owner tries to pause/unpause', async function () {
      const { wngn, otherAccount } = await loadFixture(deployWngnFixture)

      await expect(wngn.connect(otherAccount).pause()).to.be.reverted
      await expect(wngn.connect(otherAccount).unpause()).to.be.reverted
    })
  })
})
