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

const messenger_1_depositTON_L1_TO_L2 = async (amount: BigNumber) => {
  console.log('\n==== messenger_1_depositTON_L1_TO_L2  ====== ')

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  const allowanceAmount = await tonContract.allowance(
    l1Wallet.address,
    l1CrossDomainMessenger
  )
  if (allowanceAmount < amount) {
    await (
      await tonContract
        .connect(l1Wallet)
        .approve(l1CrossDomainMessenger, amount)
    ).wait()
  }

  const sendTx = await (
    await l1CrossDomainMessengerContract
      .connect(l1Wallet)
      ['sendNativeTokenMessage(address,uint256,bytes,uint32)'](
        l1Wallet.address,
        amount,
        '0x',
        20000
      )
  ).wait()
  console.log('\nsendTx:', sendTx.transactionHash)

  // const topic = l1CrossDomainMessengerContract.interface.getEventTopic('SentMessage');
  // const topic1 = l1CrossDomainMessengerContract.interface.getEventTopic('SentMessageExtension1');
  // const topic2 = OptomismPortalContract.interface.getEventTopic('TransactionDeposited');

  // await logEvent(sendTx, topic, l1CrossDomainMessengerContract , 'SentMessage ' );
  // await logEvent(sendTx, topic1, l1CrossDomainMessengerContract , 'SentMessageExtension1 ' );
  // await logEvent(sendTx, topic2, OptomismPortalContract , 'TransactionDeposited ' );

  await messenger.waitForMessageStatus(
    sendTx.transactionHash,
    MessageStatus.RELAYED
  )

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  await differenceLog(beforeBalances, afterBalances)
}

const messenger_2_depositTON_L1_TO_L2 = async (amount: BigNumber) => {
  console.log('\n==== messenger_2_depositTON_L1_TO_L2  ====== ')

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

//   const data = ethers.utils.solidityPack(
//     ['address', 'uint32', 'bytes'],
//     [l1Wallet.address, 20000, '0x']
//   )

  const data = ethers.utils.solidityPack(
    ['address', 'address', 'uint256', 'uint32', 'bytes'],
    [l1Wallet.address, l1Wallet.address, amount.toString(), 20000, '0x']
  )


  const sendTx = await (
    await tonContract
      .connect(l1Wallet)
      .approveAndCall(l1CrossDomainMessenger, amount, data)
  ).wait()
  console.log('\napproveAndCallTx:', sendTx.transactionHash)

  // const topic = l1CrossDomainMessengerContract.interface.getEventTopic('SentMessage');
  // const topic1 = l1CrossDomainMessengerContract.interface.getEventTopic('SentMessageExtension1');
  // const topic2 = OptomismPortalContract.interface.getEventTopic('TransactionDeposited');

  // await logEvent(sendTx, topic, l1CrossDomainMessengerContract , 'SentMessage ' );
  // await logEvent(sendTx, topic1, l1CrossDomainMessengerContract , 'SentMessageExtension1 ' );
  // await logEvent(sendTx, topic2, OptomismPortalContract , 'TransactionDeposited ' );

  await messenger.waitForMessageStatus(
    sendTx.transactionHash,
    MessageStatus.RELAYED
  )

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  await differenceLog(beforeBalances, afterBalances)
}

const bridge_2_withdrawTON_L2_TO_L1 = async (amount: BigNumber) => {
  console.log('\n==== bridge_2_withdrawTON_L2_TO_L1  ====== ')

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  const l2BridgeContract = new ethers.Contract(
    l2StandardBridge,
    l2StandardBridgeAbi.abi,
    l2Wallet
  )
  const withdrawal = await l2BridgeContract
    .connect(l2Wallet)
    .withdraw(legacy_ERC20_ETH, amount, 20000, '0x', {
      value: amount,
    })
  const withdrawalTx = await withdrawal.wait()
  console.log(
    '\nwithdrawal Tx:',
    withdrawalTx.transactionHash,
    ' Block',
    withdrawalTx.blockNumber,
    ' hash',
    withdrawal.hash
  )

  await messenger.waitForMessageStatus(
    withdrawalTx.transactionHash,
    MessageStatus.READY_TO_PROVE
  )

  console.log('\nProve the message')
  const proveTx = await messenger.proveMessage(withdrawalTx.transactionHash)
  const proveReceipt = await proveTx.wait(3)
  console.log('Proved the message: ', proveReceipt.transactionHash)

  const finalizeInterval = setInterval(async () => {
    const currentStatus = await messenger.getMessageStatus(
      withdrawalTx.transactionHash
    )
    console.log('Message status: ', currentStatus)
  }, 3000)

  try {
    await messenger.waitForMessageStatus(
      withdrawalTx.transactionHash,
      MessageStatus.READY_FOR_RELAY
    )
  } finally {
    clearInterval(finalizeInterval)
  }

  const tx = await messenger.finalizeMessage(withdrawalTx.transactionHash)
  const receipt = await tx.wait()
  console.log('\nFinalized message tx', receipt.transactionHash)
  console.log('Finalized withdrawal')

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  await differenceLog(beforeBalances, afterBalances)
}

// const getMessageOfHello = async (helloContract) => {
//   const blockNumber = await helloContract.blockNumber()
//   const message = await helloContract.message()

//   return {
//     blockNumber,
//     message,
//   }
// }

