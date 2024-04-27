import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'
import { expect } from 'chai'
import ERC20 from '../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'

const USDC_PRICE = BigInt('123') * BigInt(10 ** 2)
const USDC_ADDRESS = '0x6E4A1BcBd3C3038e6957207cadC1A17092DC7ba3'
const WEALTHY_USDC_ADDRESS = '0x8396f0F8B815be9079191c814a3E91350eBa9B3C'

describe('P2PExchange', function () {
  async function deployP2PExchangeFixture() {
    const [owner, otherAccount] = await ethers.getSigners()
    const richUsdcAccount = await ethers.getImpersonatedSigner(WEALTHY_USDC_ADDRESS)

    // send ether to the usdc account
    await owner.sendTransaction({ to: richUsdcAccount.address, value: ethers.parseEther('10') })

    // deploy usdc contract
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20.abi, owner)

    // deploy the wngn contract
    const Wngn = await ethers.getContractFactory('Wngn')
    const wngn = await Wngn.deploy()
    const wngnAddress = await wngn.getAddress()

    wngn.mint(owner, ethers.parseUnits('2000000', 6))
    wngn.mint(otherAccount, ethers.parseUnits('1000000', 6))
    wngn.mint(richUsdcAccount, ethers.parseUnits('2000000', 6))

    // deploy p2p exchange contract
    const P2PExchange = await ethers.getContractFactory('P2PExchange')
    const p2pExchange = await P2PExchange.deploy(wngnAddress)
    const p2pExchangeAddress = await p2pExchange.getAddress()
    return { wngnAddress, usdcContract, otherAccount, wngn, owner, p2pExchangeAddress, richUsdcAccount, p2pExchange }
  }

  describe('createAd', function () {
    it('should revert if price is zero', async function () {
      const { p2pExchange } = await loadFixture(deployP2PExchangeFixture)
      await expect(
        p2pExchange.createAd(0, 0, USDC_ADDRESS, 100, Math.floor(Date.now() / 1000) + 3600)
      ).to.be.revertedWith('price must be set to a value greater than zero')
    })

    it('should revert if validity period is too short', async function () {
      const { p2pExchange } = await loadFixture(deployP2PExchangeFixture)

      const block = await ethers.provider.getBlock('latest')
      await expect(p2pExchange.createAd(USDC_PRICE, 0, USDC_ADDRESS, 100, block?.timestamp + 100)).to.be.revertedWith(
        'ads must be valid for at least 15 minutes'
      )
    })

    it('should revert if allowance is insufficient', async function () {
      const { p2pExchange } = await loadFixture(deployP2PExchangeFixture)

      const block = await ethers.provider.getBlock('latest')
      await expect(p2pExchange.createAd(USDC_PRICE, 0, USDC_ADDRESS, 100, block?.timestamp + 3600)).to.be.revertedWith(
        'insufficient allowance provided'
      )
    })

    it('should create a buy ad and transfer tokens to the contract', async function () {
      const { p2pExchange, wngn, p2pExchangeAddress } = await loadFixture(deployP2PExchangeFixture)
      const block = await ethers.provider.getBlock('latest')

      await wngn.approve(p2pExchangeAddress, ethers.parseUnits('50000', 6))
      await p2pExchange.createAd(USDC_PRICE, 0, USDC_ADDRESS, ethers.parseUnits('50000', 6), block?.timestamp + 3600)
      expect(await wngn.balanceOf(p2pExchangeAddress)).to.equal(ethers.parseUnits('50000', 6))
    })

    it('should create a sell ad and transfer tokens to the contract', async function () {
      const { p2pExchange, usdcContract, richUsdcAccount, p2pExchangeAddress } =
        await loadFixture(deployP2PExchangeFixture)
      const block = await ethers.provider.getBlock('latest')

      await usdcContract.connect(richUsdcAccount).approve(p2pExchangeAddress, ethers.parseUnits('50000', 6))
      await p2pExchange
        .connect(richUsdcAccount)
        .createAd(USDC_PRICE, 1, USDC_ADDRESS, ethers.parseUnits('500', 6), block?.timestamp + 3600)
      expect(await usdcContract.balanceOf(p2pExchangeAddress)).to.equal(ethers.parseUnits('500', 6))
    })
  })

  describe('executeAd', function () {
    it('should execute a buy ad and transfer tokens correctly', async function () {
      const { p2pExchange, wngn, p2pExchangeAddress, usdcContract, richUsdcAccount } =
        await loadFixture(deployP2PExchangeFixture)
      const block = await ethers.provider.getBlock('latest')

      await wngn.approve(p2pExchangeAddress, ethers.parseUnits('50000', 6))
      await p2pExchange.createAd(USDC_PRICE, 0, USDC_ADDRESS, ethers.parseUnits('10000', 6), block?.timestamp + 3600)
      expect(await wngn.balanceOf(p2pExchangeAddress)).to.equal(ethers.parseUnits('10000', 6))

      // execute the ad.
      await usdcContract.connect(richUsdcAccount).approve(p2pExchangeAddress, ethers.parseUnits('10000', 6))

      const contractWngnBalanceBefore = await wngn.balanceOf(p2pExchangeAddress)
      const buyerWngnBalanceBefore = await wngn.balanceOf(richUsdcAccount)

      await p2pExchange.connect(richUsdcAccount).executeAd(0, ethers.parseUnits('80', 6))

      const contractWngnBalanceAfter = await wngn.balanceOf(p2pExchangeAddress)
      const buyerWngnBalanceAfter = await wngn.balanceOf(richUsdcAccount)

      expect(contractWngnBalanceAfter).to.be.lessThan(contractWngnBalanceBefore)
      expect(buyerWngnBalanceBefore).to.be.lessThan(buyerWngnBalanceAfter)
    })

    it('should execute a sell ad and transfer tokens correctly', async function () {
      const { p2pExchange, wngn, owner, usdcContract, richUsdcAccount, p2pExchangeAddress } =
        await loadFixture(deployP2PExchangeFixture)
      const block = await ethers.provider.getBlock('latest')

      await usdcContract.connect(richUsdcAccount).approve(p2pExchangeAddress, ethers.parseUnits('5000', 6))
      await p2pExchange
        .connect(richUsdcAccount)
        .createAd(USDC_PRICE, 1, USDC_ADDRESS, ethers.parseUnits('10', 6), block?.timestamp + 3600)
      expect(await usdcContract.balanceOf(p2pExchangeAddress)).to.equal(ethers.parseUnits('10', 6))

      // execute the ad.
      await wngn.approve(p2pExchangeAddress, ethers.parseUnits('150000000000000', 6))
      await usdcContract.approve(p2pExchangeAddress, ethers.parseUnits('100000000000000000', 6))

      const contractUsdcBalanceBefore = await usdcContract.balanceOf(p2pExchangeAddress)
      const buyerUsdcBalanceBefore = await usdcContract.balanceOf(owner)

      await p2pExchange.executeAd(0, ethers.parseUnits('10', 6))

      const contractUsdcBalanceAfter = await usdcContract.balanceOf(p2pExchangeAddress)
      const buyerUsdcBalanceAfter = await usdcContract.balanceOf(owner)

      expect(contractUsdcBalanceAfter).to.be.lessThan(contractUsdcBalanceBefore)
      expect(buyerUsdcBalanceBefore).to.be.lessThan(buyerUsdcBalanceAfter)
    })
  })

  describe('withdrawFunds', function () {
    it('should revert if the ad is still valid', async function () {
      const { p2pExchange, wngn, p2pExchangeAddress } = await loadFixture(deployP2PExchangeFixture)
      const block = await ethers.provider.getBlock('latest')

      await wngn.approve(p2pExchangeAddress, ethers.parseUnits('50000', 6))
      await p2pExchange.createAd(USDC_PRICE, 0, USDC_ADDRESS, ethers.parseUnits('50000', 6), block?.timestamp + 3600)
      expect(await wngn.balanceOf(p2pExchangeAddress)).to.equal(ethers.parseUnits('50000', 6))

      await expect(p2pExchange.withdrawFunds(0)).to.be.revertedWith('ad is still valid')
    })

    it('should revert if the ad quantity is zero', async function () {
      const { p2pExchange, wngn, usdcContract, richUsdcAccount, p2pExchangeAddress, owner } =
        await loadFixture(deployP2PExchangeFixture)
      const block = await ethers.provider.getBlock('latest')

      await wngn.approve(p2pExchangeAddress, ethers.parseUnits('50000', 6))
      await p2pExchange.createAd(USDC_PRICE, 0, USDC_ADDRESS, ethers.parseUnits('50000', 6), block?.timestamp + 3600)
      expect(await wngn.balanceOf(p2pExchangeAddress)).to.equal(ethers.parseUnits('50000', 6))

      await usdcContract.connect(richUsdcAccount).approve(p2pExchangeAddress, ethers.parseUnits('5000', 6))
      await p2pExchange.connect(richUsdcAccount).executeAd(0, ethers.parseUnits('50', 6))
      await ethers.provider.send('evm_increaseTime', [3700]) // Increase time by 1 hour
      await p2pExchange.withdrawFunds(0)
    })

    it('should revert if the caller is not the ad merchant', async function () {
      const { p2pExchange, wngn, usdcContract, richUsdcAccount, p2pExchangeAddress, owner } =
        await loadFixture(deployP2PExchangeFixture)
      const block = await ethers.provider.getBlock('latest')

      await wngn.approve(p2pExchangeAddress, ethers.parseUnits('50000', 6))
      await p2pExchange.createAd(USDC_PRICE, 0, USDC_ADDRESS, ethers.parseUnits('50000', 6), block?.timestamp + 3600)
      expect(await wngn.balanceOf(p2pExchangeAddress)).to.equal(ethers.parseUnits('50000', 6))

      await usdcContract.connect(richUsdcAccount).approve(p2pExchangeAddress, ethers.parseUnits('5000', 6))
      await p2pExchange.connect(richUsdcAccount).executeAd(0, ethers.parseUnits('50', 6))
      await ethers.provider.send('evm_increaseTime', [3700]) // Increase time by 1 hour
      await expect(p2pExchange.connect(richUsdcAccount).withdrawFunds(0)).to.be.revertedWith(
        'only ad creator can withdraw funds from it'
      )
    })
  })
})
