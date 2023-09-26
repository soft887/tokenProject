import { FC, useState } from "react";
import { ethers } from "ethers"
import { Alert, Backdrop, Card, CardContent, CircularProgress, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import DashboardPageLayout from "../../../layout/DashboardPageLayout";
import TokenMintForm from "../../../token/TokenMintForm";
import { useMoralis } from "react-moralis";
import { loadTokenMetadataFromContract } from "../../../../utils/contract/token";
import ERC20Token from "@vtvl/openzeppelin-artifacts/token/ERC20/ERC20.sol/ERC20.json";
import { useAppDispatch } from "../../../../store/store";
import { doAddMyToken } from "../../../../store/vestingSlice";
import { Address, TokenContractType, TokenInfo, BlockchainTransactionStatus } from "../../../../utils/types";
import SuccessDialog from "../../../generic/SuccessDialog";
import BackButton from "../../../generic/buttons/BackButton";
import AlertDialog from "../../../generic/dialogs/AlertDialog";
import TransactionWaitProgressBackdrop from "../../../progress/TransactionWaitProgressBackdrop";
import { sleep } from "../../../../utils/helpers";
import { isDebug } from "../../../../settings";

const TokenMintPage: FC = () => {

    const navigate = useNavigate();

    const { Moralis, web3: web3Provider, chainId } = useMoralis();

    const dispatch = useAppDispatch();

    // Pending is transaction has been initiated, in-progress is waiting for the transaction, confirmed => show success modal
    const [tokenMintState, setTokenMintState] = useState<BlockchainTransactionStatus>("idle");

    const [newTokenAddress, setNewTokenAddress] = useState<Address | null>(null);
    const [mintErrorMessage, setMintErrorMessage] = useState<string|null>(null);
    const [createdTokenTitle, setCreatedTokenTitle] = useState<string | null>(null);

    // TODO: unify logic with Import Page
    const handleMint = async (tokenParams: TokenInfo, contractType: TokenContractType) => {
        // const ethers = Moralis.web3Library;

        if(!tokenParams.address) {

            throw new Error("Invalid token address. This is likely due to an invalid/non-existing contract selected.");
        }
        if (!ethers || !web3Provider) {
            throw new Error("web3 Provider not initialized.");
        }

        try {
            setTokenMintState('in-progress');
            setNewTokenAddress(tokenParams.address);
            const tokenContract = new ethers.Contract(tokenParams.address, ERC20Token.abi, web3Provider.getSigner());
            // We must wait for it to be deployed
            await tokenContract.deployed();

            //  Pull all the information before writing to the DB
            const freshTokenInfo = await loadTokenMetadataFromContract(tokenContract);
            setCreatedTokenTitle(`${freshTokenInfo.name} (${freshTokenInfo.symbol})`);

            const {iconUrl} = freshTokenInfo;

            const tokenEntry = {
                Moralis, 
                iconUrl, 
                contractType, 
                ownerAddresses: await web3Provider.listAccounts(),
                ...freshTokenInfo
            };

            await dispatch(doAddMyToken(tokenEntry)).unwrap();

            setTokenMintState('confirmed');
        }
        catch (e) {
            setMintErrorMessage(`Error while adding token to cache: ${JSON.stringify(e)}.`);
            setTokenMintState('idle');
        }
    }

    // const navigateOpts: ({path: string, title: string} & ButtonProps)[] = [
    //     {path: `/founder/vesting-contracts/${newTokenAddress}/?action=create`, title: 'Create a Vesting Contract', color: 'primary'},
    //     {path: `/founder/tokens/`, title: 'Maybe later',},
    // ];

    return <DashboardPageLayout>

        <BackButton />
        <Typography variant={'h4'}>Mint a new token</Typography>
        <Card>
            <CardContent>
                <TokenMintForm 
                    onMintStart={() => setTokenMintState('pending')} 
                    onMintWaiting={() => setTokenMintState('in-progress')} 
                    onMintError={(errorMessage) => {setTokenMintState('idle'); setMintErrorMessage(errorMessage);} } 
                    onMintEnd={handleMint} 
                    sx={{ width: 380 }} />
            </CardContent>
        </Card>

        <TransactionWaitProgressBackdrop status={tokenMintState} />

        <SuccessDialog
            open={tokenMintState === 'confirmed'}
            // onClose={() => setTokenMintState('idle')}
            message={`${createdTokenTitle ?? 'Token'} token successfully created!`}
            primaryAction={() => navigate(`/founder/tokens/${newTokenAddress}/vesting-contracts/?action=create`)}
            secondaryAction={() => navigate(`/founder/tokens/`)}
            primaryButtonText={'Create a vesting contract'}
            secondaryButtonText={'Maybe later'}
        />
        {mintErrorMessage && <Alert severity="error">{mintErrorMessage}</Alert>}

    </DashboardPageLayout>
}

export default TokenMintPage;