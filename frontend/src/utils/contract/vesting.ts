import ERC20Token from "@vtvl/openzeppelin-artifacts/token/ERC20/ERC20.sol/ERC20.json";
import { Address, VestingContractInfo, ClaimInfo } from "../types";
import { BigNumber,  Contract, ethers } from "ethers";
import { addSeconds } from "date-fns";
import VTVLVesting from "@vtvl/contracts/VTVLVesting.sol/VTVLVesting.json";
import { standardizeChainId } from "./chain";

export const loadVestingContractMetadataFromContract = async (vestingContract: Contract, tokenContract: Contract): Promise<VestingContractInfo> => {
    // Launch all the promises at once
    const contractBalance = tokenContract.balanceOf(vestingContract.address);
    const numVestingRecipients = vestingContract.numVestingRecipients();
    const vestingRecipients = vestingContract.allVestingRecipients();
    const numTokensReservedForVesting = vestingContract.numTokensReservedForVesting();
    // const numSchedules = vestingContract.numSchedules();

    // And then await them in parallel
    return {
        chainId: standardizeChainId((await vestingContract.provider.getNetwork()).chainId),
        address: vestingContract.address,
        tokenAddress: tokenContract.address,
        
        // These two should be small enough to be usable as numbers
        // numSchedules: (await numSchedules).toNumber(), // num schedules === numvestingrecipients 
        numVestingRecipients: (await numVestingRecipients).toNumber(),

        // Things that have to do with balance have to be serialized to strings, otherwise redux will complain
        contractBalance: (await contractBalance).toString(),
        numTokensReservedForVesting: (await numTokensReservedForVesting).toString(),

        metadataLoadStatus: 'loaded',

        claims: {},
        claimsLoadStatus: 'not-loaded',


        vestingRecipients: await vestingRecipients,
        vestingRecipientsLoadStatus: 'loaded-full'
    };
}

export const deployVestingContract = async (token: Address | Contract, signer: ethers.providers.JsonRpcSigner, afterDeployAction?: (() => void)) => {
    console.log("Deploying the contracts with the account:", await signer.getAddress() );
    console.log("Account balance:", (await signer.getBalance()).toString());

    const tokenContract = (token instanceof ethers.Contract) ? token : new ethers.Contract(token, ERC20Token.abi, signer);

    // We get the contract to deploy
    console.log(`Vesting contract - preparing to deploy for token at address: ${tokenContract.address}.`);
    const VTVLVestingFactory = ethers.ContractFactory.fromSolidity(VTVLVesting, signer);
    const vestingContract = await VTVLVestingFactory.deploy(tokenContract.address);
    afterDeployAction?.();
    console.log(`vestingContract initialized on ${vestingContract.address}, waiting to be deployed...`);
    await vestingContract.deployed();
    console.log("Deployed a vesting contract to:", vestingContract.address);

    return vestingContract;
}

// repeating the contract logic.
// Alternatively, we can calculate that from the contract
export const calculateVestingProperties = (claimInfo: ClaimInfo) => {
    const refTs = Math.floor(new Date().getTime() / 1000);

    const timeUntilMaturitySecs = Math.max(claimInfo.endTimestamp - refTs, 0);
    const startDate = new Date(claimInfo.startTimestamp * 1000);
    const endDate = new Date(claimInfo.endTimestamp * 1000);
    const cliffReleaseDate = new Date(claimInfo.cliffReleaseTimestamp * 1000);
    const timeFromLinearVestingBeginSecs = Math.max(Math.min(refTs, claimInfo.endTimestamp) - claimInfo.startTimestamp, 0);

    const truncatedTimeFromLinearVestingBeginSecs = Math.floor(timeFromLinearVestingBeginSecs / claimInfo.releaseIntervalSecs) * claimInfo.releaseIntervalSecs;
    const fractionCurrentReleasePeriod = (timeFromLinearVestingBeginSecs % claimInfo.releaseIntervalSecs) / claimInfo.releaseIntervalSecs;

    const totalVestingDurationSecs = claimInfo.endTimestamp - claimInfo.startTimestamp;

    let cliffAmountBN = BigNumber.from((refTs > claimInfo.startTimestamp) ? claimInfo.cliffAmount : 0);

    // Normally, we calculate using the truncated truncatedTimeFromLinearVestingBeginSecs
    const linearVestedBN = BigNumber.from(truncatedTimeFromLinearVestingBeginSecs).mul(claimInfo.linearVestAmount).div(totalVestingDurationSecs);
    
    // 
    const linearVestedWithoutTruncateBn = BigNumber.from(timeFromLinearVestingBeginSecs).mul(claimInfo.linearVestAmount).div(totalVestingDurationSecs);
    

    // streamedAmountBn += fractionVested * linearVestAmount 
    // but have to write it like timeFromLinearVestingBegin * linearVestAmount / totalVestingDurationSecs, to do division at the end
    const streamedAmountBN = cliffAmountBN.add(linearVestedBN);
    
    const totalAllocationBN = BigNumber.from(claimInfo.cliffAmount).add(claimInfo.linearVestAmount);
    const totalAllocation = totalAllocationBN.toString();
    
    // This is the amount that would be streamed if the linear release frequency didn't exist
    const rawStreamedAmountBN = cliffAmountBN.add(linearVestedWithoutTruncateBn);
    
    const canWithdrawAmount = streamedAmountBN.sub(BigNumber.from(claimInfo.amountWithdrawn)).toString();

    // Amount that hasn't even begun to vest
    const untouchedAmount = totalAllocationBN.sub(rawStreamedAmountBN).toString();

    // Unvested is everything that hasn't been streamed thus far
    const unvestedAmount = totalAllocationBN.sub(streamedAmountBN);

    const vestedInOneIntervalBN = BigNumber.from(claimInfo.linearVestAmount).mul(claimInfo.releaseIntervalSecs).div(totalVestingDurationSecs);

    const currentIntervalStreamedBN = rawStreamedAmountBN.sub(streamedAmountBN);
    
    const currentIntervalNotStreamedBN = vestedInOneIntervalBN.add(linearVestedBN);

    let nextUnlockDate;
    const refDate = new Date();
    if(refDate < cliffReleaseDate) {
        nextUnlockDate = cliffReleaseDate;
    } 
    else if(refDate < startDate) {
        nextUnlockDate = startDate;
    }
    else if(refDate > endDate) {
        nextUnlockDate = null;
    }
    else { // here, we're between start and end date
        nextUnlockDate = addSeconds(startDate, truncatedTimeFromLinearVestingBeginSecs + claimInfo.releaseIntervalSecs);
    }

    return {
        // fractionVested,
        streamedAmount: streamedAmountBN.toString(),
        timeUntilMaturitySecs,
        startDate,
        endDate,
        cliffReleaseDate,
        timeFromLinearVestingBeginSecs,
        totalVestingDurationSecs,
        withdrawnAmount: claimInfo.amountWithdrawn,
        canWithdrawAmount,
        totalAllocation,
        untouchedAmount,
        unvestedAmount,
        fractionCurrentReleasePeriod,
        rawStreamedAmount: rawStreamedAmountBN.toString(),
        currentIntervalStreamed: currentIntervalStreamedBN.toString(),
        currentIntervalNotStreamed: vestedInOneIntervalBN.toString(),
        nextUnlockDate
    }
}


