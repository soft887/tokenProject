import { SupportedChainList } from "../chainDefinitions";
import { Chain } from "../types";

export const lookupChainMeta = (lookupChainId: Chain['chainId']) => {
    const matches = SupportedChainList.filter(({chainId}) => chainId === lookupChainId);
    if(matches.length > 1) {
        throw new Error(`Invalid chain configuration, multiple chains match chainId = '${lookupChainId}'.`)
    }
    if(matches.length === 0) {
        throw new Error(`Invalid chain configuration, no chain matches chainId = '${lookupChainId}'.`)
    }
    return matches[0];
}

// This is required because the data needs to be stored as either number or string on Moralis' side, and Moralis' chainId returns a string
export const standardizeChainId = (chainId: string|number, options: {verifyValidChainId?: boolean}={}) => {
    const {
        verifyValidChainId = true
    } = options;

    let resultChainId;
    if(typeof chainId === 'number') {
        resultChainId = '0x' + chainId.toString(16);
    } 
    else {
        if(chainId.startsWith('0x')) {
            resultChainId = chainId;
        }
        else {

            resultChainId = '0x' + (+chainId).toString(16);
        }
    }

    // Try to look it up, and throw if invalid
    if(verifyValidChainId) {
        try {
            lookupChainMeta(resultChainId);
        }
        catch {
            throw new Error(`Invalid chain ID: '${chainId}'`)
        }
    }

    return resultChainId;

}