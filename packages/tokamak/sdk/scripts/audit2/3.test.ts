import hardhat from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import '@nomiclabs/hardhat-ethers'
import 'hardhat-deploy'
import { BigNumber, BytesLike, Wallet, ethers } from 'ethers'
import * as l1StandardBridgeAbi from '@tokamak-network/thanos-contracts/forge-artifacts/L1StandardBridge.sol/L1StandardBridge.json'
import * as l2StandardBridgeAbi from '@tokamak-network/thanos-contracts/forge-artifacts/L2StandardBridge.sol/L2StandardBridge.json'
import * as OptimismPortalAbi from '@tokamak-network/thanos-contracts/forge-artifacts/OptimismPortal.sol/OptimismPortal.json'
import * as l2CrossDomainMessengerAbi from '@tokamak-network/thanos-contracts/forge-artifacts/L2CrossDomainMessenger.sol/L2CrossDomainMessenger.json'
import * as l2ToL1MessagePasserAbi from '../../../contracts-bedrock/forge-artifacts/L2ToL1MessagePasser.sol/L2ToL1MessagePasser.json'
import * as l2OutputOracleAbi from '../../../contracts-bedrock/forge-artifacts/L2OutputOracle.sol/L2OutputOracle.json'
import * as LibTest from '../../../contracts-bedrock/forge-artifacts/LibTest.sol/LibTest.json'
import * as web3 from 'web3';

// import * as l2OutputOracleAbi from '@tokamak-network/titan2-contracts/forge-artifacts/L2OutputOracle.sol/L2OutputOracle.json'
// import * as l2ToL1MessagePasserAbi from '../../../contracts-bedrock/forge-artifacts/L2ToL1MessagePasser.sol/L2ToL1MessagePasser.json'
import { CrossChainMessenger, MessageStatus } from '../../src'
// import Artifact__MockHello from '../../../contracts-bedrock/forge-artifacts/MockHello.sol/MockHello.json'
import l1CrossDomainMessengerAbi from '../../../contracts-bedrock/forge-artifacts/L1CrossDomainMessenger.sol/L1CrossDomainMessenger.json'
import {
  erc20ABI,
  deployHello,
  getBalances,
  differenceLog,
  getMessageOfHello,
  deployAttack,
  // deployERC20,
  // createOptimismMintableERC20,
} from '../shared'

const privateKey = process.env.PRIVATE_KEY as BytesLike

const l1Provider = new ethers.providers.StaticJsonRpcProvider(
  process.env.L1_URL
)
const l2Provider = new ethers.providers.StaticJsonRpcProvider(
  process.env.L2_URL
)
const l1Wallet = new ethers.Wallet(privateKey, l1Provider)
const l2Wallet = new ethers.Wallet(privateKey, l2Provider)

const zeroAddr = '0x'.padEnd(42, '0')

const l2CrossDomainMessenger =
  process.env.L2_CROSS_DOMAIN_MESSENGER ||
  '0x4200000000000000000000000000000000000007'

let l2NativeToken = process.env.NATIVE_TOKEN || ''

let addressManager = process.env.ADDRESS_MANAGER || ''
let l1CrossDomainMessenger = process.env.L1_CROSS_DOMAIN_MESSENGER || ''
let l1StandardBridge = process.env.L1_STANDARD_BRIDGE || ''
let optimismPortal = process.env.OPTIMISM_PORTAL || ''
let l2OutputOracle = process.env.L2_OUTPUT_ORACLE || ''
const l2ToL1MessagePasser =
  process.env.L2ToL1MessagePasser ||
  '0x4200000000000000000000000000000000000016'

const l2StandardBridge = process.env.L2_STANDARD_BRIDGE || ''
const legacy_ERC20_ETH = process.env.LEGACY_ERC20_ETH || ''
const l2_ERC20_ETH = process.env.ETH || ''
const l2EthContract = new ethers.Contract(l2_ERC20_ETH, erc20ABI, l2Wallet)

let l1BridgeContract
let l1CrossDomainMessengerContract
let OptomismPortalContract
let l2CrossDomainMessengerContract
let l2ToL1MessagePasserContract
let l2OutputOracleContract

