import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers'
import { getAddress, parseGwei } from 'viem'
import { viem } from 'hardhat'
import { expect } from 'chai'

describe('WNGN', function () {
  async function deployWngnFixture() {
    const [owner, otherAccount] = await viem.getWalletClients()
    const wngn = await viem.deployContract('Wngn')
    const wngnAddress = wngn.address
    return { wngnAddress, otherAccount, wngn, owner }
  }

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { wngn, owner } = await loadFixture(deployWngnFixture)
      expect(await wngn.read.owner()).to.equal(getAddress(owner.account.address))
    })

    it('Should have a name, symbol and decimals', async function () {
      const { wngn, owner } = await loadFixture(deployWngnFixture)

      expect(await wngn.read.name()).to.equal('Wrapped Naira')
      expect(await wngn.read.symbol()).to.equal('WNGN')
      expect(await wngn.read.decimals()).to.equal(6)
    })
  })

  describe('Minting', function () {
    it('Should mint tokens', async function () {
      const { wngn, otherAccount } = await loadFixture(deployWngnFixture)
      await wngn.write.mint([otherAccount.account.address, 1000n])
      expect(await wngn.read.balanceOf([otherAccount.account.address])).to.equal(1000n)
    })

    it('Should revert if non-owner tries to mint', async function () {
      const { wngn, owner, otherAccount } = await loadFixture(deployWngnFixture)

      const wngnAsOtherAccount = await viem.getContractAt('Wngn', wngn.address, { client: { wallet: otherAccount } })
      await expect(wngnAsOtherAccount.write.mint([owner.account.address, 1000n])).to.be.rejectedWith(
        'OwnableUnauthorizedAccount'
      )
    })
  })

  describe('Burning', function () {
    it('Should burn tokens', async function () {
      const { wngn, owner } = await loadFixture(deployWngnFixture)

      await wngn.write.mint([owner.account.address, 1000n])
      await wngn.write.burn([500n])
      expect(await wngn.read.balanceOf([owner.account.address])).to.equal(500n)
    })

    it('Should revert if insufficient balance', async function () {
      const { wngn, otherAccount } = await loadFixture(deployWngnFixture)
      const wngnAsOtherAccount = await viem.getContractAt('Wngn', wngn.address, { client: { wallet: otherAccount } })

      await expect(wngnAsOtherAccount.write.burn([1500n])).to.be.rejectedWith('ERC20InsufficientBalance')
    })
  })

  describe('Pausable', function () {
    it('Should pause transfers', async function () {
      const { wngn, owner, otherAccount } = await loadFixture(deployWngnFixture)

      await wngn.write.mint([owner.account.address, 1000n])
      await wngn.write.pause()
      await expect(wngn.write.transfer([otherAccount.account.address, 100n])).to.be.rejectedWith('EnforcedPause')
    })

    it('Should unpause transfers', async function () {
      const { wngn, owner, otherAccount } = await loadFixture(deployWngnFixture)

      await wngn.write.mint([owner.account.address, 1000n])
      await wngn.write.pause()
      await wngn.write.unpause()
      await wngn.write.transfer([otherAccount.account.address, 100n])
      expect(await wngn.read.balanceOf([otherAccount.account.address])).to.equal(100n)
    })

    it('Should revert if non-owner tries to pause/unpause', async function () {
      const { wngn, otherAccount } = await loadFixture(deployWngnFixture)
      const wngnAsOtherAccount = await viem.getContractAt('Wngn', wngn.address, { client: { wallet: otherAccount } })

      await expect(wngnAsOtherAccount.write.pause()).to.be.rejectedWith('OwnableUnauthorizedAccount')
      await expect(wngnAsOtherAccount.write.unpause()).to.be.rejectedWith('OwnableUnauthorizedAccount')
    })
  })
})
