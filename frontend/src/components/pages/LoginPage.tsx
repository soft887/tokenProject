import React, { FC, useEffect, useState } from "react";
import { 
    Box, Button, Link as MuiLink, Typography, 
    DialogTitle, DialogContent, DialogActions, Dialog,
    FormGroup, FormControlLabel, Checkbox
} from "@mui/material";
import { useMoralis } from "react-moralis";
import { CircularProgress } from "@mui/material";
import { useNavigate } from "react-router";
import MarketingPageLayout from "../layout/MarketingPageLayout";
import { formatISO } from "date-fns";
import ChainSelector from "../generic/ChainSelector";
import { useSearchParams } from "react-router-dom";


const LoginPage: FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const afterAuthRedirectLocation = searchParams.get('afterAuthRedirectLocation') ?? '/';

    const { 
        user,
        authenticate,
        isLoggingOut,
        setUserData,
        isAuthenticated,
        isWeb3EnableLoading,
        isWeb3Enabled,
        enableWeb3
    } = useMoralis();

    const navigate = useNavigate();

    // useEffect( () => {
    //     if(isAuthenticated && !isLoggingOut) {
    //         logout();
    //     }
    // }, [isLoggingOut, isAuthenticated]);

    const [showTnC, setShowTnC] = useState<boolean>(false);
    const closeTnCModal = () => setShowTnC(false);

    const [areTermsAccepted, setAreTermsAccepted] = useState(false);
    const [isLoginInProgress, setIsLoginInProgress] = useState(false);

    const handleAuthenticate = async () => {
        setIsLoginInProgress(true);

        try {
            const user = await authenticate();
    
            user?.set('termsAndConditionsAccepted', {
                date: formatISO(new Date()), 
                // TODO: terms and conditions versioning - should be implemented in conjunction with the T&C page
            });
            // No need to await
            await user?.save();
            // console.log('Successfully authenticated', user);
            
            navigate(afterAuthRedirectLocation);
        }
        catch(e) {

        }
        setIsLoginInProgress(false);
    }
    
    const [errorText, setErrorText] = useState<string|null>(null);
    // We need Web3 for chain detection
    // TODO: should reuuse code from MoralisAuthenticatiaonOverlay
    useEffect(() => {
        if(!isWeb3EnableLoading && !isWeb3Enabled) {
            !errorText && enableWeb3().then(web3Provider => {
                if(!web3Provider) {
                  // This serves to not infinitely retry
                  setErrorText("Web3 not working.")
                }
            });
        }
    }, [isWeb3EnableLoading, isWeb3Enabled]);

    return <MarketingPageLayout>
        {(isLoginInProgress || (isLoggingOut && !isAuthenticated)) ? 
        <>
            <CircularProgress /> Logging you in, please confirm the login in your wallet...
        </>
        :
        <>
            <Dialog open={showTnC} onClose={closeTnCModal}>
                <DialogTitle >Connect Wallet</DialogTitle>
                <DialogContent>
                    <Box sx={{mt: 2}}>
                        <FormGroup>
                            {/* This will just force the user select the appropriate chain */}
                            <Typography sx={{fontWeight: '', fontSize: '14px'}}>
                                Please select the chain
                            </Typography>
                            <ChainSelector />
                        </FormGroup>
                        <FormGroup>
                            <FormControlLabel 
                                control={<Checkbox checked={areTermsAccepted} onChange={(e)=>setAreTermsAccepted(e.target.checked)}/>} 
                                label={
                                    <Typography sx={{fontWeight: '', fontSize: '14px'}}>
                                        I accept the VTVL <MuiLink href="/terms/" underline="always">Terms and Conditions</MuiLink>.
                                    </Typography>
                                } 
                            />
                        </FormGroup>
                    </Box> 
                </DialogContent>
                <DialogActions>
                    <Button variant={'contained'} onClick={handleAuthenticate} disabled={!areTermsAccepted}>Proceed to Connect Wallet</Button>
                </DialogActions>
            </Dialog>
            {/* <Button variant={'contained'} onClick={handleAuthenticate}>Authenticate</Button> */}
            <Box sx={{textAlign: 'center'}}>
                {/* Shortcircuit TnC if we have a valid consent */}
                <Button variant={'contained'} onClick={()=>setShowTnC(true)}>Authenticate</Button>
            </Box>
        </>}
    </MarketingPageLayout>
}

export default LoginPage;