const messenger_4_sendMessage_L1_TO_L2 = async () => {
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

  const hello_prev = await getMessageOfHello(helloContractL1)
  const message = 'hi. from L1:' + hello_prev.blockNumber

  const callData = await helloContractL2.interface.encodeFunctionData('say', [
    message,
  ])
  const _gasLimit = callData.length * 16 + 21000
  // _gasLimit = 120000;
  console.log('_gasLimit', _gasLimit)

  const sendTx = await (
    await l1CrossDomainMessengerContract
      .connect(l1Wallet)
      .sendMessage(helloContractL2.address, callData, _gasLimit * 2)
  ).wait()

  console.log('\nsendTx:', sendTx.transactionHash)

  // const topic = l1CrossDomainMessengerContract.interface.getEventTopic('SentMessage');
  // const topic1 = l1CrossDomainMessengerContract.interface.getEventTopic('SentMessageExtension1');
  // const topic2 = OptomismPortalContract.interface.getEventTopic('TransactionDeposited');

  // await logEvent(sendTx, topic, l1CrossDomainMessengerContract , 'SentMessage ' );
  // await logEvent(sendTx, topic1, l1CrossDomainMessengerContract , 'SentMessageExtension1 ' );
  // await logEvent(sendTx, topic2, OptomismPortalContract , 'TransactionDeposited ' );

  await messenger.waitForMessageStatus(
    sendTx.transactionHash,
    MessageStatus.RELAYED
  )

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  await differenceLog(beforeBalances, afterBalances)

  const hello_after = await getMessageOfHello(helloContractL2)

  if (hello_after.message.localeCompare(message) === 0) {
    console.log('.. success sendMessage !! ')
  } else {
    console.log('.. fail sendMessage !! ')
  }
}

const messenger_5_sendMessage_L2_TO_L1 = async () => {
  console.log('\n==== messenger_5_sendMessage_L2_TO_L1  ====== ')

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  const hello_prev = await getMessageOfHello(helloContractL2)

  const message = 'nice to meet you. from L2:' + hello_prev.blockNumber

  const callData = await helloContractL1.interface.encodeFunctionData('say', [
    message,
  ])
  const _gasLimit = callData.length * 16 + 21000
  console.log('_gasLimit', _gasLimit)

  const sendTx = await (
    await l2CrossDomainMessengerContract
      .connect(l2Wallet)
      .sendMessage(helloContractL1.address, callData, _gasLimit * 10)
  ).wait()

  console.log('\nsendTx:', sendTx.transactionHash)

  await messenger.waitForMessageStatus(
    sendTx.transactionHash,
    MessageStatus.READY_TO_PROVE
  )

  console.log('\nProve the message')
  const proveTx = await messenger.proveMessage(sendTx.transactionHash)
  const proveReceipt = await proveTx.wait(3)
  console.log('Proved the message: ', proveReceipt.transactionHash)

  const finalizeInterval = setInterval(async () => {
    const currentStatus = await messenger.getMessageStatus(
      sendTx.transactionHash
    )
    console.log('Message status: ', currentStatus)
  }, 3000)

  try {
    await messenger.waitForMessageStatus(
      sendTx.transactionHash,
      MessageStatus.READY_FOR_RELAY
    )
  } finally {
    clearInterval(finalizeInterval)
  }

  const tx = await messenger.finalizeMessage(sendTx.transactionHash)
  const receipt = await tx.wait()
  console.log('\nFinalized message tx', receipt.transactionHash)
  console.log('Finalized withdrawal')

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  await differenceLog(beforeBalances, afterBalances)
  const hello_after = await getMessageOfHello(helloContractL1)

  if (hello_after.message.localeCompare(message) === 0) {
    console.log('.. success sendMessage !! ')
  } else {
    console.log('.. fail sendMessage !! ')
  }
}

const messenger_6_sendNativeTokenMessage_L1_TO_L2 = async (
  amount: BigNumber
) => {
  console.log('\n==== messenger_6_sendNativeTokenMessage_L1_TO_L2  ====== ')
  console.log('\n amount: ', ethers.utils.formatEther(amount))

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  const hello_prev = await getMessageOfHello(helloContractL1)
  const message = 'hi. from L1:' + hello_prev.blockNumber

  const allowanceAmount = await tonContract.allowance(
    l1Wallet.address,
    l1CrossDomainMessenger
  )
  if (allowanceAmount < amount) {
    await (
      await tonContract
        .connect(l1Wallet)
        .approve(l1CrossDomainMessenger, amount)
    ).wait()
  }

  const tonBalanceHelloL2_prev = await l2Wallet.provider.getBalance(
    helloContractL2.address
  )

  const callData = await helloContractL2.interface.encodeFunctionData(
    'sayPayable',
    [message]
  )
  const _gasLimit = callData.length * 16 + 21000
  // _gasLimit = 120000;
  console.log('_gasLimit', _gasLimit)

  const sendTx = await (
    await l1CrossDomainMessengerContract
      .connect(l1Wallet)
      ['sendNativeTokenMessage(address,uint256,bytes,uint32)'](
        helloContractL2.address,
        amount,
        callData,
        _gasLimit * 10
      )
  ).wait()

  console.log('\nsendTx:', sendTx.transactionHash)

  try {
    await messenger.waitForMessageStatus(
      sendTx.transactionHash,
      MessageStatus.RELAYED
    )
  } catch (e) {
    console.log('\nerror', e)
    console.log('\n')
  }

  const tonBalanceHelloL2_after = await l2Wallet.provider.getBalance(
    helloContractL2.address
  )

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  await differenceLog(beforeBalances, afterBalances)

  const hello_after = await getMessageOfHello(helloContractL2)

  console.log('hello_after.message', hello_after.message)
  console.log('message', message)

  if (hello_after.message.localeCompare(message) === 0) {
    console.log('.. success sendMessage !! ')
  } else {
    console.log('.. fail sendMessage !! ')
  }

  console.log(
    'L2 Contract Native TON Changed : ',
    ethers.utils.formatEther(
      tonBalanceHelloL2_after.sub(tonBalanceHelloL2_prev)
    )
  )
}

