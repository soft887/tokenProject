import React, { FC, useEffect, useState } from "react";
import { Typography, Button, Card, CardContent, Table, TableHead, TableRow, TableBody, TableCell, Dialog, DialogTitle, CircularProgress, DialogContent, Stack, DialogActions } from "@mui/material";
import DashboardPageLayout from "../layout/DashboardPageLayout";
import { useMoralis } from "react-moralis";
import { format as formatDate } from 'date-fns';
import { useParams } from "react-router";
import { useSelector } from "react-redux";
import { fetchClaims, selectSingleVestingContractFull } from "../../store/vestingSlice";
import { DATETIME_FORMAT } from "../../settings";
import { formatTokenAmount } from "../../utils/contract/token";
import { useAppDispatch } from "../../store/store";
import { calculateVestingProperties } from "../../utils/contract/vesting";
import { camelToTitleCase } from "../../utils/helpers";
import VestingContractContextCard from "./VestingContractContextCard";
import { Address, BlockchainTransactionStatus, RoundType, UserType } from "../../utils/types";
import UserTypeChip from "../generic/chip/UserTypeChip";
import RoundTypeChip from "../generic/chip/RoundTypeChip";
import AddressDisplay from "../address/AddressDisplay";
import ConfirmDialog from "../generic/dialogs/ConfirmDialog";
import VTVLVesting from "@vtvl/contracts/VTVLVesting.sol/VTVLVesting.json";
import TransactionWaitProgressBackdrop from "../progress/TransactionWaitProgressBackdrop";

export type VestingContractCapTablePageProps = {
    
}

