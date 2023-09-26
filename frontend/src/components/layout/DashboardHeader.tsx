import React from 'react';
import {AppBar, Button, Grid, IconButton, Toolbar, Typography, useMediaQuery, useTheme} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useMoralis } from 'react-moralis';
import { TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import vtvlLogo from '../../assets/vtvl-logo.svg';
import { useNavigate } from 'react-router-dom';
import ChainSelector from '../generic/ChainSelector';
import UserAddressSelector from '../generic/UserAddressSelector';

export interface DashboardHeaderProps {
  onDrawerToggle: () => void;
  pageTitle?: string | null;
  onSearchChange?: (value: string) => void;
  hasBackButton?: boolean;
}

export default function DashboardHeader(props: DashboardHeaderProps) {
  const { 
    onDrawerToggle,
    pageTitle = null,
    onSearchChange = null,
    hasBackButton = false,
  } = props;

  const { isAuthenticated } = useMoralis();

  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  return (
    <React.Fragment>
      {/* Mobile collapsible hamburger */}
      {isMobileView && <AppBar color="primary" position="sticky" elevation={0}>
        <Toolbar>
          <Grid container spacing={1} alignItems="center">
            <Grid item>
              <IconButton color="inherit" aria-label="open drawer" onClick={onDrawerToggle} edge="start">
                <MenuIcon />
                <img src={vtvlLogo} alt="vtvl.co Logo" style={ {width: 60, margin: '8px' }}/>
              </IconButton>
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>}
      {!isMobileView && <AppBar color="transparent" position="static" elevation={0} sx={{ zIndex: 0 }}>
      <Toolbar>
          <Grid container alignItems="center" spacing={1}>
            {onSearchChange && <Grid item xs>
                <SearchIcon />
                <TextField placeholder={'Search'} onChange={e => onSearchChange(e.target.value)} variant="standard" sx={ {marginLeft: 1 } } />
            </Grid>}
            {hasBackButton && <Grid item xs>
                <IconButton color="inherit" onClick={() => navigate(-1)}>
                    <ArrowBackIcon />
                </IconButton>
            </Grid>}

            <Grid item xs>
              {pageTitle && <Typography color="inherit" variant="h5" component="h1">
                {pageTitle}
              </Typography>}
            </Grid>

            <Grid item sx={{display: 'flex'}}>
              {/* <Typography variant="body2" sx={{mt: '6px', mx: 2 }}>Network: </Typography> */}
              <ChainSelector />
              <UserAddressSelector />
              {isAuthenticated && <>
                <Button sx={{mt: 0}} color="inherit" onClick={() => navigate('/profile/')}>Profile</Button>
                <Button sx={{mt: 0}} color="inherit" onClick={() => navigate('/logout/')}>Logout</Button>
              </>}
            </Grid> 

          </Grid>

        </Toolbar>
      </AppBar>}


    </React.Fragment>
  );
}