let l1Contracts
let messenger
let tonContract
let helloContractL1
let helloContractL2
// let l1ERC20Token
// let l2ERC20Token

const updateAddresses = async (hre: HardhatRuntimeEnvironment) => {
  if (l2NativeToken === '') {
    const Deployment__L2NativeToken = await hre.deployments.get('L2NativeToken')
    l2NativeToken = Deployment__L2NativeToken.address
  }

  if (addressManager === '') {
    const Deployment__AddressManager = await hre.deployments.get(
      'AddressManager'
    )
    addressManager = Deployment__AddressManager.address
  }

  if (l1CrossDomainMessenger === '') {
    const Deployment__L1CrossDomainMessenger = await hre.deployments.get(
      'L1CrossDomainMessengerProxy'
    )
    l1CrossDomainMessenger = Deployment__L1CrossDomainMessenger.address
  }

  if (l1StandardBridge === '') {
    const Deployment__L1StandardBridge = await hre.deployments.get(
      'L1StandardBridgeProxy'
    )
    l1StandardBridge = Deployment__L1StandardBridge.address
  }

  if (optimismPortal === '') {
    const Deployment__OptimismPortal = await hre.deployments.get(
      'OptimismPortalProxy'
    )
    optimismPortal = Deployment__OptimismPortal.address
  }

  if (l2OutputOracle === '') {
    const Deployment__L2OutputOracle = await hre.deployments.get(
      'L2OutputOracleProxy'
    )
    l2OutputOracle = Deployment__L2OutputOracle.address
  }
}

const setup = async () => {
  await updateAddresses(hardhat)

  l1Contracts = {
    StateCommitmentChain: zeroAddr,
    CanonicalTransactionChain: zeroAddr,
    BondManager: zeroAddr,
    AddressManager: addressManager,
    L1CrossDomainMessenger: l1CrossDomainMessenger,
    L1StandardBridge: l1StandardBridge,
    OptimismPortal: optimismPortal,
    L2OutputOracle: l2OutputOracle,
  }

  tonContract = new ethers.Contract(l2NativeToken, erc20ABI, l1Wallet)

  l1BridgeContract = new ethers.Contract(
    l1StandardBridge,
    l1StandardBridgeAbi.abi,
    l1Wallet
  )

  l1CrossDomainMessengerContract = new ethers.Contract(
    l1CrossDomainMessenger,
    l1CrossDomainMessengerAbi.abi,
    l1Wallet
  )

  OptomismPortalContract = new ethers.Contract(
    optimismPortal,
    OptimismPortalAbi.abi,
    l1Wallet
  )

  l2CrossDomainMessengerContract = new ethers.Contract(
    l2CrossDomainMessenger,
    l2CrossDomainMessengerAbi.abi,
    l2Wallet
  )

  l2OutputOracleContract = new ethers.Contract(
    l2OutputOracle,
    l2OutputOracleAbi.abi,
    l1Wallet
  )

  // const name = 'Test'
  // const symbol = 'TST'
  // const initialSupply = ethers.utils.parseEther('100000')

  // l1ERC20Token = await deployERC20(
  //   hardhat,
  //   l1Wallet,
  //   name,
  //   symbol,
  //   initialSupply
  // )
  // l2ERC20Token = await createOptimismMintableERC20(
  //   hardhat,
  //   l1ERC20Token,
  //   l2Wallet
  // )

  const l1ChainId = (await l1Provider.getNetwork()).chainId
  const l2ChainId = (await l2Provider.getNetwork()).chainId

  messenger = new CrossChainMessenger({
    bedrock: true,
    contracts: {
      l1: l1Contracts,
    },
    l1ChainId,
    l2ChainId,
    l1SignerOrProvider: l1Wallet,
    l2SignerOrProvider: l2Wallet,
  })
}