// Token Cap table is different than a contract cap table
// contract cap table is limited to a contract, whereas token CT shows everyone for the token
// TODO: merge this and the UserVestingSchedulesOverviewPage - they're very similar and they use the same data - maybe the two functionalites can be spearated using the groupby parameter or something similar
const VestingContractCapTablePage: FC<VestingContractCapTablePageProps> = () => {

    const { 
        web3: web3Provider, 
        Moralis,
        chainId,
    } = useMoralis();

    const {vestingContractAddress = ""} = useParams();

    const dispatch = useAppDispatch();

    const vestingContractInfo = useSelector(selectSingleVestingContractFull({address: vestingContractAddress, chainId}));

    const loadClaims = async () => {
        if(!web3Provider || !chainId) {
            return;
        }
        const res = await dispatch(fetchClaims({address: vestingContractAddress, provider: web3Provider, chainId}));
        // console.log("loading claims", res)
        return res;
    }

    useEffect( () => {
        // Load as soon as we're ready to load, and none of the statuses is in pending state
        // If it's already loaded, don't force a refresh
        if(vestingContractInfo?.metadataLoadStatus === 'loaded' && (vestingContractInfo?.claimsLoadStatus === 'not-loaded' || vestingContractInfo?.claimsLoadStatus === 'loaded-partial')) {
            loadClaims();
        }
    }, [vestingContractInfo?.metadataLoadStatus, vestingContractInfo?.claimsLoadStatus]);
 

    // console.log(vestingContractInfo?.claims)
    const [claimDetailedAddress, setClaimDetailedAddress] = useState<Address|null>(null);
    
    const [claimRevokeTransactionStatus, setClaimRevokeTransactionStatus] = useState<BlockchainTransactionStatus>('idle');
    const [claimRevokeInProgressAddress, setClaimRevokeInProgressAddress] = useState<Address|null>(null);

    // const claimsLoaded = (vestingContractInfo?.claimsLoadStatus === 'loaded-partial' && Object.keys(vestingContractInfo?.claims ?? {}).length > 0) || vestingContractInfo?.claimsLoadStatus === 'loaded-full';

    const ClaimDetailModal = ({address}: {address: Address|null}) => {
        const claimInfo = claimDetailedAddress && vestingContractInfo?.claims && vestingContractInfo?.claims?.[claimDetailedAddress];
        if(!claimInfo) 
            return null;

        const {startDate, endDate, cliffReleaseDate, streamedAmount, totalAllocation, withdrawnAmount} = calculateVestingProperties(claimInfo);

        const elements = [
            ['Is Active', claimInfo?.isActive ? 'Yes' : 'No'],
            ['Name',claimInfo?.beneficiary?.name],
            ['Company',claimInfo?.beneficiary?.companyName],
            // @ts-ignore Allow unknown user types
            ['User Type', claimInfo?.beneficiary?.userType ? <UserTypeChip userType={camelToTitleCase(claimInfo?.beneficiary?.userType)} />  : 'N/A'],
            // @ts-ignore Allow unknown round types
            ['Round Type', claimInfo?.beneficiary?.roundType ? <RoundTypeChip roundType={camelToTitleCase(claimInfo?.beneficiary?.roundType)} />  : 'N/A'],
            ['Address', <AddressDisplay copyable value={claimDetailedAddress} maxDisplayChars={10} />],
            ['Cliff Release', cliffReleaseDate?.getTime() > 0 ? formatDate(cliffReleaseDate, DATETIME_FORMAT) : 'No Cliff'] ,
            ['Start', formatDate(startDate, DATETIME_FORMAT)],
            ['End', formatDate(endDate, DATETIME_FORMAT)],
            ['Cliff Allocated Amount', formatTokenAmount(claimInfo.cliffAmount, vestingContractInfo?.token)],
            ['Linear Allocated Amount', formatTokenAmount(claimInfo.linearVestAmount, vestingContractInfo?.token)],
            ['Streamed Amount', formatTokenAmount(streamedAmount, vestingContractInfo?.token)],
            ['Withdrawn Amount', formatTokenAmount(withdrawnAmount, vestingContractInfo?.token)],
            ['Total Amount to be Vested', formatTokenAmount(totalAllocation, vestingContractInfo?.token)]

        ]

        return <Dialog open={address !== null}>
            <DialogTitle>Detail Info</DialogTitle>
            <DialogContent>
                {elements.map(([title, value], i) => 
                    <Stack direction="row" sx={{justifyContent: "space-between", borderBottom: 1, p: 1}} key={i}>
                        <Typography component="span">{title}</Typography>
                        <Typography component="span">{value}</Typography>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button color="primary" variant="contained" onClick={() => setClaimDetailedAddress(null)}>Close</Button>
            </DialogActions>
        </Dialog>
    }

    const doRevokeClaim = async (userToRevokeAddress: Address) => {
        const ethers = Moralis.web3Library;
        if(!chainId || !vestingContractAddress || !userToRevokeAddress || !web3Provider || !ethers) {
            return;
        }

        try {
            setClaimRevokeTransactionStatus('pending');
            
            const vestingContract = new ethers.Contract(vestingContractAddress, VTVLVesting.abi, web3Provider.getSigner());
            
            const tx = await vestingContract.revokeClaim(userToRevokeAddress);
            
            setClaimRevokeTransactionStatus('in-progress');
            
            console.log(`Sent revocation transaction for ${userToRevokeAddress}`, tx)
                    
            const finalResult = await tx.wait();
            console.log("Received revocation result: ", finalResult)
            
            // We need to do a proper blockchain refresh, as otherwise we won't pull the new info
            await dispatch(fetchClaims({address: vestingContractAddress, provider: web3Provider, beneficiaries: [userToRevokeAddress], chainId}))
        }
        catch {
            // TODO: error handling
        }

        setClaimRevokeTransactionStatus('idle');
        setClaimRevokeInProgressAddress(null);
    }


    return <DashboardPageLayout headerTitle={'Contract Cap Table'}>
        <VestingContractContextCard vestingContractAddress={vestingContractAddress} />
        <Typography variant={'h4'}>Cap Table</Typography>
        
        <ClaimDetailModal address={claimDetailedAddress} />
        <ConfirmDialog 
            open={claimRevokeInProgressAddress !== null} 
            cancelAfterConfirm 
            text={`Are you sure you want to revoke the claim for ${claimRevokeInProgressAddress}?`} 
            onConfirm={() => claimRevokeInProgressAddress && doRevokeClaim(claimRevokeInProgressAddress)}
            onCancel={() => setClaimRevokeInProgressAddress(null)}
            />

        <TransactionWaitProgressBackdrop status={claimRevokeTransactionStatus} />

        <Card>
            <CardContent>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Company</TableCell>
                            <TableCell>User Type</TableCell>
                            <TableCell>Round Type</TableCell>
                            <TableCell>Address</TableCell>
                            <TableCell>Cliff Release</TableCell>
                            <TableCell>Cliff Allocated Amount</TableCell>
                            <TableCell>Linear Allocated Amount</TableCell>
                            <TableCell>Total Amount</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                    {vestingContractInfo?.claims && Object.entries(vestingContractInfo.claims).map(([address, claimInfo], i) => {
                            const {cliffReleaseDate, totalAllocation} = calculateVestingProperties(claimInfo);

                            const rowSx = claimInfo.isActive ? {

                            } : {
                                backgroundColor: '#daa'
                            }

                            return <TableRow key={i} sx={rowSx}>
                                <TableCell>{claimInfo?.beneficiary?.name}</TableCell>
                                <TableCell>{claimInfo?.beneficiary?.companyName}</TableCell>
                                <TableCell>{claimInfo?.beneficiary?.userType ? <UserTypeChip userType={camelToTitleCase(claimInfo?.beneficiary?.userType) as UserType} />  : 'N/A'}</TableCell>
                                <TableCell>{claimInfo?.beneficiary?.roundType ? <RoundTypeChip roundType={camelToTitleCase(claimInfo?.beneficiary?.roundType) as RoundType} />  : 'N/A'}</TableCell>
                                <TableCell><AddressDisplay copyable value={address} maxDisplayChars={10} /></TableCell>
                                <TableCell>{cliffReleaseDate.getTime() > 0 ? formatDate(cliffReleaseDate, DATETIME_FORMAT) : "No Cliff"}</TableCell>
                                <TableCell>{formatTokenAmount(claimInfo.cliffAmount, vestingContractInfo?.token)}</TableCell>
                                <TableCell>{formatTokenAmount(claimInfo.linearVestAmount, vestingContractInfo?.token)}</TableCell>
                                <TableCell>{formatTokenAmount(totalAllocation, vestingContractInfo?.token)}</TableCell>
                                <TableCell>
                                    <Button onClick={() => setClaimDetailedAddress(address)}>View Details</Button>
                                    {claimInfo.isActive && <Button onClick={() => setClaimRevokeInProgressAddress(address)} disabled={claimRevokeInProgressAddress === address}>Revoke</Button>}
                                    {claimRevokeInProgressAddress === address && <CircularProgress />}
                                </TableCell>
                            </TableRow>
                        })}
                        {/* {!claimsLoaded &&  <TableRow><TableCell colSpan={10}><CircularProgress /></TableCell></TableRow>} */}
                        {/* We require fully loaded cap table in order to not render the circular progress */}
                        {vestingContractInfo?.claimsLoadStatus !== 'loaded-full' &&  <TableRow><TableCell colSpan={10} align="center"><CircularProgress /></TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

    </DashboardPageLayout>;
}

export default VestingContractCapTablePage;