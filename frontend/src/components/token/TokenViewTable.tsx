import { FC, useEffect, useState } from "react";
import { Button, Table, TableHead, TableBody, TableRow, TableCell, Stack, CircularProgress, Tooltip, TextField, Typography, DialogContent, Dialog, DialogActions, Box, IconButton } from "@mui/material";
import { Address, MyTokenEntry, TokenInfo } from "../../utils/types";
import AddressDisplay from "../address/AddressDisplay";
import { useMoralis } from "react-moralis";
import ERC20Token from "@vtvl/openzeppelin-artifacts/token/ERC20/ERC20.sol/ERC20.json";
import { BigNumber, ethers, utils } from "ethers";
import { useNavigate } from "react-router";
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
import { formatTokenAmount, parseTokenAmount } from "../../utils/contract/token";
import TokenIcon from "../generic/TokenIcon";
import DeleteAfterConfirmButton from "../generic/buttons/DeleteAfterConfirmButton";
import { ChainDisplay } from "../chain/ChainDisplay";
import VariableSupplyERC20Token from "@vtvl/contracts/token/VariableSupplyERC20Token.sol/VariableSupplyERC20Token.json";
import { sleep, wordsToTitleCase } from "../../utils/helpers";
import RefreshIcon from '@mui/icons-material/Refresh';
import { fetchBlockchainTokenInfo } from "../../store/vestingSlice";
import { useAppDispatch } from "../../store/store";
import TransactionWaitProgressBackdrop from "../progress/TransactionWaitProgressBackdrop";
import useBlockchainTransactionPermissions from "../hooks/useBlockchainTransactionPermissions";

export type TokenViewTableProps = {
    // tokens: (Partial<Omit<TokenInfo, 'address'>> & {address : TokenInfo['address']}) [], // Address is obligatory, rest isnt
    tokens: MyTokenEntry[], // Address is obligatory, rest isnt
    onDelete?: (addr: Address) => void;
    balanceAddress?: Address;
}

type TokenAdditionalInfo = {
    balanceOf?: string | null;
    mintableSupply?: string | null;
}


