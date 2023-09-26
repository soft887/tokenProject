import { useState } from "react";
import { Box, Button, CircularProgress, TableRow, TableCell, Tooltip } from "@mui/material";
import { Address } from "../../utils/types";
import { formatDistanceToNow } from "date-fns";
import { calculateVestingProperties } from "../../utils/contract/vesting";
import TokenIcon from "../generic/TokenIcon";
import { formatTokenAmount } from "../../utils/contract/token";
import { format as formatDate, add as addDate } from "date-fns";
import { FullVestingContract } from "../../store/vestingSlice";
import AlertDialog from "../generic/dialogs/AlertDialog";
import ConfirmDialog from "../generic/dialogs/ConfirmDialog";
import { DATETIME_FORMAT } from "../../settings";
import { NumericalProgressBar } from "../generic/NumericalProgressBar";

export type TokenAllocationTableRowProps = {
    vestingContractInfo: FullVestingContract;
    showLoadingOnNoClaim: boolean;
    walletAddress: Address;
    onStake?: (address: Address, amount: string, ...rest: any) => void
    onWithdraw: (address: Address, amount: string) => void
}

export default function TokenAllocationTableRow(props: TokenAllocationTableRowProps) {
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
        return showLoadingOnNoClaim ? <TableRow><TableCell colSpan={7}><CircularProgress /></TableCell></TableRow> : null;
    }

    const vestingProps = calculateVestingProperties(claimInfo);

    const streamedAmountFlt = parseFloat(formatTokenAmount(vestingProps.streamedAmount, tokenInfo, {showSymbol: false, outputDecimals: 2}));
    const withdrawnAmountFlt = parseFloat(formatTokenAmount(vestingProps.withdrawnAmount, tokenInfo, {showSymbol: false, outputDecimals: 2}));
    const canWithdrawAmountFlt = parseFloat(formatTokenAmount(vestingProps.canWithdrawAmount, tokenInfo, {showSymbol: false, outputDecimals: 2}));
    const totalAllocationFlt = parseFloat(formatTokenAmount(vestingProps.totalAllocation, tokenInfo, {showSymbol: false, outputDecimals: 2}));


    return <TableRow sx={{'& > td': {fontWeight: '500', height: 60}}}>
            <TableCell>
                <Tooltip title={<>Market Cap: {tokenInfo?.totalSupply ? formatTokenAmount(tokenInfo?.totalSupply, tokenInfo) : <CircularProgress />}</>}>
                    <Box>
                        <TokenIcon url={tokenInfo?.iconUrl} alt={tokenInfo?.symbol} />
                        {tokenInfo?.name} ({tokenInfo?.symbol})
                    </Box>
                </Tooltip>
            </TableCell>
            <TableCell>
                {formatTokenAmount(vestingProps.totalAllocation, vestingContractInfo.token)}
            </TableCell>
            <TableCell>
                <Tooltip title={<>{vestingProps.timeUntilMaturitySecs ? formatDistanceToNow(addDate(new Date(), {seconds: vestingProps.timeUntilMaturitySecs})) : 'N/A'}</>}>
                    <Box>{formatDate(vestingProps.endDate, DATETIME_FORMAT)}</Box>
                </Tooltip>
            </TableCell>
            <TableCell>
                <NumericalProgressBar valueCurrent={streamedAmountFlt} valueEnd={totalAllocationFlt} valueSuffix={tokenInfo?.symbol} />
            </TableCell>
            <TableCell>
                <NumericalProgressBar valueCurrent={withdrawnAmountFlt} valueEnd={streamedAmountFlt} valueSuffix={tokenInfo?.symbol} />
            </TableCell>
            <TableCell>
                {formatTokenAmount(vestingProps.canWithdrawAmount, vestingContractInfo.token)}
                {/* <NumericalProgressBar valueCurrent={canWithdrawAmountFlt} valueEnd={totalAllocationFlt} valueSuffix={tokenInfo?.symbol} /> */}
            </TableCell>
            <TableCell>
                <Button variant="contained" sx={{mr: 1}} onClick={() => setIsWithdrawModalOpen(true)}>Claim</Button>
                <Button variant="outlined"  disabled     onClick={() => setIsStakeModalOpen(true)}>Stake</Button>
                
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
            </TableCell>
            
            {/* TODO: This should ideally be rendered outside of the table, but in that case we need to pass the token info etc to the modal and the callbacks */}
    </TableRow>
}