// export const getPendingClaimFromClaimTemplate = (claimTemplate: ClaimTemplate, referenceDate: Date = new Date()) => {
//     const {isTimestampRelative, label, ...claimInfo} = claimTemplate;
//     if(isTimestampRelative) {
//         const refTs = Math.floor((referenceDate.getTime()) / 1000);
//         if(claimInfo.startTimestamp)        claimInfo.startTimestamp += refTs;
//         if(claimInfo.endTimestamp)          claimInfo.endTimestamp += refTs;
//         if(claimInfo.cliffReleaseTimestamp) claimInfo.cliffReleaseTimestamp += refTs;
//     }
//     return claimInfo;
// }

// export const getClaimTemplateFromPendingClaim = (pendingClaimInfo: ClaimInfo, label: string, contractAddress: Address): PendingClaimTemplate => {
//     const {startTimestamp, endTimestamp, cliffReleaseTimestamp, releaseIntervalSecs, cliffAmount, linearVestAmount} = pendingClaimInfo;
//     const refTs = Math.floor((new Date()).getTime() / 1000);
//     return {
//         // contractAddress,
//         label,
//         isTimestampRelative: true,
//         startTimestamp: startTimestamp - refTs, 
//         endTimestamp: endTimestamp - refTs, 
//         cliffReleaseTimestamp: cliffReleaseTimestamp - refTs, 
//         releaseIntervalSecs, 
//         cliffAmount, 
//         linearVestAmount
//     }
// }
// export const fetchVestingClaimInfo = async (vestingContract: Contract, walletAddress: Address): Promise<CalculatedClaimInfo>  => {
    
//     const referenceTs = Math.floor((new Date()).getTime() / 1000);

//     // streamed - vested till right now
//     const streamedAmountP = vestingContract.vestedAmount(walletAddress, referenceTs); 
//     const scheduleLinkP = vestingContract.scheduleLinks(walletAddress) 
    
    
//     // withdrawn is simply the amount withdrawn
//     const withdrawnAmountBN = (await scheduleLinkP).amountWithdrawn;
//     const streamedAmountBN = await streamedAmountP;

//     // Try to get the expiry. If the expiry exists, use it as a final vesting date calculation
//     // Else, use a date 1000 years from now
//     const expiryTimestamp = (await scheduleLinkP).scheduleExpiryTimestamp;

//     const fullAmountVestedTimestamp = (expiryTimestamp > 0) ? expiryTimestamp : Math.floor(addYears(referenceTs, 1000).getTime() / 1000);

//     const maxVestedAmountP = vestingContract.vestedAmount(walletAddress, fullAmountVestedTimestamp);
//     const totalPlannedVestedAmountBN = await maxVestedAmountP;
    
//     const ci = {
//         streamedAmount: streamedAmountBN.toString(),
//         withdrawnAmount: withdrawnAmountBN.toString(),
//         totalPlannedVestedAmount: totalPlannedVestedAmountBN.toString(),
//         canWithdrawAmount: streamedAmountBN.sub(withdrawnAmountBN).toString(),

//         fullAmountVestedTimestamp,
//         expiryTimestamp
//     }
//     return ci;
// }