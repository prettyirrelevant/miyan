import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const WNGNModule = buildModule('WNGNModule', (m) => {
  const owner = m.getAccount(1)
  const wngn = m.contract('WNGN')

  return { wngn }
})

export default WNGNModule
