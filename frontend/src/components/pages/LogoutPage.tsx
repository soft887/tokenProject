import { FC, useEffect } from "react";
import { Link as MuiLink, Typography } from "@mui/material";
import { useMoralis } from "react-moralis";
import { CircularProgress } from "@mui/material";
import MarketingPageLayout from "../layout/MarketingPageLayout";

const LogoutPage: FC = () => {
    const { 
        logout,
        isLoggingOut,
        isAuthenticated
    } = useMoralis();

    useEffect( () => {
        if(isAuthenticated && !isLoggingOut) {
            localStorage.removeItem('simpleAuthString')
            logout();
        }
    }, [isLoggingOut, isAuthenticated]);

    return <MarketingPageLayout>
        {(isLoggingOut && !isAuthenticated) ? <>
            <CircularProgress /> 
            <Typography>Logging you out...</Typography>
        </>: <Typography>
            You've successfully logged out. To log in again, <MuiLink color="inherit" href="/login/">click here</MuiLink>.
        </Typography>}
    </MarketingPageLayout>
}

export default LogoutPage;