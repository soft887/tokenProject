import { Box, Typography, Button, Card, CardContent, CircularProgress, Stack, Dialog, DialogContent, DialogTitle, Alert } from "@mui/material";
import { FC, useEffect, useState } from "react";
import {useSelector} from "react-redux";
import { useMoralis } from "react-moralis";
import DashboardPageLayout from "../../../layout/DashboardPageLayout";
import TokenViewTable from "../../../token/TokenViewTable";
import { useAppDispatch } from '../../../../store/store';
import { doDeleteMyToken, fetchMyTokens, myTokensSelectors, selectMyTokensStatus } from '../../../../store/vestingSlice';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from "react-router";
import { Address } from "../../../../utils/types";

export type MyTokensPageProps = {
    
}

const MyTokensPage: FC<MyTokensPageProps> = () => {
    const { 
        Moralis, 
        user,  
        web3: web3Provider,  
        setUserData,
        chainId
    } = useMoralis();

    const navigate = useNavigate();
    const [tokenListUpdateError, setTokenListUpdateError] = useState<string|null>(null);
    
    const [tokenFilterPhrase, setTokenFilterPhrase] = useState('');

    const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false);

    const dispatch = useAppDispatch();
    const tokens = useSelector(myTokensSelectors.selectAll); 
    const tokenLoadState = useSelector(selectMyTokensStatus);

    useEffect(() => {
        Moralis && dispatch && (tokenLoadState !== 'loaded') && dispatch(fetchMyTokens({Moralis}))
    }, [Moralis, dispatch, tokenLoadState]);


    const handleDeleteTokenByAddress = async (tokenAddressToDelete: Address) => {
        if(!chainId) {
            return
        }

        try {
            await dispatch(doDeleteMyToken({Moralis, address: tokenAddressToDelete, chainId})).unwrap();
        }
        catch(e: any) {
            setTokenListUpdateError(`Error while deleting token from cached list: ${e.message}.`);
        }
    }

    const filteredTokens = ((tokenLoadState === 'loaded') && tokens.length > 0) ? tokens.filter(token => (token.name?.toLowerCase().indexOf(tokenFilterPhrase.toLowerCase()) !== -1) || (token.symbol?.toLowerCase().indexOf(tokenFilterPhrase.toLowerCase()) !== -1)) : [];

    return <DashboardPageLayout onSearchChange={setTokenFilterPhrase}>
        
        <Stack>
            <Stack direction="row" justifyContent={'space-between'} alignItems={'center'}>
                <Typography variant={'h4'}>My Tokens</Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setIsAddTokenModalOpen(true)} sx={{height: 30}}>Add</Button>
            </Stack>
            <Card>
                <CardContent>
                    <Box>
                        {/* Ignoring the fact that we're giving it partial entries */}
                        <TokenViewTable tokens={filteredTokens} onDelete={handleDeleteTokenByAddress} balanceAddress={user?.attributes?.ethAddress ?? null} />
                        {((tokenLoadState === 'loaded') && tokens.length === 0) && <Typography variant={'subtitle1'} sx={{textAlign: 'center', my: 4, fontWeight: 500}}>
                            No tokens yet. Click "Add" to create token.
                        </Typography>}
                        {((tokenLoadState === 'loading' || tokenLoadState === 'not-loaded')) && <CircularProgress />}
                        {((tokenLoadState === 'error')) && <Box>Error while loading tokens.</Box>}
                    </Box>
                </CardContent>
            </Card>
        </Stack>

        <Dialog open={isAddTokenModalOpen} onClose={() => setIsAddTokenModalOpen(false)}>
            <DialogTitle sx={{mx:1}}>Add Token</DialogTitle>
            <DialogContent>
                <Stack sx={{width: 300}}>
                    <Button variant="contained" color="primary"  sx={{m: 1}} onClick={() => navigate('/founder/tokens/mint/')}>Mint a new token</Button>
                    <Button variant="contained" color="secondary" sx={{m: 1}} onClick={() => navigate('/founder/tokens/import/')}>Import an existing token</Button>
                </Stack>
            </DialogContent>
        </Dialog>

        {tokenListUpdateError && <Alert severity={'error'}>{tokenListUpdateError}</Alert>}

    </DashboardPageLayout>
}

export default MyTokensPage;