import React, { FC, useEffect, useState } from "react";
import { Box, Button, Grid, Paper, TextField, MenuItem, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, IconButton, Stack, Menu, CircularProgress, DialogTitle, DialogContent, DialogActions, Dialog } from "@mui/material";
import { Address, TokenInfo } from "../../utils/types";
import AddressDisplay from "../address/AddressDisplay";
import { useMoralis } from "react-moralis";
import { BigNumber, ethers, utils } from "ethers";
import { useNavigate } from "react-router";
import { selectFilteredVestingContractsFull } from "../../store/vestingSlice";
import { formatTokenAmount, parseTokenAmount } from "../../utils/contract/token";
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ConfirmDialog from "../generic/dialogs/ConfirmDialog";
import ERC20Token from "@vtvl/openzeppelin-artifacts/token/ERC20/ERC20.sol/ERC20.json";
import { ChainDisplay } from "../chain/ChainDisplay";
import useBlockchainTransactionPermissions from "../hooks/useBlockchainTransactionPermissions";

export type VestingContractViewTableProps = {
    vestingContracts: ReturnType<ReturnType<typeof selectFilteredVestingContractsFull>>
    onDelete?: (addr: Address) => void
    onFund?: (addr: Address, amount: string) => void
    fundEnabled?: boolean
}