const messenger_7_sendNativeTokenMessages_L1_TO_L2 = async (
  amount: BigNumber
) => {
  console.log('\n==== messenger_7_sendNativeTokenMessages_L1_TO_L2  ====== ')
  console.log('\n amount: ', ethers.utils.formatEther(amount))
  const tAmount = amount.add(amount.mul(ethers.BigNumber.from('2')))

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  const hello_prev = await getMessageOfHello(helloContractL1)
  const message = 'hi. from L1:' + hello_prev.blockNumber

  const allowanceAmount = await tonContract.allowance(
    l1Wallet.address,
    l1CrossDomainMessenger
  )
  if (allowanceAmount < tAmount) {
    await (
      await tonContract
        .connect(l1Wallet)
        .approve(l1CrossDomainMessenger, tAmount)
    ).wait()
  }

  const tonBalanceHelloL2_prev = await l2Wallet.provider.getBalance(
    helloContractL2.address
  )

  const callData1 = helloContractL2.interface.encodeFunctionData('sayPayable', [
    message,
  ])

  const callData = ['0x', callData1]
  const _gasLimit = [200000, (callData1.length * 16 + 21000) * 10]

  // _gasLimit = 120000;
  // console.log('_gasLimit', _gasLimit)

  const sendTx = await (
    await l1CrossDomainMessengerContract
      .connect(l1Wallet)
      ['sendNativeTokenMessage(address[],uint256[],bytes[],uint32[])'](
        [l2Wallet.address, helloContractL2.address],
        [amount, amount.mul(ethers.BigNumber.from('2'))],
        callData,
        _gasLimit
      )
  ).wait()

  console.log('\nsendTx:', sendTx.transactionHash)

  try {
    await messenger.waitForMessageStatus(
      sendTx.transactionHash,
      MessageStatus.RELAYED
    )
  } catch (e) {
    console.log('\nerror', e)
    console.log('\n')
  }

  const tonBalanceHelloL2_after = await l2Wallet.provider.getBalance(
    helloContractL2.address
  )

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  await differenceLog(beforeBalances, afterBalances)

  const hello_after = await getMessageOfHello(helloContractL2)

  console.log('hello_after.message', hello_after.message)
  console.log('message', message)

  if (hello_after.message.localeCompare(message) === 0) {
    console.log('.. success sendMessage !! ')
  } else {
    console.log('.. fail sendMessage !! ')
  }

  console.log(
    'L2 Contract Native TON Changed : ',
    ethers.utils.formatEther(
      tonBalanceHelloL2_after.sub(tonBalanceHelloL2_prev)
    )
  )
}

const messenger_8_depositETH_L1_TO_L2 = async (amount: BigNumber) => {
  console.log('\n==== messenger_8_depositETH_L1_TO_L2  ====== ')

  let err = true
  try {
    await (
      await l1CrossDomainMessengerContract
        .connect(l1Wallet)
        .sendMessage(l1Wallet.address, '0x', 20000, { value: amount })
    ).wait()
  } catch (e) {
    err = true
  }

  if (err) {
    console.log(
      ' Successfully occur error : execution reverted: Deny depositing ETH'
    )
  } else {
    console.log(
      '*** Error : The use of Ether in sendMessage of l1CrossDomainMessengerContract is prohibited. '
    )
  }
}

const messenger_9_withdrawNativeToken_L2_TO_L1 = async (amount: BigNumber) => {
  console.log('\n==== messenger_9_withdrawNativeToken_L2_TO_L1  ====== ')

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  // 1: =====================
  const sendTx = await (
      await l2CrossDomainMessengerContract
      .connect(l2Wallet)
      .sendMessage(l1Wallet.address, '0x', 200000, { value: amount })
  ).wait()

  console.log('\nsendTx:', sendTx.transactionHash)

  await messenger.waitForMessageStatus(
    sendTx.transactionHash,
    MessageStatus.READY_TO_PROVE
  )

  console.log('\nProve the message')
  const proveTx = await messenger.proveMessage(sendTx.transactionHash)
  const proveReceipt = await proveTx.wait(3)
  console.log('Proved the message: ', proveReceipt.transactionHash)

  const finalizeInterval = setInterval(async () => {
    const currentStatus = await messenger.getMessageStatus(
      sendTx.transactionHash
    )
    console.log('Message status: ', currentStatus)
  }, 3000)

  try {
    await messenger.waitForMessageStatus(
      sendTx.transactionHash,
      MessageStatus.READY_FOR_RELAY
    )
  } finally {
    clearInterval(finalizeInterval)
  }

  const tx = await messenger.finalizeMessage(sendTx.transactionHash)
  const receipt = await tx.wait()
  console.log('\nFinalized message tx', receipt.transactionHash)
  console.log('Finalized withdrawal')

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  const allowance = await tonContract.allowance(
    l1CrossDomainMessengerContract.address, l1Wallet.address)
  console.log("** allowance ", allowance.toString())

  await differenceLog(beforeBalances, afterBalances)

  console.log("==== tonContract.transferFrom ===========" )

  const tx1 = await (await tonContract.transferFrom(
    l1CrossDomainMessengerContract.address, l1Wallet.address, amount)
  ).wait()

  const afterBalances1 = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  await differenceLog(beforeBalances, afterBalances1)

}

