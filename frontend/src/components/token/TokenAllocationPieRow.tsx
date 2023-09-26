import React, { FC, useEffect, useState } from "react";
import { Box, Button, Grid, Paper, TextField, MenuItem, Card, CardHeader, CardContent, Icon, CircularProgress, LinearProgress, Stack, TableHead, TableBody, Table, TableRow, TableCell, Typography, Tooltip, LinearProgressProps } from "@mui/material";
import { Address, ClaimInfo, KnownVestingUserInfo, TokenInfo } from "../../utils/types";
import { formatDistanceToNow } from "date-fns";
import { calculateVestingProperties } from "../../utils/contract/vesting";
import TokenIcon from "../generic/TokenIcon";
import { formatTokenAmount } from "../../utils/contract/token";
import { formatDuration, format as formatDate, add as addDate } from "date-fns";
import { FullVestingContract } from "../../store/vestingSlice";
import AlertDialog from "../generic/dialogs/AlertDialog";
import ConfirmDialog from "../generic/dialogs/ConfirmDialog";
import { DATETIME_FORMAT, DATETIME_S_FORMAT, DATE_FORMAT } from "../../settings";
import { TokenAllocationTableRowProps } from "./TokenAllocationTableRow";
import { Chart, Legend, PieSeries, Title } from "@devexpress/dx-react-chart-material-ui";
import { Animation } from '@devexpress/dx-react-chart';
import { NumericalProgressBar } from "../generic/NumericalProgressBar";
import { format } from "path";

// Alias the type, for clarity
export type TokenAllocationPieRowProps = TokenAllocationTableRowProps;


