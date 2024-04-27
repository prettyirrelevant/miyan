import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-chai-matchers'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-verify'
import 'hardhat-abi-exporter'
import 'hardhat-deal'
import 'dotenv/config'

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  abiExporter: {
    path: './abis',
    pretty: true,
  },
  networks: {
    scrollSepolia: {
      accounts: [process.env.DEPLOYER_PRIVATE_KEY as string],
      url: 'https://rpc.ankr.com/scroll_sepolia_testnet',
    },
    hardhat: {
      forking: {
        url: 'https://rpc.ankr.com/scroll_sepolia_testnet',
        blockNumber: 4103335,
      },
    },
  },
  etherscan: {
    customChains: [
      {
        network: 'scrollSepolia',
        chainId: 534351,
        urls: {
          apiURL: 'https://api-sepolia.scrollscan.com/api',
          browserURL: 'https://sepolia-optimism.etherscan.io/',
        },
      },
    ],
    apiKey: {
      scrollSepolia: process.env.SCROLL_SEPOLIA_API_KEY!,
    },
  },
  sourcify: {
    enabled: true,
  },
}

export default config
