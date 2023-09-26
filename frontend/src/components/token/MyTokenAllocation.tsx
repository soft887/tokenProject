import { FC, useEffect, useState } from "react";
import { Box, TableHead, TableBody, Table, TableRow, TableCell } from "@mui/material";
import { Address } from "../../utils/types";
import { useMoralis } from "react-moralis";
import { fetchClaims, selectFilteredVestingContractsFull } from "../../store/vestingSlice";
import { useSelector } from "react-redux";
import VTVLVesting from "@vtvl/contracts/VTVLVesting.sol/VTVLVesting.json";
import { useAppDispatch } from "../../store/store";
import TokenAllocationTableRow from "./TokenAllocationTableRow";
import TokenAllocationPieRow from "./TokenAllocationPieRow";

export type MyTokenAllocationProps = {
    walletAddress: Address,
    variant: 'table' | 'pie',
    onClaimFinished?: (vestingContractAddress: Address, amount: string) => void,
    onStakeFinished?: (vestingContractAddress: Address, amount: string) => void,
}

const MyTokenAllocation: FC<MyTokenAllocationProps> = (props) => {
    const {
        walletAddress,
        variant,
        onClaimFinished = null,
        onStakeFinished = null
    } = props;
    
    const {
        Moralis, 
        web3: web3Provider,
        chainId
    } = useMoralis();
    const dispatch = useAppDispatch();
    // const vestingContractInfo = useSelector(selectVestingContractFullByAddress(contractAddress));
    const activeVestingContracts = useSelector(selectFilteredVestingContractsFull());

    const [stakePromptAddress, setStakePromptAddress] = useState<Address|null>(null);
    const [withdrawalPromptAddress, setWithdrawalPromptAddress] = useState<Address|null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    const [numLoadRequested, setNumLoadRequested] = useState(0);


    useEffect( () => {
        const ethers = Moralis.web3Library;
        
        if(!chainId || !web3Provider || !ethers || !activeVestingContracts || numLoadRequested === activeVestingContracts.length) {
            return;
        }

        // For each active contract, see whether its claims are loaded
        const promises = activeVestingContracts.map((vestingContractInfo) => {
            // Not loaded means we didn't attempt to load anything
            // loaded-partial means we attempted to load something, but this isn't necessarily comprehensive (good for cap table)
            // In case we have a partial load, we need to check whether 
            const shouldLoad = ((vestingContractInfo?.claimsLoadStatus === 'not-loaded') || 
                                  (vestingContractInfo?.claimsLoadStatus === 'loaded-partial' && !vestingContractInfo.claims[walletAddress]));
            
            // undefined means we haven't loaded it
            return shouldLoad ? dispatch(fetchClaims({address: vestingContractInfo.address, provider: web3Provider, beneficiaries: [walletAddress], chainId})) : null;
        })
        
        // Set the amount of the successful loads
        // If we're at the said number (regardless of success), we won't retry
        Promise.all(promises).then(contractsWithLoadedClaims => {
            setNumLoadRequested(contractsWithLoadedClaims.length);
        });
    }, [web3Provider, Moralis.web3Library, refreshTrigger, activeVestingContracts, numLoadRequested, dispatch, walletAddress]);

    useEffect( () => {
        const intervalId = setInterval(() => {
            setRefreshTrigger(refreshTrigger => (refreshTrigger+1) % 100);
        }, 5000);
        return () => clearInterval(intervalId);
    }, []);

    const handleDoWithdraw: MyTokenAllocationProps['onClaimFinished'] = async (address: Address, amount: string) => {
        const ethers = Moralis.web3Library;
        if(!chainId || !address || !web3Provider || !ethers) {
            return;
        }
        const vestingContract = new ethers.Contract(address, VTVLVesting.abi, web3Provider.getSigner());
        
        const tx = await vestingContract.withdraw();

        console.log("Sent withdrawal transaction", tx)
        
        setWithdrawalPromptAddress(null);
        
        const finalResult = await tx.wait();
        console.log("Received withdrawal result: ", finalResult)
        
        // Not really necessary as blockchain refresh will trigger it
        // setRefreshTrigger((refreshTrigger+1) % 100);
        
        // We need to do a proper blockchain refresh, as otherwise we won't pull the new info
        await dispatch(fetchClaims({address, provider: web3Provider, beneficiaries: [walletAddress], chainId}))

        // TODO: Consider do we want to wait here?
        onClaimFinished?.(address, amount);
    }

    const isRetryAllowed = (numLoadRequested < activeVestingContracts.length);
    
    return variant === 'table' ? 
        <Table>
            <TableHead>
                <TableRow sx={{'& > th': {width: 65}}}>
                    <TableCell sx={{width: 115}}>Token</TableCell>
                    <TableCell>Allocation</TableCell>
                    <TableCell>Maturity Time</TableCell>
                    <TableCell>Vesting Progress</TableCell>
                    <TableCell>Claimed</TableCell>
                    <TableCell>Available to Claim</TableCell>
                    <TableCell>Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>

            {activeVestingContracts.map((vestingContractInfo, i) => 
                <TokenAllocationTableRow key={i} showLoadingOnNoClaim={isRetryAllowed} vestingContractInfo={vestingContractInfo} onWithdraw={handleDoWithdraw} walletAddress={walletAddress} />
            )}
        </TableBody>
    </Table> :
    <Box sx={{'&>*': {mb: 2}}}>
        {activeVestingContracts.map((vestingContractInfo, i) => 
            <TokenAllocationPieRow key={i} showLoadingOnNoClaim={isRetryAllowed} vestingContractInfo={vestingContractInfo} onWithdraw={handleDoWithdraw} walletAddress={walletAddress} />
        )}
    </Box>
}

export default MyTokenAllocation;