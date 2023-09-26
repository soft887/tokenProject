import { Duration, add as addDate } from 'date-fns';
import { BigNumber, utils } from "ethers";
import { Address, AddVestingClaimDto, ClaimInfo } from './types';

export type CalcScheduleParams = {
    linearVestStartTime: Date;
    linearVestEndTime: Date;
    cliffReleaseTime: Date | null;
    releaseInterval: Duration;
    linearVestedAmountTokens: number; // amount in full tokens,not wei
    cliffAmountTokens: number; // amount in full tokens,not wei
    unitDecimals: number;
    tokenPrecision?: number; // Which precision should we use to avoid rounding errors
}

/**
 * Convert the date to UNIX timestamp (in seconds), as suitable for the smart contract.
 * @param dt 
 * @returns 
 */
export const dateToAbsoluteTimestampSecs = (dt: Date) =>  Math.ceil(dt.getTime() / 1000);

/**
 * Convert the UNIX timestamp (as stored in the contract), to a proper Date.
 * @param ts 
 * @returns 
 */
export const timestampToDate = (ts: number) =>  {
    // If the TS is so small it's less than 50 times the current timestamp in ms, then we're likely dealing with TS in seconds
    if(ts < (new Date().getTime() / 50)) {
        return new Date(Math.floor(ts * 1000));
    }
    else { // else, we're dealing with regular JS timestamp
        return new Date(ts);
    }
}

/**
 * Calculate the ClaimInfo based on the input parameters (with the proper conversion to contract-ready data). Note that 
 * we might need to have another conversion function in front of this one (depending on the form being used).
 * @param params 
 * @returns 
 */
export const calculatePendingClaimInfo = (params: CalcScheduleParams): ClaimInfo => {
     
    const {
        linearVestStartTime: startTime, 
        linearVestEndTime: endTime, 
        cliffReleaseTime, 
        releaseInterval, 
        cliffAmountTokens: cliffAmount,
        // cliffDuration = null, 
        // releaseFraction,
        linearVestedAmountTokens: totalAmountTokens,
        unitDecimals,
        tokenPrecision = 5,
    } = params;

    const releaseIntervalSecs = dateToAbsoluteTimestampSecs(addDate(new Date(0), releaseInterval));

    const claimInfo = {
        startTimestamp: dateToAbsoluteTimestampSecs(startTime),
        endTimestamp: dateToAbsoluteTimestampSecs(endTime),
        cliffReleaseTimestamp: (cliffReleaseTime !== null) ? dateToAbsoluteTimestampSecs(cliffReleaseTime) : 0,
        releaseIntervalSecs, // Every how many seconds does the vested amount increase. 
        linearVestAmount: utils.parseUnits(totalAmountTokens.toFixed(tokenPrecision), unitDecimals).toString(), // total entitlement
        cliffAmount: utils.parseUnits(cliffAmount.toFixed(tokenPrecision), unitDecimals).toString(), // how much is released at the cliff,
        amountWithdrawn: BigNumber.from(0).toString(),
        isActive: true
    } // as AddVestingClaimDto;

    return claimInfo;
}

/**
 * Convert a claim to an array that can be used in the contract call. This only orders the named parameters into an array.
 * @param recipientAddress 
 * @param pendingClaimInfo 
 * @returns 
 */
export const claimToContractDto = (recipientAddress: Address, pendingClaimInfo: ClaimInfo) : AddVestingClaimDto => {
    const {
        startTimestamp,
        endTimestamp,
        cliffReleaseTimestamp, 
        releaseIntervalSecs, // Every how many seconds does the vested amount increase. 
        linearVestAmount, // total entitlement
        cliffAmount, // how much is released at the cliff
    } = pendingClaimInfo;
    
    return  [
        recipientAddress,
        startTimestamp,
        endTimestamp,
        cliffReleaseTimestamp,
        releaseIntervalSecs, // Every how many seconds does the vested amount increase. 
        BigNumber.from(linearVestAmount), // total entitlement
        BigNumber.from(cliffAmount), // how much is released at the cliff
    ];
}

export const batchScheduleToContractDto = (recipientAddresses: Address[], pendingClaimInfo: ClaimInfo) => {
    // Create a claimDTO without the recipient address inside, and then replicate it the appropriate number of times (recipientAddresses.length times) 
    const claimDtoWithoutAddress = claimToContractDto(recipientAddresses[0], pendingClaimInfo).slice(1);
    return [recipientAddresses, ...claimDtoWithoutAddress.map(claimParam => Array(recipientAddresses.length).fill(claimParam))];
}

const splitCamelCaseToWords = (stringValue: string) => stringValue.replace(/([A-Z]+)/g, " $1").replace(/([A-Z][a-z])/g, " $1").replace(/\s+/g, ' ');

export const wordsToTitleCase = (words: string[]) => words.map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(' ')

export const camelToTitleCase = (str: string) => wordsToTitleCase(splitCamelCaseToWords(str).toLowerCase().split(/\s+/g).filter(x=>x.length > 0));

export const sleep = (timeoutMs: number) => new Promise(resolve => {
    setTimeout(() => resolve(null), timeoutMs);
});

export const removeComma = (num: number) => num.toString().replaceAll(",", "")
export const removeCommaFromString = (str: string) => str.replaceAll(",", "")
export const copyText = (txt: string) => {
    var textField = document.createElement('textarea')
    textField.innerText = txt
    document.body.appendChild(textField)
    textField.select()
    document.execCommand('copy')
    textField.remove()
}
