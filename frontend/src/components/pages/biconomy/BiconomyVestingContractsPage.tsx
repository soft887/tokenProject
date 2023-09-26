import React, { FC, useEffect, useState } from "react";
import DashboardPageLayout from "../../layout/DashboardPageLayout";
import * as BiconomyVesting from "../../../thirdparty/contracts/biconomy/Vesting.json";
import { Address } from "../../../utils/types";
import { Duration, format as formatDate, add as addDate, parseISO as parseISODate, formatDistance as formatDateDistance } from 'date-fns';
import { useMoralis } from "react-moralis";
import { BigNumber, ethers } from "ethers";
import { DATETIME_FORMAT } from "../../../settings";
import { Card, CardContent, CardHeader, CircularProgress, Typography } from "@mui/material";

export type BiconomyVestingContractsPageProps = {
    
}
type BiconomyClaimInfo = {
    isActive: boolean;
    vestAmount: string;
    unlockAmount: string;
    unlockTimestamp: number;
    startTimestamp: number;
    endTimestamp: number;
    amountClaimed: string;
    claimableAmount: string;
}

type BiconomyContractInfo = {
    contractType: 'Biconomy';
    claims: {
        [k: Address]: BiconomyClaimInfo;
    }
}

const formatBNTs = (ts: BigNumber) => formatDate(new Date(BigNumber.from(ts).toNumber() * 1000), DATETIME_FORMAT);

const BiconomyVestingContractsPage: FC<BiconomyVestingContractsPageProps> = () => {

    const {Moralis, user, web3: web3Provider } = useMoralis();

    const [contractInfo, setContractInfo] = useState<BiconomyContractInfo | null>(null);

    const addresses = ['0x12cee171ddd233b38f5cac9e0646d5be39b847da']

    const readBiconomyContractInfo = async (selectedContractAddress: Address, referenceAddresses: Address[]) => {
        const mainnetProvider = new ethers.providers.JsonRpcProvider('https://speedy-nodes-nyc.moralis.io/476f8ed27ca8c180ebc32f48/eth/mainnet');
        
        // const TestBiconomyVestingContract = new ethers.ContractFactory(BiconomyVesting.abi, BiconomyVesting.bytecode, signer);                
        // const biconomyContract = await TestBiconomyVestingContract.deploy(tokenContract.address);
        // addExistingVestingContract(biconomyContract.address, {address: tokenContract.address});
        // console.log('deployed a toy biconomy contract to ', biconomyContract.address)

        // const biconomyContract = new ethers.Contract(selectedContractAddress, BiconomyVesting.abi, signer);
        // TODO: remove this - getting biconomy off a different chain
        const biconomyContract = new ethers.Contract(selectedContractAddress, BiconomyVesting.abi, mainnetProvider);

            
        const claimsInfoTupleP = referenceAddresses.map(async address => {

            // window.biconomy = biconomyContract; window.ownAddress = fakeOwnAddress;
            const claimableAmountP = biconomyContract.claimableAmount(address);
            
            const claimInfo = await biconomyContract.getClaim(address);
            const {isActive, vestAmount, unlockAmount, unlockTime, startTime, endTime, amountClaimed} = claimInfo;
            
            const outClaimInfo: BiconomyClaimInfo = {
                isActive, 
                vestAmount: vestAmount.div(Math.pow(10,9)).div(Math.pow(10,9)).toString(), 
                unlockAmount: unlockAmount.div(Math.pow(10,9)).div(Math.pow(10,9)).toString(), 
                unlockTimestamp: unlockTime,
                startTimestamp: startTime,
                endTimestamp: endTime,
                amountClaimed: amountClaimed.div(Math.pow(10,9)).div(Math.pow(10,9)).toString(),

                claimableAmount: (await claimableAmountP).toString()
            };

            return [address, outClaimInfo] ;
        });
        
        const claims = Object.fromEntries(await Promise.all(claimsInfoTupleP));

            // const schedule = [];
            // const dt = (new Date() > endTime) ? endTime : new Date();

            // // if(unlockTime < dt) {
            // //     claimAmount = _claim.vestAmount.mul(claimPercent).div(1e18).add(
            // //         _claim.unlockAmount
            // //     );
            // // }
            // if(startTime < dt) {
            //     const totalPeriodLength = endTime.sub(startTime).toNumber();
            //     const passedPeriodLength = dt - startTime.toNumber() * 1000;
            //     const claimPercent = passedPeriodLength / totalPeriodLength;
            //     const claimAmount = vestAmount.mul(claimPercent).div(Math.pow(10, 18)).toNumber();
            //     // const unclaimedAmount = claimAmount.sub(_claim.amountClaimed);
            // }

        const contractInfo: BiconomyContractInfo = {
            contractType: 'Biconomy',
            claims
        };
        return contractInfo;
    }

    useEffect( () => {
        // if(selectedContractAddress === BiconomyVesting.addresses.mainnet[0]) 
        readBiconomyContractInfo(BiconomyVesting.addresses.mainnet[0], addresses).then(setContractInfo);
    }, [])


    return <DashboardPageLayout>
         <Card>
            <CardHeader title="Biconomy Vesting Contracts" />
            <CardContent>
                <Typography>Addresses:</Typography>
                <pre>{addresses.join("\n - ")}</pre>
                {contractInfo && <pre>{JSON.stringify(contractInfo, null, 4)}</pre>}
                {!contractInfo && <CircularProgress />}
            </CardContent>
        </Card>
    </DashboardPageLayout>
}

export default BiconomyVestingContractsPage;