const messenger_9_1_withdrawNativeToken_L2_TO_L1 = async (amount: BigNumber) => {
  console.log('\n==== messenger_9_1_withdrawNativeToken_L2_TO_L1  ====== ')

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

    const sendTx = await (
        await l2CrossDomainMessengerContract
        .connect(l2Wallet)
        .sendMessage(l1Wallet.address, '0x', 200000, { value: amount })
    ).wait()

  console.log('\nsendTx:', sendTx.transactionHash)

  await messenger.waitForMessageStatus(
    sendTx.transactionHash,
    MessageStatus.READY_TO_PROVE
  )

  console.log('\nProve the message')
  const proveTx = await messenger.proveMessage(sendTx.transactionHash)
  const proveReceipt = await proveTx.wait(3)
  console.log('Proved the message: ', proveReceipt.transactionHash)

  const finalizeInterval = setInterval(async () => {
    const currentStatus = await messenger.getMessageStatus(
      sendTx.transactionHash
    )
    console.log('Message status: ', currentStatus)
  }, 3000)

  try {
    await messenger.waitForMessageStatus(
      sendTx.transactionHash,
      MessageStatus.READY_FOR_RELAY
    )
  } finally {
    clearInterval(finalizeInterval)
  }

  const tx = await messenger.finalizeMessage(sendTx.transactionHash)
  const receipt = await tx.wait()
  console.log('\nFinalized message tx', receipt.transactionHash)
  console.log('Finalized withdrawal')

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  const allowance = await tonContract.allowance(
    l1CrossDomainMessengerContract.address, l1Wallet.address)
  console.log("** allowance ", allowance.toString())

  await differenceLog(beforeBalances, afterBalances)

  // console.log("==== tonContract.transferFrom ===========" )

  // const tx1 = await (await tonContract.transferFrom(
  //   l1CrossDomainMessengerContract.address, l1Wallet.address, amount)
  // ).wait()

  // const afterBalances1 = await getBalances(
  //   l1Wallet,
  //   l2Wallet,
  //   tonContract,
  //   l2EthContract,
  //   l1BridgeContract,
  //   l1CrossDomainMessengerContract,
  //   OptomismPortalContract
  // )

  // await differenceLog(beforeBalances, afterBalances1)

}


const messenger_9_2_withdrawNativeToken_L2_TO_L1 = async (amount: BigNumber) => {
  console.log('\n==== messenger_9_2_withdrawNativeToken_L2_TO_L1  ====== ')

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  const functionBytecode = tonContract.interface.encodeFunctionData(
    "selfdestruct", [l1Wallet.address])

    const sendTx = await (
        await l2CrossDomainMessengerContract
        .connect(l2Wallet)
        .sendMessage(l1BridgeContract.address, functionBytecode, 200000, { value: amount })
    ).wait()

  console.log('\nsendTx:', sendTx.transactionHash)

  await messenger.waitForMessageStatus(
    sendTx.transactionHash,
    MessageStatus.READY_TO_PROVE
  )

  console.log('\nProve the message')
  const proveTx = await messenger.proveMessage(sendTx.transactionHash)
  const proveReceipt = await proveTx.wait(3)
  console.log('Proved the message: ', proveReceipt.transactionHash)

  const finalizeInterval = setInterval(async () => {
    const currentStatus = await messenger.getMessageStatus(
      sendTx.transactionHash
    )
    console.log('Message status: ', currentStatus)
  }, 3000)

  try {
    await messenger.waitForMessageStatus(
      sendTx.transactionHash,
      MessageStatus.READY_FOR_RELAY
    )
  } finally {
    clearInterval(finalizeInterval)
  }

  const tx = await messenger.finalizeMessage(sendTx.transactionHash)
  const receipt = await tx.wait()
  console.log('\nFinalized message tx', receipt.transactionHash)
  console.log('Finalized withdrawal')

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )


  const allowance = await tonContract.allowance(
    l1CrossDomainMessengerContract.address, l1Wallet.address)
  console.log("** allowance ", allowance.toString())

  await differenceLog(beforeBalances, afterBalances)

  // console.log("==== tonContract.transferFrom ===========" )

  // const tx1 = await (await tonContract.transferFrom(
  //   l1CrossDomainMessengerContract.address, l1Wallet.address, amount)
  // ).wait()

  // const afterBalances1 = await getBalances(
  //   l1Wallet,
  //   l2Wallet,
  //   tonContract,
  //   l2EthContract,
  //   l1BridgeContract,
  //   l1CrossDomainMessengerContract,
  //   OptomismPortalContract
  // )

  // await differenceLog(beforeBalances, afterBalances1)

}