const TokenViewTable: FC<TokenViewTableProps> = (props) => {

    const { 
        tokens,
        balanceAddress = null,
        onDelete = undefined
     } = props;

    const navigate = useNavigate();
    const [tokenAdditionals, setTokenAdditionals] = useState<{[k: string]: TokenAdditionalInfo}>({});
    const {Moralis, web3: web3Provider, chainId} = useMoralis();
    const dispatch = useAppDispatch();

    const {canRead, canWrite} = useBlockchainTransactionPermissions();

    const [mintAmountTokens, setMintAmountTokens] = useState(100);
    const [mintOpsDialogOpenAddress, setMintOpsDialogOpenAddress] = useState<string|null>(null);
    const [tokenMintState, setTokenMintState] = useState<'idle' | 'pending' | 'in-progress'>('idle');

    // TODO: move this code somewhere else
    useEffect(() => {
        if(!(tokens && web3Provider && balanceAddress)) {
            return;
        }
        let isCanceled = false;
        
        Promise.all(tokens.map(async (token) => {

            // Normally, use ERC20token, but in some cases, if we know the contract, we can get some extra functionalities
            const ContractTpl = (token.contractType === 'variable-supply') ? VariableSupplyERC20Token : ERC20Token;

            // TODO: restructire code better
            const tokenContract = new ethers.Contract(token.address, ContractTpl.abi, web3Provider);
            const balanceP = tokenContract.balanceOf(balanceAddress);
            const mintableSupplyP = (token.contractType === 'variable-supply') ? tokenContract.mintableSupply() : null;

            try {
                const mintable = (await mintableSupplyP);
                return {
                    balanceOf: (await balanceP).toString(),
                    mintableSupply: mintable ? mintable.toString() : null,
                };
            }
            catch {
                // Null balance means it came back but threw
                return {
                    balanceOf: null
                }; 
            }
        })).then((tokenBalances) => {
            if(isCanceled) {
                return;
            }
             
            const tb = Object.fromEntries(tokens.map((token, i) => [token.address, tokenBalances[i]]));
            setTokenAdditionals(tb);
        });

        return () => {isCanceled = true;}
    }, [tokens, web3Provider]);



    const handleMint = async (tokenAddress: Address) => {
        // @ts-ignore
        window.f = () => dispatch(fetchBlockchainTokenInfo({Moralis, address: tokenAddress, chainId, updateDbEntry: true, provider: web3Provider}))
        const token = tokens.filter(t => t.address === tokenAddress && t.contractType === 'variable-supply')?.[0];

        if(!token || !web3Provider || !chainId) {
            return;
        }

        setTokenMintState('pending');

        // TODO: assigning to self
        const receiverAddress = await web3Provider.getSigner().getAddress();

        const tokenContract = new ethers.Contract(token.address, VariableSupplyERC20Token.abi, web3Provider.getSigner());

        const txP = tokenContract.mint(receiverAddress, parseTokenAmount(mintAmountTokens, token));
        try {
            
            const tx = await txP;
            setTokenMintState('in-progress');
            await tx.wait();
            
            await dispatch(fetchBlockchainTokenInfo({Moralis, address: tokenAddress, chainId, updateDbEntry: true, provider: web3Provider}));
        }
        catch(e: any) {
            alert("Error" + e?.data?.message);
        }
        setTokenMintState('idle');
        setMintOpsDialogOpenAddress(null);
    }

    return <>
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell sx={{width: 50}}>Chain</TableCell>
                    <TableCell sx={{width: 50}}>Token Symbol</TableCell>
                    <TableCell>Token Name</TableCell>
                    <TableCell sx={{width: 160}}>
                        <Tooltip title={<>
                            The type of the token you've minted. 
                            If you've minted a token through our platform, by clicking on the contract type, 
                            you'll get additional options relevant to that contract type, such as minting. 
                            For Generic tokens (such as the imported ones), no extra functionalities are offered.
                            </>}>
                                <Box display="flex" alignItems="center">
                                    Token Type
                                    <InfoIcon sx={{ml: 1}} />
                                </Box>
                        </Tooltip> 
                    </TableCell>
                    <TableCell>Token Allocation</TableCell>
                    <TableCell sx={{width: 180}}>Token Contract Address</TableCell>
                    {balanceAddress && <TableCell>Balance</TableCell>}
                    <TableCell>Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {tokens.map(token => {
                    // const isRowDisabled = (chainId !== token.chainId);
                    const isRowDisabled = canWrite(token.chainId, token.ownerAddresses) === false;
                    const rowSx = {
                        '& > td': {
                            fontWeight: '500'
                        },
                        ...(isRowDisabled ? {
                            backgroundColor: '#eee'
                        } : null)
                    };

                    const tokenBalance = balanceAddress && tokenAdditionals?.[token.address]?.balanceOf;

                    const mintableSupply = tokenAdditionals?.[token.address]?.mintableSupply;

                    let contractTypeName = 'Generic';
                    if(token?.contractType === 'variable-supply') {
                        contractTypeName = ((mintableSupply === "0") ? "Variable" : "Fixed") + ' Supply';
                    }
                    else if(token?.contractType) {
                        contractTypeName = wordsToTitleCase(token.contractType.split('-'));
                    }

                    return <TableRow key={token.address} sx={rowSx}>
                        <TableCell sx={{width: 50}}><ChainDisplay chainId={token.chainId} /></TableCell>
                        <TableCell>
                            <TokenIcon url={token?.iconUrl} alt={token?.symbol} />
                            {token?.symbol}
                        </TableCell>
                        <TableCell>{token?.name}</TableCell>
                        <TableCell>
                            <Button variant="outlined" sx={{width: '90%'}} onClick={() => setMintOpsDialogOpenAddress(token.address)} disabled={!token?.contractType}>{contractTypeName}</Button>
                            {<Dialog open={mintOpsDialogOpenAddress === token.address}>
                                <DialogContent>
                                    {token?.contractType === 'variable-supply' && <Stack spacing={2}>
                                        <Typography>Variable Supply Contract</Typography>
                                        {mintableSupply && <Typography>
                                            Mintable supply: {mintableSupply === "0" ? 
                                                "Unlimited" : <>
                                                    {utils.formatUnits(mintableSupply, token.decimals)} {token?.symbol}
                                            </>}
                                        </Typography>}

                                        <TextField value={mintAmountTokens} onChange={e => setMintAmountTokens(+e.target.value)} label="Mint amount" />
                                    </Stack>}
                                    {token?.contractType !== 'variable-supply' && <Typography>
                                        No options available for {token?.contractType ? wordsToTitleCase((token?.contractType).split('-')) : 'Generic'} contract.
                                    </Typography>}
                                </DialogContent>
                                <DialogActions>
                                    <Button variant="outlined" onClick={() => setMintOpsDialogOpenAddress(null)}>Close</Button>
                                    <Button variant="contained" onClick={() => handleMint(token.address)} disabled={tokenMintState !== 'idle'}>Mint</Button>
                                </DialogActions>
                            </Dialog>}
                        </TableCell>
                        <TableCell>{token?.totalSupply ? utils.formatUnits(token.totalSupply, token.decimals) : 'N/A'} {token?.symbol}</TableCell>
                        <TableCell>
                            <AddressDisplay copyable value={token.address} fontSize={12} maxDisplayChars={18} />
                        </TableCell>
                        {balanceAddress && <TableCell>
                            {/* undefined means still loading. null means load op completed but failed */}
                            {tokenBalance === undefined && <CircularProgress />}  
                            {tokenBalance === null && <Tooltip title={'Unable to retrieve balance for this contract. This could mean that the address is invalid.'}>
                                <ErrorIcon color="error" />
                            </Tooltip>}
                            {tokenBalance && formatTokenAmount(tokenBalance, token)}
                        </TableCell>}
                        <TableCell>
                            <Stack direction="row" justifyContent="space-between">
                                <Button variant={"contained"} onClick={() => navigate(`/founder/tokens/${token.address}/vesting-contracts/`)} disabled={isRowDisabled}>View vesting contracts</Button>
                                {/* <IconButton onClick={() => handleRefresh(token.address)}><RefreshIcon /></IconButton> */}
                                {onDelete && <DeleteAfterConfirmButton onDelete={() => onDelete(token.address) }  disabled={isRowDisabled} />}
                            </Stack>
                        </TableCell>
                </TableRow>})}
            </TableBody>
        </Table>
        {tokenMintState !== 'idle' && <TransactionWaitProgressBackdrop status={tokenMintState} />}
    </>
}

export default TokenViewTable;