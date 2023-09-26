import React, { FC, useEffect, useState } from "react";
import { Button, Typography, Menu, MenuItem, Card, CardContent, CircularProgress, Backdrop, Dialog, DialogTitle, DialogContent, Stack } from "@mui/material";
import { useMoralis } from "react-moralis";
import DashboardPageLayout from "../../../layout/DashboardPageLayout";
import VTVLVesting from "@vtvl/contracts/VTVLVesting.sol/VTVLVesting.json";
import ERC20Token from "@vtvl/openzeppelin-artifacts/token/ERC20/ERC20.sol/ERC20.json";
import { Address, BlockchainTransactionStatus } from "../../../../utils/types";
import AddressDisplay from "../../../address/AddressDisplay";
import { ethers, BigNumber } from "ethers";
import { useAppDispatch } from "../../../../store/store";
import { useSelector } from "react-redux";
import { doAddMyVestingContract, doDeleteMyVestingContract, fetchContractInfo, fetchBlockchainTokenInfo, selectFilteredVestingContractsFull } from "../../../../store/vestingSlice";
import { deployVestingContract } from "../../../../utils/contract/vesting";
import { useNavigate, useParams } from "react-router";
import { useSearchParams } from "react-router-dom";
import AddIcon from '@mui/icons-material/Add';
import SuccessDialog from "../../../generic/SuccessDialog";
import VestingContractViewTable from "../../../vesting-contract/VestingContractViewTable";
import AlertDialog from "../../../generic/dialogs/AlertDialog";
import { ChainDisplay } from "../../../chain/ChainDisplay";
import { loadTokenMetadataFromContract } from "../../../../utils/contract/token";
import TransactionWaitProgressBackdrop from "../../../progress/TransactionWaitProgressBackdrop";

export type VestingContractPageProps = {

}

