import { FC, useState } from "react";
import { ethers } from "ethers"
import { Alert, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import DashboardPageLayout from "../../../layout/DashboardPageLayout";
import AddressDisplay from "../../../address/AddressDisplay";
import { useMoralis } from "react-moralis";
import { loadTokenMetadataFromContract } from "../../../../utils/contract/token";
import ERC20Token from "@vtvl/openzeppelin-artifacts/token/ERC20/ERC20.sol/ERC20.json";
import { useAppDispatch } from "../../../../store/store";
import { doAddMyToken } from "../../../../store/vestingSlice";
import { Address } from "../../../../utils/types";
import BackButton from "../../../generic/buttons/BackButton";

const TokenImportPage: FC = () => {
    const navigate = useNavigate();

    const [newTokenAddress, setNewTokenAddress] = useState<Address>("");
    const [errorText, setErrorText] = useState<string | null>(null);
    const [isAddressValid, setIsAddressValid] = useState(false);

    const { Moralis, user, web3: web3Provider } = useMoralis();

    const dispatch = useAppDispatch();

    const handleAddTokenByAddress = async () => {
        // const ethers = Moralis.web3Library;



        if (!newTokenAddress) {
            setErrorText("Invalid token address. This is likely due to an invalid/non-existing contract selected.");
            return;
        }
        else if (!ethers || !web3Provider) {
            setErrorText("web3 Provider not initialized.");
            return;
        }
        else {
            setErrorText(null);
        }

        try {
            const tokenContract = new ethers.Contract(newTokenAddress, ERC20Token.abi, web3Provider.getSigner());
            await tokenContract.deployed();

            //  Pull all the information before writing to the DB
            const tokenInfo = await loadTokenMetadataFromContract(tokenContract);

            // Start off with contractType = null, assuming we know nothing about the contract
            let contractType = null;

            // TODO: try to detect if the contract matches one of the VTVL contract types
            // if(detectContractType(tokenContract)) {

            // }
            // else {

            // }
            console.log("Unable to detect contract type. Some token operations might be unavailable.");

            await dispatch(doAddMyToken({
                Moralis, 
                contractType, 
                ownerAddresses: [], // Do we know who the owner is? Maybe we want to initialize it with the signer or whatever
                ...tokenInfo
            })).unwrap();

            navigate('/founder/tokens/');
        }
        catch (e: any) {
            setErrorText(`Error while adding token to cache. Please make sure that the address is valid and that it contains an ERC20 token that wasn't previously added.`);
            console.error("Error:", { message: e?.message })
        }
    }

    return <DashboardPageLayout>
        <BackButton />
        <Typography variant={'h4'}>Import an Existing Token</Typography>
        <Card>
            <CardContent>
                <Stack spacing={2} sx={{ width: 380, mt: 1 }}>
                    <AddressDisplay
                        fullWidth
                        editable
                        chain={'eth'}
                        label="Address"
                        value={newTokenAddress}
                        onChange={(addr, isValid) => { setNewTokenAddress(addr); setIsAddressValid(isValid); }}
                    />
                    <Button color={'primary'} disabled={!isAddressValid} variant={'contained'} onClick={handleAddTokenByAddress}>Add</Button>
                    {errorText && <Alert severity={'error'}>{errorText}</Alert>}
                </Stack>
            </CardContent>
        </Card>
    </DashboardPageLayout>
}

export default TokenImportPage;