const messenger_9_3_withdrawNativeToken_L2_TO_L1 = async (amount: BigNumber) => {
  console.log('\n==== messenger_9_3_withdrawNativeToken_L2_TO_L1  ====== ')
  l2ToL1MessagePasserContract = new ethers.Contract(
    l2ToL1MessagePasser,
    l2ToL1MessagePasserAbi.abi,
    l2Wallet
  )

  const attackContract = await deployAttack(hardhat, l1Wallet)


  const tonBalancePrev = await tonContract.balanceOf(l1Wallet.address)
  const ethBalancePrev  = await l1Wallet.getBalance()
  console.log("** tonBalancePrev ", tonBalancePrev.toString())
  console.log("** ethBalancePrev ", ethBalancePrev.toString())

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  const messageNonce = await l2ToL1MessagePasserContract.messageNonce()

  const decodeVersionedNonce = await attackContract.decodeVersionedNonce(messageNonce)

  console.log('decodeVersionedNonce:', decodeVersionedNonce)

  const functionBridge = l1BridgeContract.interface.encodeFunctionData(
    "finalizeBridgeETH", [l1Wallet.address, l1Wallet.address, ethers.utils.parseEther('1'), '0x'])
  // const functionAttack = attackContract.interface.encodeFunctionData(
  //   "relayMessage", [
  //     l1CrossDomainMessengerContract.address,
  //     messageNonce,
  //     l2StandardBridge,
  //     l1BridgeContract.address,
  //     0,
  //     1000000,
  //     functionBridge
  //   ])
    const functionAttack = attackContract.interface.encodeFunctionData(
      "relayMessage", [
        l1CrossDomainMessengerContract.address,
        messageNonce,
        l1Wallet.address, // _sender l2StandardBridge
        l1Wallet.address,
        0,
        0,
        '0x'
      ])

  // const functionRelayed = l1CrossDomainMessengerContract.interface.encodeFunctionData(
  // "relayMessage", [
  //   messageNonce,
  //   l1BridgeContract.address,
  //   l2StandardBridge,
  //   ethers.utils.parseEther('1'),
  //   100000,
  //   functionBridge])

  const sendTx = await (
      await l2CrossDomainMessengerContract
      .connect(l2Wallet)
      .sendMessage(attackContract.address, functionAttack, 1000000, { value: 0 })
  ).wait()

  console.log('\nsendTx:', sendTx.transactionHash)

  await messenger.waitForMessageStatus(
    sendTx.transactionHash,
    MessageStatus.READY_TO_PROVE
  )

  console.log('\nProve the message')
  const proveTx = await messenger.proveMessage(sendTx.transactionHash)
  const proveReceipt = await proveTx.wait(3)
  console.log('Proved the message: ', proveReceipt.transactionHash)

  const finalizeInterval = setInterval(async () => {
    const currentStatus = await messenger.getMessageStatus(
      sendTx.transactionHash
    )
    console.log('Message status: ', currentStatus)
  }, 3000)

  try {
    await messenger.waitForMessageStatus(
      sendTx.transactionHash,
      MessageStatus.READY_FOR_RELAY
    )
  } finally {
    clearInterval(finalizeInterval)
  }

  const tx = await messenger.finalizeMessage(sendTx.transactionHash)
  const receipt = await tx.wait()
  console.log('\nFinalized message tx', receipt.transactionHash)
  console.log('Finalized withdrawal')
  console.log('receipt' , receipt)

  //--
  console.log("===============" )
  console.log("attackContract : ", attackContract.address )
  console.log("tonContract : ", tonContract.address )
  console.log("l1BridgeContract : ", l1BridgeContract.address )
  console.log("l1CrossDomainMessengerContract : ", l1CrossDomainMessengerContract.address )
  console.log("OptomismPortalContract : ", OptomismPortalContract.address )
  console.log("1l1Wallet : ", l1Wallet.address )

  console.log("l2StandardBridge : ", l2StandardBridge )
  console.log("l2CrossDomainMessengerContract : ", l2CrossDomainMessengerContract.address )
  console.log("===============" )

  //--
  const topic00 = attackContract.interface.getEventTopic('AttackXDomainMessageSender');
  const log00 = receipt.logs.find(x => x.topics.indexOf(topic00) >= 0);
  const deployedEvent00 = attackContract.interface.parseLog(log00);
  // console.log('AttackBalance', deployedEvent1)
  console.log('AttackXDomainMessageSender', deployedEvent00?.args)

  //--
  const topic0 = attackContract.interface.getEventTopic('AttackTarget');
  const log0 = receipt.logs.find(x => x.topics.indexOf(topic0) >= 0);
  const deployedEvent0 = attackContract.interface.parseLog(log0);
  // console.log('AttackBalance', deployedEvent1)
  console.log('AttackTarget', deployedEvent0?.args)

  //--
  const topic1 = attackContract.interface.getEventTopic('AttackedRelayMessage');
  const log1 = receipt.logs.find(x => x.topics.indexOf(topic1) >= 0);
  const deployedEvent1 = attackContract.interface.parseLog(log1);
  // console.log('AttackBalance', deployedEvent1)
  console.log('AttackedRelayMessage deployedEvent1.args', deployedEvent1?.args)


  //---
  const allowance = await tonContract.allowance(
    l1CrossDomainMessengerContract.address, l1Wallet.address)
  console.log("** allowance ", allowance.toString())

  const tonBalance = await tonContract.balanceOf(l1Wallet.address)
  const ethBalance = await l1Wallet.getBalance()
  console.log("** tonBalance ", tonBalance.toString())
  console.log("** ethBalance ", ethBalance.toString())

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  await differenceLog(beforeBalances, afterBalances)

  // console.log("==== tonContract.transferFrom ===========" )

  // const tx1 = await (await tonContract.transferFrom(
  //   l1CrossDomainMessengerContract.address, l1Wallet.address, amount)
  // ).wait()

  // const afterBalances1 = await getBalances(
  //   l1Wallet,
  //   l2Wallet,
  //   tonContract,
  //   l2EthContract,
  //   l1BridgeContract,
  //   l1CrossDomainMessengerContract,
  //   OptomismPortalContract
  // )

  // await differenceLog(beforeBalances, afterBalances1)

}


