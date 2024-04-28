import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const WngnModule = buildModule('WngnModule', (m) => {
  const owner = m.getAccount(1)
  const wngn = m.contract('Wngn')

  return { wngn }
})

export default WngnModule
