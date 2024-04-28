import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const WNGNModule = buildModule('P2PExchangeModule', (m) => {
  const owner = m.getAccount(1)

  const exchange = m.contract('P2PExchange', ['0xAF97c3478ABF6EEAc933d3383B71668F314400aA'])
  return { exchange }
})

export default WNGNModule