const messenger_9_4_withdrawNativeToken_L2_TO_L1 = async (amount: BigNumber) => {
  console.log('\n==== messenger_9_4_withdrawNativeToken_L2_TO_L1  ====== ')
  l2ToL1MessagePasserContract = new ethers.Contract(
    l2ToL1MessagePasser,
    l2ToL1MessagePasserAbi.abi,
    l2Wallet
  )

  let proposer = await l2OutputOracleContract.proposer()
  console.log("proposer ", proposer)

  let challenger = await l2OutputOracleContract.challenger()
  console.log("challenger ", challenger)

  let block = await l1Provider.getBlock('latest')
  console.log("block.number ", block.number)

  let getL2OutputIndexAfter = await l2OutputOracleContract.getL2OutputIndexAfter(block.number)
  console.log("getL2OutputIndexAfter ", getL2OutputIndexAfter.toString())

  let getL2Output = await l2OutputOracleContract.getL2Output(getL2OutputIndexAfter)
  console.log("getL2Output ", getL2Output)
  console.log("getL2Output.l2BlockNumber ", getL2Output.l2BlockNumber.toString())

  let getL2OutputAfter = await l2OutputOracleContract.getL2OutputAfter(block.number)
  console.log("getL2OutputAfter ", getL2OutputAfter)

  console.log("getL2OutputAfter.l2BlockNumber ", getL2OutputAfter.l2BlockNumber.toString())

  const attackContract = await deployAttack(hardhat, l1Wallet)

  const tonBalancePrev = await tonContract.balanceOf(l1Wallet.address)
  const ethBalancePrev  = await l1Wallet.getBalance()
  console.log("** tonBalancePrev ", tonBalancePrev.toString())
  console.log("** ethBalancePrev ", ethBalancePrev.toString())

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  const messageNonce = await l2ToL1MessagePasserContract.messageNonce()

  const decodeVersionedNonce = await attackContract.decodeVersionedNonce(messageNonce)

  console.log('decodeVersionedNonce:', decodeVersionedNonce)


  // const WithdrawalTransaction = {
  //   nonce: messageNonce,
  //   sender: '0x000000000000000000000000000000000000dEaD',
  //   target: l1Wallet.address,
  //   value: 0,
  //   gasLimit: 1000000,
  //   data: '0x'
  // }

  // let TypesOutputRootProof = {
  //   Version:                  [32]byte{}, // Empty for version 1
  //   StateRoot:                l2Block.Root(),
  //   MessagePasserStorageRoot: p.StorageHash,
  //   LatestBlockhash:          l2Block.Hash(),
  // }
  // let ProvenWithdrawalParameters = {
	// 	Nonce: WithdrawalTransaction.nonce,
	// 	Sender: WithdrawalTransaction.sender,
	// 	Target:  WithdrawalTransaction.target,
	// 	Value:   WithdrawalTransaction.value,
	// 	GasLimit:  WithdrawalTransaction.gasLimit,
	// 	L2OutputIndex: l2OutputIndex,
	// 	Data:  WithdrawalTransaction.data,
	// 	OutputRootProof:  TypesOutputRootProof,
	// 	WithdrawalProof: trieNodes,
	// }

  //         (
  //           bytes32 stateRoot,
  //           bytes32 storageRoot,
  //           bytes32 outputRoot,
  //           bytes32 withdrawalHash,
  //           bytes[] memory withdrawalProof
  //       ) = abi.decode(result, (bytes32, bytes32, bytes32, bytes32, bytes[]));
/*
  const functionBridge = l1BridgeContract.interface.encodeFunctionData(
    "finalizeBridgeETH", [l1Wallet.address, l1Wallet.address, ethers.utils.parseEther('1'), '0x'])
  // const functionAttack = attackContract.interface.encodeFunctionData(
  //   "relayMessage", [
  //     l1CrossDomainMessengerContract.address,
  //     messageNonce,
  //     l2StandardBridge,
  //     l1BridgeContract.address,
  //     0,
  //     1000000,
  //     functionBridge
  //   ])
    const functionAttack = attackContract.interface.encodeFunctionData(
      "relayMessage", [
        l1CrossDomainMessengerContract.address,
        messageNonce,
        l1Wallet.address, // _sender l2StandardBridge
        l1Wallet.address,
        0,
        0,
        '0x'
      ])

  // const functionRelayed = l1CrossDomainMessengerContract.interface.encodeFunctionData(
  // "relayMessage", [
  //   messageNonce,
  //   l1BridgeContract.address,
  //   l2StandardBridge,
  //   ethers.utils.parseEther('1'),
  //   100000,
  //   functionBridge])

  const sendTx = await (
      await l2CrossDomainMessengerContract
      .connect(l2Wallet)
      .sendMessage(attackContract.address, functionAttack, 1000000, { value: 0 })
  ).wait()

  console.log('\nsendTx:', sendTx.transactionHash)

  await messenger.waitForMessageStatus(
    sendTx.transactionHash,
    MessageStatus.READY_TO_PROVE
  )

  //======

  // const withdrawal = await this.toLowLevelMessage(resolved, messageIndex)
  let withdrawal = withdrawalMsg;
  withdrawal.sender = l1Wallet.address
  const proof = await this.getBedrockMessageProof(resolved, messageIndex)

  console.log('Proving withdrawal...')
  const prove = await messenger.proveMessage(withdrawalMsg)
  const proveReceipt = await prove.wait()
  console.log(proveReceipt)
  if (proveReceipt.status !== 1) {
    throw new Error('Prove withdrawal transaction reverted')
  }

  _defaultTx = Types.WithdrawalTransaction({
    nonce: 0,
    sender: alice,
    target: bob,
    value: 100,
    gasLimit: 100_000,
    data: hex""
});
  const args = [
    [
      withdrawalMsg.messageNonce,
      withdrawalMsg.sender,
      withdrawalMsg.target,
      withdrawalMsg.value,
      withdrawalMsg.minGasLimit,
      withdrawalMsg.message,
    ],
    proof.l2OutputIndex,
    [
      proof.outputRootProof.version,
      proof.outputRootProof.stateRoot,
      proof.outputRootProof.messagePasserStorageRoot,
      proof.outputRootProof.latestBlockhash,
    ],
    proof.withdrawalProof,
    opts?.overrides || {},
  ] as const

  return this.contracts.l1.OptimismPortal.populateTransaction.proveWithdrawalTransaction(
    ...args
  )

  //===================================
  // console.log('\nProve the message')
  // const proveTx = await messenger.proveMessage(sendTx.transactionHash)
  // const proveReceipt = await proveTx.wait(3)
  // console.log('Proved the message: ', proveReceipt.transactionHash)

  // const finalizeInterval = setInterval(async () => {
  //   const currentStatus = await messenger.getMessageStatus(
  //     sendTx.transactionHash
  //   )
  //   console.log('Message status: ', currentStatus)
  // }, 3000)

  // try {
  //   await messenger.waitForMessageStatus(
  //     sendTx.transactionHash,
  //     MessageStatus.READY_FOR_RELAY
  //   )
  // } finally {
  //   clearInterval(finalizeInterval)
  // }

  // const tx = await messenger.finalizeMessage(sendTx.transactionHash)
  // const receipt = await tx.wait()
  // console.log('\nFinalized message tx', receipt.transactionHash)
  // console.log('Finalized withdrawal')
  // console.log('receipt' , receipt)
  //===================================
  //--
  console.log("===============" )
  console.log("attackContract : ", attackContract.address )
  console.log("tonContract : ", tonContract.address )
  console.log("l1BridgeContract : ", l1BridgeContract.address )
  console.log("l1CrossDomainMessengerContract : ", l1CrossDomainMessengerContract.address )
  console.log("OptomismPortalContract : ", OptomismPortalContract.address )
  console.log("1l1Wallet : ", l1Wallet.address )

  console.log("l2StandardBridge : ", l2StandardBridge )
  console.log("l2CrossDomainMessengerContract : ", l2CrossDomainMessengerContract.address )
  console.log("===============" )

  //--
  const topic00 = attackContract.interface.getEventTopic('AttackXDomainMessageSender');
  const log00 = receipt.logs.find(x => x.topics.indexOf(topic00) >= 0);
  const deployedEvent00 = attackContract.interface.parseLog(log00);
  // console.log('AttackBalance', deployedEvent1)
  console.log('AttackXDomainMessageSender', deployedEvent00?.args)

  //--
  const topic0 = attackContract.interface.getEventTopic('AttackTarget');
  const log0 = receipt.logs.find(x => x.topics.indexOf(topic0) >= 0);
  const deployedEvent0 = attackContract.interface.parseLog(log0);
  // console.log('AttackBalance', deployedEvent1)
  console.log('AttackTarget', deployedEvent0?.args)

  //--
  const topic1 = attackContract.interface.getEventTopic('AttackedRelayMessage');
  const log1 = receipt.logs.find(x => x.topics.indexOf(topic1) >= 0);
  const deployedEvent1 = attackContract.interface.parseLog(log1);
  // console.log('AttackBalance', deployedEvent1)
  console.log('AttackedRelayMessage deployedEvent1.args', deployedEvent1?.args)


  //---
  const allowance = await tonContract.allowance(
    l1CrossDomainMessengerContract.address, l1Wallet.address)
  console.log("** allowance ", allowance.toString())

  const tonBalance = await tonContract.balanceOf(l1Wallet.address)
  const ethBalance = await l1Wallet.getBalance()
  console.log("** tonBalance ", tonBalance.toString())
  console.log("** ethBalance ", ethBalance.toString())

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  await differenceLog(beforeBalances, afterBalances)

  // console.log("==== tonContract.transferFrom ===========" )

  // const tx1 = await (await tonContract.transferFrom(
  //   l1CrossDomainMessengerContract.address, l1Wallet.address, amount)
  // ).wait()

  // const afterBalances1 = await getBalances(
  //   l1Wallet,
  //   l2Wallet,
  //   tonContract,
  //   l2EthContract,
  //   l1BridgeContract,
  //   l1CrossDomainMessengerContract,
  //   OptomismPortalContract
  // )

  // await differenceLog(beforeBalances, afterBalances1)
  */
}

