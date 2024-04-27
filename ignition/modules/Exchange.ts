import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const WNGNModule = buildModule('P2PExchangeModule', (m) => {
  const owner = m.getAccount(1)

  const exchange = m.contract('P2PExchange', [''])
  return { exchange }
})

export default WNGNModule
