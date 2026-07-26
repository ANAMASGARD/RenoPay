import fs from 'node:fs';
import process from 'node:process';
import solc from 'solc';
import { ContractFactory, JsonRpcProvider, Wallet } from 'ethers';

const privateKey = process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY;
if (!privateKey) throw new Error('SEPOLIA_DEPLOYER_PRIVATE_KEY is not set');
const source = fs.readFileSync(new URL('../contracts/src/RenoPayMatchRegistry.sol', import.meta.url), 'utf8');
const output = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources: { 'RenoPayMatchRegistry.sol': { content: source } }, settings: { viaIR: true, optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } })));
const errors = (output.errors ?? []).filter((item) => item.severity === 'error');
if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join('\n'));
const artifact = output.contracts['RenoPayMatchRegistry.sol'].RenoPayMatchRegistry;
const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com');
const wallet = new Wallet(privateKey, provider);
const usdt = '0xd077a400968890eacc75cdc901f0356c943e4fdb';
const factory = new ContractFactory(artifact.abi, `0x${artifact.evm.bytecode.object}`, wallet);
const contract = await factory.deploy(usdt);
const deployment = await contract.deploymentTransaction().wait();
console.log(JSON.stringify({ address: await contract.getAddress(), blockNumber: deployment.blockNumber }));