const VestingContractViewTable: FC<VestingContractViewTableProps> = (props) => {
    const {
        vestingContracts,
        onFund = null,
        onDelete = null,
    } = props;

    const {Moralis, web3: web3Provider} = useMoralis();
    const [vestingContractActionMenuAnchorEl, setVestingContractActionMenuAnchorEl] = useState<React.MouseEvent<HTMLButtonElement>['currentTarget'] | null>(null);

    const navigate = useNavigate();

    const {canRead, canWrite} = useBlockchainTransactionPermissions();

    const [contractAddressToDelete, setContractAddressToDelete] = useState<Address|null>(null);

    const [fundModalContract, setFundModalContract] = useState<((typeof vestingContracts)[number]) | null>(null);
    const [fundModalAmount, setFundModalAmount] = useState<string>("");

    const handleFundModalOpen = (contract: typeof fundModalContract) => {
        setFundModalContract(contract);
    }

    const closeFundModal = () => setFundModalContract(null);

    const handleFund = () => {
        fundModalContract && fundModalAmount && onFund?.(fundModalContract.address, parseTokenAmount(fundModalAmount, fundModalContract?.token)); 
        closeFundModal();
    }

    const setMaxFundAmount = async () => {
        if(!fundModalContract || !fundModalContract.token) {
            return;
        }
        const ethers = Moralis.web3Library;
        const signer = web3Provider?.getSigner?.();
        if(!ethers || !signer || !web3Provider) {
            throw new Error("Invalid signer, make sure web3Provider is initialized.")
        }

        const tokenContract = new ethers.Contract(fundModalContract.token.address, ERC20Token.abi, signer);
        const balance = await tokenContract.balanceOf(await signer.getAddress());
        setFundModalAmount(formatTokenAmount(balance, fundModalContract.token, {showSymbol: false}));
    }

    return <>
        <Dialog open={!!fundModalContract} onClose={closeFundModal}>
            <DialogTitle>Fund the Contract</DialogTitle>
            <DialogContent>
                <Box sx={{mt: 2}}>
                    <TextField 
                        label="Amount"
                        value={fundModalAmount} 
                        onChange={(e) => setFundModalAmount(e.target.value)} />
                    <Button onClick={setMaxFundAmount}>Max</Button>
                </Box> 
            </DialogContent>
            <DialogActions>
                <Button variant="contained" color="primary" onClick={handleFund} disabled={!fundModalAmount || !fundModalContract || +fundModalAmount < 0.00001}>Fund</Button>
                <Button variant="contained" color="secondary" onClick={closeFundModal}>Cancel</Button>
            </DialogActions>
        </Dialog>
        {onDelete && <ConfirmDialog
            title={'Are you sure you want to delete the contract?'}
            open={!!contractAddressToDelete} 
            onConfirm={() => {contractAddressToDelete && onDelete(contractAddressToDelete); setContractAddressToDelete(null);}} 
            onCancel={() =>  setContractAddressToDelete(null)} />}
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell sx={{width: 50}}>Chain</TableCell>
                    <TableCell sx={{width: 300}}>Contract Address</TableCell>
                    <TableCell>
                        Token Name /
                        <br />
                        Token Symbol
                    </TableCell>
                    <TableCell sx={{width: 150}}>Token Address</TableCell>
                    <TableCell>Contract Balance</TableCell>
                    <TableCell>
                        Reserved /
                        <br />
                        Available
                    </TableCell>
                    <TableCell>Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
            {vestingContracts.map(vestingContractInfo => {
                const contractAddress = vestingContractInfo.address;
                if(!contractAddress) {
                    return null;
                }
                const availableBalance = (vestingContractInfo.metadataLoadStatus === 'loaded' && vestingContractInfo?.contractBalance && vestingContractInfo?.numTokensReservedForVesting) && BigNumber.from(vestingContractInfo?.contractBalance).sub(vestingContractInfo?.numTokensReservedForVesting);

                const canReadRow = canRead(vestingContractInfo.chainId, vestingContractInfo.ownerAddresses);
                const canWriteRow = canWrite(vestingContractInfo.chainId, vestingContractInfo.ownerAddresses);

                const buttons = {
                    'cap-table':              {action: () => navigate(`/founder/vesting-contracts/${contractAddress}/cap-table`), title: 'View Cap Table'},
                    'create-schedule':        {action: () => navigate(`/founder/vesting-contracts/${contractAddress}/schedule/create`), title: 'Create Vesting Schedule'},
                    ...(onFund   ? {'fund':   {action: () => handleFundModalOpen(vestingContractInfo), title: 'Fund'  }} : null),
                    ...(onDelete ? {'delete': {action: () => setContractAddressToDelete(contractAddress), title: 'Delete'}} : null),
                };

                let defaultAction: keyof typeof buttons = 'fund';
                if(!canWriteRow) {
                    defaultAction = 'cap-table';
                }
                else if(vestingContractInfo.metadataLoadStatus === 'loaded' && vestingContractInfo?.numTokensReservedForVesting && BigNumber.from(vestingContractInfo.numTokensReservedForVesting).gt(0)) {
                    defaultAction = 'cap-table';
                }
                else {
                    if(availableBalance && availableBalance.gt(0)) {
                        defaultAction = 'create-schedule';
                    }
                    else {
                        defaultAction = 'fund';
                    }
                }
                
                if(!buttons?.[defaultAction]) {
                    defaultAction = 'create-schedule'
                }

                const rowSx = {
                    '&>td': {
                        fontWeight: 500, 
                        height: 60,
                        // Color the row if we have no read or write access. If we have no access at all then it should be red, otherwise gray
                        ...((!canReadRow || !canWriteRow) ? {
                            backgroundColor: canReadRow ? '#eee' : '#ebb'
                        } : null)
                    }
                };

                const additionalMenuEntries = Object.entries(buttons).map(([k, btn], i) => (k !== defaultAction) && canWriteRow && 
                    <MenuItem 
                        key={i} 
                        onClick={btn.action}>
                            {btn.title}
                    </MenuItem>);
                
                return <React.Fragment key={contractAddress}>
                        <TableRow sx={rowSx}>
                            <TableCell sx={{width: 50}}><ChainDisplay chainId={vestingContractInfo.chainId} /></TableCell>
                            <TableCell>
                                <AddressDisplay 
                                    fullWidth 
                                    copyable 
                                    variant="standard" 
                                    value={contractAddress} 
                                    fontSize={12}
                                    />
                            </TableCell>
                            <TableCell>
                                    {vestingContractInfo?.token?.name}
                                    <br />
                                    {vestingContractInfo?.token?.symbol}
                            </TableCell>
                            <TableCell>
                                {vestingContractInfo?.token && <AddressDisplay 
                                        copyable 
                                        value={vestingContractInfo?.token?.address} 
                                        maxDisplayChars={10} 
                                        fontSize={12} />}
                            </TableCell>
                            
                            {vestingContractInfo.metadataLoadStatus === 'loaded' ? <>
                                <TableCell>
                                    {vestingContractInfo?.contractBalance ? formatTokenAmount(vestingContractInfo.contractBalance, vestingContractInfo?.token) : 'N/A'}
                                </TableCell>
                                <TableCell>
                                    {vestingContractInfo.metadataLoadStatus === 'loaded' && <>
                                        {vestingContractInfo?.numTokensReservedForVesting ? formatTokenAmount(vestingContractInfo.numTokensReservedForVesting, vestingContractInfo?.token) : 'N/A'}
                                        <br />
                                        {availableBalance ? formatTokenAmount(availableBalance, vestingContractInfo?.token) : 'N/A'}
                                    </>}
                                </TableCell>
                                <TableCell sx={{'& > button': {width: 120, mb: 1}}}>
                                    <Stack direction="row" justifyContent={'space-between'}>

                                        {buttons[defaultAction] && <Button variant="contained" disabled={!canReadRow} onClick={buttons[defaultAction]?.action}>{buttons[defaultAction]?.title}</Button>}

                                        {additionalMenuEntries.filter(x=>!!x).length > 0 && <>
                                            <IconButton onClick={(e) => setVestingContractActionMenuAnchorEl(e.currentTarget)}><MoreHorizIcon /></IconButton>
                                            <Menu
                                            open={!!vestingContractActionMenuAnchorEl}
                                            anchorEl={vestingContractActionMenuAnchorEl}
                                            onClose={()=>setVestingContractActionMenuAnchorEl(null)}>
                                                {additionalMenuEntries}
                                            </Menu>
                                        </>}
                                            
                                    </Stack>
                                </TableCell>
                            </> : <TableCell colSpan={3}><CircularProgress /></TableCell>}
                        </TableRow>
                    </React.Fragment>
            })}
            </TableBody>
        </Table>
    </>
}

export default VestingContractViewTable;