const messenger_10_approveAndCallWithMessage_L1_TO_L2 = async (
  amount: BigNumber
) => {
  console.log('\n==== messenger_10_approveAndCallWithMessage_L1_TO_L2  ====== ')

  const beforeBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  const hello_prev = await getMessageOfHello(helloContractL1)
  const message = 'hi. from L1:' + hello_prev.blockNumber

  const tonBalanceHelloL2_prev = await l2Wallet.provider.getBalance(
    helloContractL2.address
  )

  const callData = await helloContractL2.interface.encodeFunctionData(
    'sayPayable',
    [message]
  )

  const _gasLimit = callData.length * 16 + 21000
  console.log('_gasLimit', _gasLimit)

//   const data = ethers.utils.solidityPack(
//     ['address', 'uint32', 'bytes'],
//     [helloContractL2.address, _gasLimit * 3, callData]
//   )

  const data = ethers.utils.solidityPack(
    ['address', 'address', 'uint256', 'uint32', 'bytes'],
    [l1Wallet.address, helloContractL2.address, amount.toString(),  _gasLimit * 3, callData]
  )

  // const unpackOnApproveData1 = await l1CrossDomainMessengerContract["unpackOnApproveData1(bytes)"](data)
  // console.log('unpackOnApproveData1', unpackOnApproveData1)

  const sendTx = await (
    await tonContract
      .connect(l1Wallet)
      .approveAndCall(l1CrossDomainMessenger, amount, data)
  ).wait()
  console.log('\napproveAndCallTx:', sendTx.transactionHash)

  // // const topic = l1CrossDomainMessengerContract.interface.getEventTopic('SentMessage');
  // // const topic1 = l1CrossDomainMessengerContract.interface.getEventTopic('SentMessageExtension1');
  // // const topic2 = OptomismPortalContract.interface.getEventTopic('TransactionDeposited');

  // // await logEvent(sendTx, topic, l1CrossDomainMessengerContract , 'SentMessage ' );
  // // await logEvent(sendTx, topic1, l1CrossDomainMessengerContract , 'SentMessageExtension1 ' );
  // // await logEvent(sendTx, topic2, OptomismPortalContract , 'TransactionDeposited ' );

  await messenger.waitForMessageStatus(
    sendTx.transactionHash,
    MessageStatus.RELAYED
  )

  const afterBalances = await getBalances(
    l1Wallet,
    l2Wallet,
    tonContract,
    l2EthContract,
    l1BridgeContract,
    l1CrossDomainMessengerContract,
    OptomismPortalContract
  )

  await differenceLog(beforeBalances, afterBalances)

  const hello_after = await getMessageOfHello(helloContractL2)

  console.log('hello_after.message', hello_after.message)
  console.log('message', message)

  if (hello_after.message.localeCompare(message) === 0) {
    console.log('.. success sendMessage !! ')
  } else {
    console.log('.. fail sendMessage !! ')
  }

  const tonBalanceHelloL2_after = await l2Wallet.provider.getBalance(
    helloContractL2.address
  )

  console.log(
    'L2 ContracT TON Changed : ',
    ethers.utils.formatEther(
      tonBalanceHelloL2_after.sub(tonBalanceHelloL2_prev)
    )
  )
}

