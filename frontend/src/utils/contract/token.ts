import ERC20Token from "@vtvl/openzeppelin-artifacts/token/ERC20/ERC20.sol/ERC20.json";
import { Address, TokenInfo } from "../types";
import { utils, Contract, BigNumberish } from "ethers";
import { standardizeChainId } from "./chain";

export const loadTokenMetadataFromContract = async (tokenContract: Contract): Promise<TokenInfo> => {
    // Launch all the promises at once
    const tokenName = tokenContract.name();
    const symbol = tokenContract.symbol();
    const decimals = tokenContract.decimals();
    const totalSupply = tokenContract.totalSupply();

    // And then await them in parallel
    return {
        chainId: standardizeChainId((await tokenContract.provider.getNetwork()).chainId),
        name: await tokenName,
        symbol: await symbol,
        address: tokenContract.address,
        decimals: await decimals, 
        totalSupply: (await totalSupply).toString(),
    };
}

export const formatTokenAmount = (amount: BigNumberish, tokenMeta: Partial<Pick<TokenInfo, 'symbol'|'decimals'>>|null=null, options: {showSymbol?: boolean, outputDecimals?: number} = {}) => {
    // const decimals = tokenMeta?.decimals ?? 0;
    const {
        outputDecimals = 2,
        showSymbol = true 
    } = options;
    const value = utils.formatUnits(amount, tokenMeta?.decimals);
    const fmtVal = parseFloat(value).toFixed(outputDecimals);
    return showSymbol ? `${fmtVal} ${tokenMeta?.symbol}` : fmtVal;
}


export const parseTokenAmount = (amountTokens: string|number, tokenMeta: Partial<Pick<TokenInfo, 'decimals'>>|null=null) => {
    return utils.parseUnits(amountTokens.toString(), tokenMeta?.decimals).toString();
}