import { isDebug, NODE_TYPE } from "../settings";
import { Chain } from "./types";

// We will have Mainnet/testnet/devnet, with each one having at most one of each

// These are only actually used to add newtork to user's metamask
const MAINNET_ETHEREUM_NODE_URL = 'https://speedy-nodes-nyc.moralis.io/476f8ed27ca8c180ebc32f48/eth/mainnet';
// const MAINNET_BSC_NODE_URL = 'https://bsc-dataseed.binance.org/';
const MAINNET_BSC_NODE_URL = 'https://speedy-nodes-nyc.moralis.io/476f8ed27ca8c180ebc32f48/bsc/mainnet';
const MAINNET_POLYGON_NODE_URL = 'https://speedy-nodes-nyc.moralis.io/476f8ed27ca8c180ebc32f48/polygon/mainnet'

const TESTNET_ETHEREUM_NODE_URL = 'https://speedy-nodes-nyc.moralis.io/476f8ed27ca8c180ebc32f48/eth/goerli';
// const TESTNET_BSC_NODE_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const TESTNET_BSC_NODE_URL = 'https://speedy-nodes-nyc.moralis.io/476f8ed27ca8c180ebc32f48/bsc/testnet';
const TESTNET_POLYGON_NODE_URL = 'https://speedy-nodes-nyc.moralis.io/476f8ed27ca8c180ebc32f48/polygon/mumbai';

const nativeCurrencyDef = (symbol: string, name?: string, decimals: number = 18) => ({
    name: name ?? symbol,
    symbol,
    decimals
});

// The RPC URL config is only actually useful when the user doesn't have the network already configured
// TODO: Revise whether this should be structured like this - this is however not rapidly changing data

const MainnetChainList: Chain[] =  [
    {
        chainSymbol: 'bsc',
        chainName: 'Binance Smart Chain',
        chainId: '0x38',
        // https://bscscan.com
        nativeCurrency: nativeCurrencyDef('BNB'),
        // rpcUrls: ['https://bsc-dataseed.binance.org/'], 
        rpcUrls: [MAINNET_BSC_NODE_URL], 
        // rpcUrls: ['https://speedy-nodes-nyc.moralis.io/476f8ed27ca8c180ebc32f48/bsc/mainnet'], 
        blockExplorerUrls: ['https://bscscan.com'],
    
    },
    {
        chainSymbol: 'ethereum',
        nativeCurrency: nativeCurrencyDef('ETH'),
        chainName: 'Ethereum',
        chainId: '0x1',
        rpcUrls: [MAINNET_ETHEREUM_NODE_URL],
    },
    {
        chainSymbol: 'polygon',
        chainName: 'Polygon',
        chainId: '0x89',
        nativeCurrency: nativeCurrencyDef('MATIC'),
        rpcUrls: [MAINNET_POLYGON_NODE_URL],
        blockExplorerUrls: ['https://polygonscan.com'],
    },
];

const TestnetChainList: Chain[] =  [
    {
        chainSymbol: 'goerli',
        chainName: 'Ethereum (Goerli Testnet)',
        chainId: '0x5',
        rpcUrls: [TESTNET_ETHEREUM_NODE_URL],
        nativeCurrency: nativeCurrencyDef('ETH'),
    },
    {
        chainSymbol: 'bsc testnet',
        chainName: 'Binance Smart Chain (Testnet)',
        chainId: '0x61',
        nativeCurrency: nativeCurrencyDef('BNB'),
        rpcUrls: [TESTNET_BSC_NODE_URL], 
        blockExplorerUrls: ['https://testnet.bscscan.com'],
    },
    {
        chainSymbol: 'mumbai',
        chainName: 'Polygon (Mumbai Testnet)',
        chainId: '0x13881',
        nativeCurrency: nativeCurrencyDef('MATIC'),
        rpcUrls: [TESTNET_POLYGON_NODE_URL],
        blockExplorerUrls: ['https://mumbai.polygonscan.com'],
    },
];




export const DevNodeChainList: Chain[] = [
    {
        // TODO: this configuration probably shouldn't be here. Ignoring it since it has an invalid symbol
        // @ts-expect-error
        chainSymbol: 'vtvl-dev',
        chainName: 'VTVL Dev Chain',
        chainId: '0x4d2', // Explicitly set
        rpcUrls: ['http://3.67.134.134:8545'],
        nativeCurrency: nativeCurrencyDef('ETH'),
    },
    {
        // TODO: this configuration probably shouldn't be here
        // @ts-expect-error
        chainSymbol: 'vtvl-dev-2',
        chainName: 'VTVL Dev Chain 2',
        chainId: '0x4d3', // Explicitly set - 1235
        rpcUrls: ['http://3.67.134.134:8546'],
        nativeCurrency: nativeCurrencyDef('ETH'),
    },
];

if(isDebug) {
    DevNodeChainList.push({
        chainSymbol: 'dev', // showing different symbols for reference
        chainName: 'Local Dev Chain',
        chainId: '0x539',
        rpcUrls: ['http://localhost:8545'],
        nativeCurrency: nativeCurrencyDef('ETH'),
    });
}


export const SupportedChainList = 
        (NODE_TYPE === 'dev') ? DevNodeChainList 
                              : (NODE_TYPE === 'mainnet' ? MainnetChainList 
                                                         : TestnetChainList);