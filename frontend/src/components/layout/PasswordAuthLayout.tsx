import React, { useEffect, FC, useState } from "react";
import { Box, Button, Card, CardContent, CardHeader, CircularProgress, Stack, TextField } from "@mui/material";
import { useNavigate, useLocation } from "react-router";
import MarketingPageLayout from "./MarketingPageLayout";

export type PasswordAuthLayoutProps = {
  children?: any;
  password?: string | null;
  type?: 'prompt' | 'ui'
}

const PasswordAuthLayout: FC<PasswordAuthLayoutProps> = (props) => {
  const {
    children,
    type = 'ui',
    password = null,
  } = props;

  const navigate = useNavigate();

  // If password is null, then we immediately have local auth
  const [hasLocalAuth, setHasLocalAuth] = useState(password === null);
    
  const [localPassword, setLocalPassword] = useState("");

  const obfuscatingFactor = 0.003125; // Obfuscating factor - we multiply by that amount to calculate the timestamp we store so that it isn't as obvious from localstorage that it's a TS
  const amountOfTimeBeforePasswordValidityExpiryMsecs = 24 * 60 * 60 * 1000; // after entering a valid password, remember that state for 24h
  const checkAuthPeriodicityMsecs = 5 * 60 * 1000; // check every 5 mins
  
  const checkAuth = () => {
    // No password means we're good
    if(password === null) {
      setHasLocalAuth(true);
      return;
    }

    // If we have a local pw, update the state that we're authenticated
    const authString = localStorage.getItem("simpleAuthString");

    const lastAuthTime = (authString && !isNaN(+authString)) ? +authString : null;

    // const isAuthStringValid = lastAuthTime && ((new Date().getTime() - lastAuthTime) < validity);
    const isAuthStringValid = lastAuthTime && ((new Date().getTime() - lastAuthTime / obfuscatingFactor) < amountOfTimeBeforePasswordValidityExpiryMsecs);

    if(isAuthStringValid) {
        setHasLocalAuth(true);
    }
    else {
      setHasLocalAuth(false);
      if(type === 'prompt') {
        setTimeout(() => {
          // run async, so that the UI gets cleared before
          let passwordEntered = prompt("Please enter the passcode.");
          submitLocalPw(passwordEntered);
        })
      }
    }
  }

  const submitLocalPw = (passwordEntered: string | null) => {
    if (passwordEntered === password) {
      localStorage.setItem("simpleAuthString", Math.round((new Date()).getTime() * obfuscatingFactor).toString()); // previously "DontPeekIntoOurCode"
      setHasLocalAuth(true); // We're correctly authd
      setLocalPassword(""); // Do not recycle the password
    } else if(type === 'prompt')  {
      // enough to just refresh the current route to re display the modal
      // Need to do this only if type is prompt, to keep bringing the modal back
      navigate(0); 
    }
    return false;
  }

  useEffect(() => {
    // Check auth immediately, and also periodically verify it's valid
    checkAuth();
    const timer = setInterval(checkAuth, checkAuthPeriodicityMsecs);
    return () => clearInterval(timer);
  }, []);

  if(hasLocalAuth) {
    return children;
  }
  else {
    return (type === 'prompt' ? <Box>
      <CircularProgress />
      Please enter the password...
    </Box> : <MarketingPageLayout>
        <Card sx={{width: 300, m: "auto"}}>
          <CardHeader title="Access Limited" />
          <CardContent>
            <Stack spacing={2} component="form" onSubmit={() => submitLocalPw(localPassword)}> 
              <TextField 
                label="Enter password" 
                value={localPassword} 
                onChange={e => setLocalPassword(e.target.value)} 
                error={localPassword !== password}
                helperText={(localPassword !== password) ? "Please enter the password to proceed." : "" }
                />
              <Button variant="contained" type="submit" disabled={localPassword !== password}>Submit</Button>
            </Stack>
          </CardContent>
        </Card>
    </MarketingPageLayout>)
  }




}

export default PasswordAuthLayout