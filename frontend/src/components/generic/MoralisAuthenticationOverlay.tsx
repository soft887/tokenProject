import React, { FC, useEffect, useState } from "react";
import { useMoralis } from "react-moralis";
import { CircularProgress } from "@mui/material";
import { Navigate, useLocation } from "react-router-dom";

export type MoralisAuthenticationOverlayProps = {
    element: React.ReactElement | null,
    needsWeb3Provider?: boolean
}

const MoralisAuthenticationOverlay: FC<MoralisAuthenticationOverlayProps> = (props) => {
    const { 
      // This is primarily a web3 auth overlay, so therefore, require web3 by default
      needsWeb3Provider = true,      
      element,
    } = props;

    const { 
      isAuthenticated, 
      enableWeb3, 
      isWeb3EnableLoading, 
      isWeb3Enabled,
      isAuthUndefined,
    } = useMoralis();

    const location = useLocation();
    
    const [errorText, setErrorText] = useState<string | null>(null);

    useEffect(() => {
        if(needsWeb3Provider && !isWeb3EnableLoading && !isWeb3Enabled) {
            !errorText && enableWeb3().then(web3Provider => {
                if(!web3Provider) {
                  // This serves to not infinitely retry
                  setErrorText("Web3 not working.")
                }
            });
        }
    }, [needsWeb3Provider, isWeb3EnableLoading, isWeb3Enabled]);

    // If auth is undefined, we still need to wait until it becomes defined. Otherwise we might redirect 
    // before we've actually established this is required
    if(isAuthUndefined) {
        return <CircularProgress />
    }

    // If the user is not confirmed not to be authenticated (auth defined but false), redirect them to login
    if(!isAuthenticated) {
      return <Navigate to={'/login/?afterAuthRedirectLocation=' + encodeURIComponent(location.pathname)} />
    }
    
    errorText && console.error(errorText)

    // Wait for web3Provider. We know we have user info, since auth is not undefined
    return (!needsWeb3Provider || isWeb3Enabled) ? element : <CircularProgress />;
}

export default MoralisAuthenticationOverlay;