const test_call = async (amount) => {
  console.log('\n==== messenger_4_sendMessage_L1_TO_L2  ====== ')

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  // let _data = '0x'
  let _data = web3.eth.abi.encodeFunctionCall(
    {
      name: 'transfer',
      type: 'function',
      inputs: [{
          type: 'address',
          name: 'to'
      },{
          type: 'uint256',
          name: 'amount'
      }]
    },
    [
      helloContractL2.address,
      amount.toString()
    ]

);
  const hello_prev = await getMessageOfHello(helloContractL1)
  const message = 'hi. from L1:' + hello_prev.blockNumber
  console.log(message);
  console.log('amount' , amount);
  let balanceOfl1Wallet = await tonContract.balanceOf(l1Wallet.address)
  console.log('balanceOfl1Wallet' , balanceOfl1Wallet);

  await (await tonContract.connect(l1Wallet).transfer(
    helloContractL1.address,amount
  )).wait()
  console.log('--transfer--');

  let balanceOfHelloContractL1 = await tonContract.balanceOf(helloContractL1.address)
  console.log('balanceOfHelloContractL1', balanceOfHelloContractL1);
  balanceOfl1Wallet = await tonContract.balanceOf(l1Wallet.address)
  console.log('balanceOfl1Wallet' , balanceOfl1Wallet);

  const sendTx = await (
    await helloContractL1
      .connect(l1Wallet)
      .callTest(
        tonContract.address,
        helloContractL1.address,
        amount,
        _data
      )
  ).wait()

  console.log('\nsendTx:', sendTx)
  const topic00 = helloContractL1.interface.getEventTopic('CallTested');
  const topic01 = web3.eth.abi.encodeEventSignature('Transfered(bool)');
  const topic02 = web3.eth.abi.encodeEventSignature('Executed(bool)');

  const input = [{
    type: 'bool',
    name: 'result'
  } ]
  let i = 0
  for(i ; i < sendTx.logs.length ; i++){
    let log =  sendTx.logs[i]
    console.log('topics0', log.topics[0] )
    if(log.topics[0] == topic00)  {
      console.log('CallTested', web3.eth.abi.decodeLog(input, log.data, log.topics) )
    } else if(log.topics[0] == topic01) {
      console.log('Transfered', web3.eth.abi.decodeLog(input, log.data, log.topics))
    } else if(log.topics[0] == topic02) {
      console.log('Executed',  web3.eth.abi.decodeLog(input, log.data, log.topics))
    }
  }
  //--
  //  const log00 = sendTx.logs.find(x => x.topics.indexOf(topic00) >= 0);
  // const deployedEvent00 = helloContractL1.interface.parseLog(log00);
  // console.log('CallTested', deployedEvent00?.args)
  // //--
  // const topic01 = web3.eth.abi.encodeEventSignature('Transfered(bool)');
  // console.log('topic01', topic01)

  // const log01 = sendTx.logs.find(x => x.topics.indexOf(topic01) >= 0);
  // const deployedEvent01 = helloContractL1.interface.parseLog(log01);
  // console.log('Transfered', deployedEvent01?.args)

  // //--
  // console.log('topic02', topic02)

  // const log02 = sendTx.logs.find(x => x.topics.indexOf(topic02) >= 0);
  // const deployedEvent02 = helloContractL1.interface.parseLog(log02);
  // console.log('Executed', deployedEvent02?.args)

  //--
  balanceOfl1Wallet = await tonContract.balanceOf(l1Wallet.address)
  console.log('balanceOfl1Wallet' , balanceOfl1Wallet);

  balanceOfHelloContractL1 = await tonContract.balanceOf(helloContractL1.address)
  console.log('balanceOfHelloContractL1', balanceOfHelloContractL1);


}

const main = async () => {
  await setup()
  // await faucet(l1Wallet, ethers.utils.parseEther('100'))

  const depositAmount = ethers.utils.parseEther('2')
  const withdrawAmount = ethers.utils.parseEther('1')

  helloContractL1 = await deployHello(hardhat, l1Wallet)
  helloContractL2 = await deployHello(hardhat, l1Wallet)

  //   helloContractL2 = await deployHello(hardhat, l2Wallet)

  await test_call(depositAmount);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})