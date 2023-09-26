import React from 'react';
import {AppBar, Button, Grid, IconButton, Toolbar, Link as MuiLink, useMediaQuery, useTheme} from '@mui/material';
import { useMoralis } from 'react-moralis';
import vtvlIconDarkBg from '../../assets/vtvl-icon-dark-bg.svg';
import vtvlLogoWordDark from '../../assets/vtvl-logo-word-dark.svg';
import { NavLink } from 'react-router-dom';
import ColorChip from '../generic/chip/ColorChip';

export interface MarketingHeaderProps {
    onDrawerToggle: () => void;
}

export default function MarketingHeader(props: MarketingHeaderProps) {
  const { 
    onDrawerToggle
  } = props;

  const { web3: web3Provider, isWeb3Enabled, enableWeb3, isAuthenticated, Moralis, user } = useMoralis();

  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <React.Fragment>
      {/* Mobile collapsible hamburger */}
      {<AppBar color="transparent" position={isMobileView ? "sticky" : "static"} elevation={0} sx={{ zIndex: 0, backgroundColor: '#FBF9F6' }}>
        <Toolbar>
          <Grid container spacing={1} alignItems="center" justifyContent={"space-between"}>
            <Grid item>
              <MuiLink href={'/'}>
                <IconButton color="inherit" aria-label="open drawer" onClick={onDrawerToggle} edge="start">
                  <img src={vtvlIconDarkBg} alt="vtvl.co Logo" style={ {width: 60, margin: '8px' }}/>
                  <img src={vtvlLogoWordDark} alt="vtvl.co Logo" style={ {width: 60, margin: '8px' }}/>
                </IconButton>
              </MuiLink>
              <ColorChip backgroundColor="#E5E5E5" borderRadius={6} display="inline-block" sx={{textTransform: 'uppercase', px: 2}}>Private Beta</ColorChip>
            </Grid>
            <Grid item sx={{"& > *": {px: 1}}}>
                <MuiLink component={NavLink} to={'/features/'} underline="none">Features</MuiLink>
                <MuiLink component={NavLink} to={'/about/'} underline="none">About</MuiLink>
                <MuiLink href={'/join-waitlist/'}>
                  <Button variant={'contained'}>Join our Waitlist</Button>
                </MuiLink>
            </Grid>
          </Grid>
        </Toolbar>
        {/* {isAuthenticated && <Button sx={{mt: 0}} color="inherit" onClick={() => navigate('/logout')}>
                Logout
              </Button>} */}
      </AppBar>}
      
    </React.Fragment>
  );
}