const VestingContractPage: FC<VestingContractPageProps> = () => {
    const {
        Moralis,
        user,
        web3: web3Provider,
        setUserData,
        chainId,
    } = useMoralis();

    const dispatch = useAppDispatch();
    // TODO: not properly using tokenAddress here - 
    const { tokenAddress: selectedTokenAddress = '' } = useParams();

    const [searchParams, setSearchParams] = useSearchParams();

    // const [selectedTokenAddress, setSelectedTokenAddress] = useState<Address>(tokens?.[0]?.address ?? '');
    // Filter by chain id
    const activeVestingContracts = useSelector(selectFilteredVestingContractsFull({ tokenAddress: selectedTokenAddress, chainId }));

    const [byoContractAddress, setByoContractAddress] = useState<Address>("");
    const [errorText, setErrorText] = useState<string | null>(null);

    const [addVestingContractMenuAnchorEl, setAddVestingContractMenuAnchorEl] = useState<React.MouseEvent<HTMLButtonElement>['currentTarget'] | null>(null);

    const [isByoModalOpen, setIsByoModalOpen] = useState(false);

    const [contractCreateState, setContractCreateState] = useState<BlockchainTransactionStatus>("idle");
    const [contractFundState, setContractFundState] = useState<BlockchainTransactionStatus>("idle");

    const [vestingContractInActionAddress, setVestingContractInActionAddress] = useState<Address | null>(null);
    const [createdTokenTitle, setCreatedTokenTitle] = useState<string | null>(null);


    const navigate = useNavigate();


    useEffect(() => {
        const start = async () => {
            let action = searchParams.get('action') ?? ''
            let vestingContractAddress = searchParams.get('vestingContractAddress') ?? ''
            // const ethers = Moralis.web3Library;
            const signer = web3Provider?.getSigner?.();

            const tokenContract = new ethers.Contract(selectedTokenAddress, ERC20Token.abi, signer);
            const freshTokenInfo = await loadTokenMetadataFromContract(tokenContract);
            setCreatedTokenTitle(freshTokenInfo.name);

            if (Moralis && web3Provider) {
                let resP = null;

                switch (searchParams.get('action')) {
                    case 'create':
                        resP = createContract();
                        break;
                    case 'fund':
                        // resP = fundContract(searchParams.get('vestingContractAddress') ?? '', 'all');
                        resP = fundContract(vestingContractAddress ?? '', 'all');
                        break;
                }

                resP?.then(() => {
                    setSearchParams({});
                })
            }
        }

        start()

    }, [Moralis, web3Provider, searchParams])

    const addExistingVestingContract = async (vestingContractAddress: Address, tokenMeta: object = {}) => {
        if (!chainId || !web3Provider) {
            setErrorText("Invalid chain selected.");
            return;
        }
        setErrorText(null);
        try {
            const ownerAddresses = await web3Provider.listAccounts();
            // Must unwrap to trigger exception throw in case of error
            const resultAction = await dispatch(doAddMyVestingContract({ Moralis, address: vestingContractAddress, chainId, ownerAddresses })).unwrap();
        }
        catch (e: any) {
            setErrorText(`Error while adding the contract to cache: ${e.message}`);
        }
    }

    const deleteContract = async (selectedContractAddress: Address) => {
        if (!chainId) {
            setErrorText("Invalid chain selected.");
            return;
        }
        setErrorText(null);
        try {
            const resultAction = await dispatch(doDeleteMyVestingContract({ Moralis, address: selectedContractAddress, chainId })).unwrap();
        }
        catch (e: any) {
            setErrorText(`Error while deleting the contract from cache: ${e.message}`);
        }
    }

    const createContract = async () => {
        setErrorText(null);
        try {
            setContractCreateState('pending');
            if(!selectedTokenAddress) {
                throw new Error("Invalid token selected. Please select a token.");
            }
            const signer = web3Provider?.getSigner?.();
            if (!signer) {
                throw new Error("Invalid signer, make sure web3Provider is initialized.")
            }

            const vestingContract = await deployVestingContract(selectedTokenAddress, signer, () => setContractCreateState('in-progress'));
            addExistingVestingContract(vestingContract.address);

            setContractCreateState('confirmed');
            setVestingContractInActionAddress(vestingContract.address);
            setAddVestingContractMenuAnchorEl(null);
        }
        catch (e: any) {
            setErrorText(`Error while creating the contract: ${e.message}`);
            setContractCreateState('idle');
        }
    }



    const fundContract = async (selectedContractAddress: Address, amount: string) => {
        // console.log('fund amount', amount);
        // console.log('amount type', typeof amount);

        setErrorText(null);
        try {
            if (!selectedTokenAddress) {
                throw new Error("Invalid token selected. Please select a token.");
            }

            const currVestingContract = activeVestingContracts.find(c => selectedContractAddress === c.address);

            if (!currVestingContract) {
                throw new Error("Invalid contract selected. Please select a contract.");
            }

            if (typeof amount === "string") {
                if (amount !== 'all') {
                    if (BigNumber.from(amount).lte(0)) {
                        throw new Error("Invalid amount. Amount cannot be less than zero");
                    }
                } else if (!amount) {
                    throw new Error("Invalid amount. Amount cannot be empty");
                }
            }


            const ethers = Moralis.web3Library;
            const signer = web3Provider?.getSigner?.();
            if (!ethers || !web3Provider || !signer || !chainId) {
                throw new Error("Invalid signer or chain, make sure web3Provider is initialized.")
            }

            setContractFundState('pending');

            const tokenContract = new ethers.Contract(selectedTokenAddress, ERC20Token.abi, signer);
            const vestingContract = new ethers.Contract(selectedContractAddress, VTVLVesting.abi, signer);

            // We use the passed in param. But allow explicit passing of "all"
            const numTokensToInitializeContract = amount === 'all' ? (await tokenContract.balanceOf(await signer.getAddress())) : amount;
            // const numTokensToInitializeContract = ;

            const tx = await tokenContract.transfer(vestingContract.address, numTokensToInitializeContract);

            // At this point we got the signature, so we're in progress
            setContractFundState('in-progress');

            console.log(`Transferring ${await tokenContract.symbol()} tokens to newly initialized contract (${numTokensToInitializeContract}).`);

            const transferResult = await tx.wait();
            console.log("Transfer completed. Result:", transferResult);

            // We don't really need the token info, but we do need the contract info - as it means refreshing the metadata
            dispatch(fetchBlockchainTokenInfo({ address: tokenContract.address, provider: web3Provider, chainId }));
            await dispatch(fetchContractInfo({ address: vestingContract.address, provider: web3Provider, chainId }));

            setVestingContractInActionAddress(vestingContract.address);

            setContractFundState('confirmed');
        }
        catch (e: any) {
            setErrorText(`Error while funding the contract: ${e.message}`);
            setContractFundState('idle');
        }
    }

    return <DashboardPageLayout headerTitle={'Vesting'}>
        <Stack direction="row" justifyContent={'space-between'} alignItems={'center'}>
            <Typography variant={'h4'}>Vesting Contracts List on <ChainDisplay textOnly chainId={chainId} /></Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={(e) => setAddVestingContractMenuAnchorEl(e.currentTarget)} sx={{ height: 30 }}>Add</Button>
            <Menu
                open={!!addVestingContractMenuAnchorEl}
                anchorEl={addVestingContractMenuAnchorEl}
                onClose={() => setAddVestingContractMenuAnchorEl(null)}>
                <MenuItem disabled={contractCreateState !== 'idle'} onClick={createContract}>Create</MenuItem>
                <MenuItem disabled={contractCreateState !== 'idle'} onClick={() => setIsByoModalOpen(true)}>Add Existing</MenuItem>
            </Menu>
        </Stack>
        <Card>
            <CardContent>
                <VestingContractViewTable
                    vestingContracts={activeVestingContracts}
                    onFund={contractFundState === 'idle' ? fundContract : undefined}
                    onDelete={deleteContract}
                />
            </CardContent>
        </Card>


        <Dialog open={isByoModalOpen} onClose={() => setIsByoModalOpen(false)}>
            <DialogTitle>Bring your Own Vesting Contract</DialogTitle>
            <DialogContent>
                <Stack>
                    {/* TODO: fix chain */}
                    <AddressDisplay editable chain={'eth'} fullWidth value={byoContractAddress} onChange={setByoContractAddress} />
                    <Button
                        variant="contained"
                        disabled={contractCreateState !== 'idle' || !byoContractAddress}
                        onClick={() => addExistingVestingContract(byoContractAddress, { address: selectedTokenAddress })}>
                        Add Contract
                    </Button>
                </Stack>
            </DialogContent>
        </Dialog>

        <AlertDialog title={'Error'} open={!!errorText} text={errorText ?? ''} onClose={() => setErrorText(null)} />

        <TransactionWaitProgressBackdrop status={contractCreateState}/>
        <TransactionWaitProgressBackdrop status={contractFundState}/>

        <SuccessDialog
            open={contractCreateState === 'confirmed' && activeVestingContracts.length > 0}
            message={`A vesting contract for ${createdTokenTitle} token has been created successfully!`}
            primaryAction={() => { navigate(`/founder/tokens/${selectedTokenAddress}/vesting-contracts/?action=fund&vestingContractAddress=${vestingContractInActionAddress}`); setContractCreateState('idle') }}
            primaryButtonText={'Fund the contract'}
            secondaryAction={() => setContractCreateState('idle')}
            secondaryButtonText={'Maybe later'}
        />

        <SuccessDialog
            open={contractFundState === 'confirmed'}
            message={`A vesting contract for ${createdTokenTitle} token has been funded successfully!`}
            primaryAction={() => { navigate(`/founder/vesting-contracts/${vestingContractInActionAddress}/schedule/create`); setContractFundState('idle'); }}
            primaryButtonText={'Create a schedule'}
            secondaryAction={() => setContractFundState('idle')}
            secondaryButtonText={'Maybe later'}
        />

    </DashboardPageLayout>
}

export default VestingContractPage;