const faucet = async (account: Wallet, amount: BigNumber) => {
  await (await tonContract.connect(account).faucet(amount)).wait()

  const l1TONTotalSupply = await tonContract.totalSupply()
  console.log(
    'l1 ton total supply:',
    ethers.utils.formatEther(l1TONTotalSupply)
  )
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

const main = async () => {
  await setup()
  // await faucet(l1Wallet, ethers.utils.parseEther('100'))

  const depositAmount = ethers.utils.parseEther('2')
  const withdrawAmount = ethers.utils.parseEther('1')

  // 1. deposit TON L1 to L2
  // 2. withdraw TON L2 to L1
  // 4. send message L1 to L2
  // 5. send message L2 to L1
  // 6. sendNativeTokenMessage
  // 7. suggestion : multi sendNativeTokenMessage
  // 8. deposit ETH L1 to L2 -> Ether input failed in L1. check revert
  // 9. withdraw nativeToken L2 to L1
  // 10. functionCallWithNativeToken with OnApprove L2 to L1

  await messenger_1_depositTON_L1_TO_L2(depositAmount.add(depositAmount))

//   helloContractL1 = await deployHello(hardhat, l1Wallet)
//   helloContractL2 = await deployHello(hardhat, l2Wallet)

//   await messenger_2_depositTON_L1_TO_L2(depositAmount.add(depositAmount))

//   await bridge_2_withdrawTON_L2_TO_L1(withdrawAmount)

//   await messenger_4_sendMessage_L1_TO_L2()
//   await messenger_5_sendMessage_L2_TO_L1()

//   await messenger_6_sendNativeTokenMessage_L1_TO_L2(depositAmount)
//   await messenger_6_sendNativeTokenMessage_L1_TO_L2(ethers.constants.Zero)
//   await messenger_7_sendNativeTokenMessages_L1_TO_L2(depositAmount)

//   await messenger_8_depositETH_L1_TO_L2(depositAmount)

//  await messenger_9_withdrawNativeToken_L2_TO_L1(depositAmount)

//  await messenger_9_1_withdrawNativeToken_L2_TO_L1(depositAmount)
//  await messenger_9_1_withdrawNativeToken_L2_TO_L1(depositAmount)

// await messenger_9_2_withdrawNativeToken_L2_TO_L1(depositAmount)

// await messenger_9_3_withdrawNativeToken_L2_TO_L1(depositAmount)


// await messenger_9_4_withdrawNativeToken_L2_TO_L1(depositAmount)


//   await messenger_10_approveAndCallWithMessage_L1_TO_L2(depositAmount)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})