export default function TokenAllocationPieRow(props: TokenAllocationPieRowProps) {
    const {
        vestingContractInfo,
        walletAddress,
        showLoadingOnNoClaim = false,
        onStake = null,
        onWithdraw = null,
    } = props;
    
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);

    const tokenInfo = vestingContractInfo?.token ?? null;
    const claimInfo = (vestingContractInfo?.claimsLoadStatus === 'loaded-full' || vestingContractInfo?.claimsLoadStatus === 'loaded-partial') ? vestingContractInfo.claims[walletAddress] : null;

    if(!claimInfo) {
        return showLoadingOnNoClaim ? <CircularProgress /> : null;
    }

    const vestingProps = calculateVestingProperties(claimInfo);

    {/* <GridBar name="In Progress" valueCurrent={vestingProps.rawStreamedAmount} valueEnd={vestingProps.totalAllocation} /> */}
    {/* <GridBar name="Claimed" valueCurrent={vestingProps.withdrawnAmount} valueEnd={vestingProps.streamedAmount} /> */}
    {/* <GridBar name="Available to Claim" valueCurrent={vestingProps.streamedAmount} valueEnd={vestingProps.totalAllocation} /> */}

    const amtAvailableToClaimFormatted = parseFloat(formatTokenAmount(vestingProps.canWithdrawAmount,    tokenInfo, {showSymbol: false, outputDecimals: 2}));
    const amtClaimedFormatted          = parseFloat(formatTokenAmount(vestingProps.withdrawnAmount,   tokenInfo, {showSymbol: false, outputDecimals: 2}));
    const amtInProgressFormatted       = parseFloat(formatTokenAmount(vestingProps.unvestedAmount, tokenInfo, {showSymbol: false, outputDecimals: 2}));
    const amtStreamedFormatted         = parseFloat(formatTokenAmount(vestingProps.streamedAmount, tokenInfo, {showSymbol: false, outputDecimals: 2}));
    const amtTotalAllocation           = parseFloat(formatTokenAmount(vestingProps.totalAllocation, tokenInfo, {showSymbol: false, outputDecimals: 2}));
    const amtCurrentIntervalStreamedFormatted    = parseFloat(formatTokenAmount(vestingProps.currentIntervalStreamed, tokenInfo, {showSymbol: false, outputDecimals: 2}));
    const amtCurrentIntervalNotStreamedFormatted = parseFloat(formatTokenAmount(vestingProps.currentIntervalNotStreamed, tokenInfo, {showSymbol: false, outputDecimals: 2}));


    const chartData = [
        { segment: 'Available to claim', value: +amtAvailableToClaimFormatted },
        { segment: 'Claimed', value: +amtClaimedFormatted },
        { segment: 'Vesting in progress', value: +amtInProgressFormatted },
      ];

    const actionBoxSx = {backgroundColor: '#E5E5E5', borderRadius: 2, p: 2, m: 3};

    const KeyInfoRow = ({value, heading: title}: {value?: string, heading: string}) => <Stack direction="row" sx={{justifyContent: "space-between", borderBottom: 1, my: 2, p: 1}}>
        <Typography>{title}</Typography>
        <Typography sx={{textAlign: 'right', fontWeight: 500}}>{value}</Typography>
    </Stack>

    return <>
        <AlertDialog 
            open={isStakeModalOpen} 
            text={"Staking currently not supported"} 
            // TODO: set up staking
            // onConfirm={() => onStake?.(vestingContractInfo.address, vestingProps.canWithdrawAmount)}
            onClose={()=> setIsStakeModalOpen(false)} />

        <ConfirmDialog 
            open={isWithdrawModalOpen} 
            title="Confirm Withdrawal"
            cancelAfterConfirm
            text={`Are you sure you want to withdraw ${formatTokenAmount(vestingProps.canWithdrawAmount, tokenInfo)}?`}
            onConfirm={() => onWithdraw?.(vestingContractInfo.address, vestingProps.canWithdrawAmount)}
                                onCancel={() => setIsWithdrawModalOpen(false)} />
    <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
            <Card>
                <CardHeader title={<>
                    <TokenIcon url={tokenInfo?.iconUrl} alt={tokenInfo?.symbol} />
                    <Typography>
                            Token Allocation ({tokenInfo?.symbol})
                    </Typography>
                </>} />
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item md={5} xs={12}>
                            <Typography sx={{fontWeight: 500, size: 14}}>
                                {formatTokenAmount(vestingProps.totalAllocation, vestingContractInfo.token)}
                            </Typography>
                            <Chart data={chartData}>
                                <PieSeries valueField="value" argumentField="segment" innerRadius={0.5} />
                                {/* <Title text="Area of Countries" /> */}
                                {/* <Animation /> */}
                                <Legend position="bottom"/>
                            </Chart>
                        </Grid>

                        <Grid item md={7} xs={12}>
                            <Box sx={actionBoxSx}>
                                <Typography>Available to claim</Typography>
                                <Typography>{amtAvailableToClaimFormatted} {tokenInfo?.symbol}</Typography>
                                <Button variant="contained" sx={{mr: 1}} onClick={() => setIsWithdrawModalOpen(true)}>Claim</Button>
                            </Box>
                            <Box sx={actionBoxSx}>
                                <Typography>Claimed</Typography>
                                <Typography>{amtClaimedFormatted} {tokenInfo?.symbol}</Typography>
                                <Button variant="outlined" disabled onClick={() => setIsStakeModalOpen(true)}>Stake</Button>
                            </Box>
                            
                            <Box sx={actionBoxSx}>
                                <Typography>Overall Vesting Progress</Typography>
                                <NumericalProgressBar valueCurrent={amtStreamedFormatted} valueEnd={amtTotalAllocation} valueSuffix={tokenInfo?.symbol} showEndValue showPercentDecimals={1} />
                            </Box>
                            {vestingProps.nextUnlockDate && <Box sx={actionBoxSx}>
                                <Tooltip title={`Unlock at ${formatDate(vestingProps.nextUnlockDate, DATETIME_S_FORMAT)}`}>
                                    <Typography>Next Unlock (in {formatDistanceToNow(vestingProps.nextUnlockDate)})</Typography>
                                </Tooltip>
                                <NumericalProgressBar name="To Next Unlock" valueCurrent={amtCurrentIntervalStreamedFormatted} valueEnd={amtCurrentIntervalNotStreamedFormatted} valueSuffix={tokenInfo?.symbol} showEndValue showPercentDecimals={1} />
                            </Box>}
                            {!vestingProps.nextUnlockDate && <Box sx={actionBoxSx}>
                                Fully Vested
                            </Box>}
                            
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Grid>
        <Grid item xs={12} md={4}>
            <Card>
                <CardHeader title="Key Info" />
                <CardContent>
                    <KeyInfoRow heading="Token name" value={tokenInfo?.name} />
                    <KeyInfoRow heading="Token symbol" value={tokenInfo?.symbol} />
                    <KeyInfoRow heading="Total allocation" value={formatTokenAmount(vestingProps.totalAllocation, vestingContractInfo.token, {showSymbol: true})} />
                    <Tooltip title={<>{vestingProps.timeUntilMaturitySecs ? formatDistanceToNow(addDate(new Date(), {seconds: vestingProps.timeUntilMaturitySecs})) : 'N/A'}</>}>
                        {/* Box to avoid forward ref issue */}
                        <Box>
                            <KeyInfoRow heading="End date" value={formatDate(vestingProps.endDate, DATETIME_FORMAT)} />
                        </Box>
                    </Tooltip>
                    {/* <KeyInfoRow heading="Rate" value="" /> */}
                    {tokenInfo?.totalSupply ? <KeyInfoRow heading="Market cap" value={formatTokenAmount(tokenInfo?.totalSupply, tokenInfo)} /> : <CircularProgress />}
                </CardContent>
            </Card>
        </Grid>
    </Grid>
    </>
}