import React, { useState } from 'react';
import Divider from '@mui/material/Divider';
import Drawer, { DrawerProps } from '@mui/material/Drawer';
import vtvlLogo from '../../assets/vtvl-logo-word.svg';
import vtvlIcon from '../../assets/vtvl-icon.svg';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Box, List, ListItem, ListItemIcon, ListItemButton, ListItemText, useTheme, CircularProgress, Backdrop } from "@mui/material";
import { useMoralis } from 'react-moralis';
import PieChartIcon from '@mui/icons-material/PieChart';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine, faGear, faCoins, faPieChart, faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { UserInterfaceRole } from '../../utils/types';
import { isNullishCoalesce } from 'typescript';

export default function DashboardNavigator(props: DrawerProps & {drawerWidth: number} ) {
  const { 
    drawerWidth, 
    PaperProps: drawerPaperProps,
    ...drawerProps 
  } = props;

  const {user, setUserData} = useMoralis();

  const [isChangingUserType, setIsChangingUserType] = useState(false);

  const theme = useTheme();
  const navigate = useNavigate();
  const {pathname} = useLocation();

  // const { user, isAuthenticated } = useMoralis();
  
  const tokenOwnerViewItems = [
    { id: 'My Tokens', icon: <FontAwesomeIcon icon={faCoins} />, path: '/founder/tokens/'},
    { id: 'Settings', icon: <FontAwesomeIcon icon={faGear} /> , path: '/founder/admin/'},
    { id: 'Send Tokens', icon: <FontAwesomeIcon icon={faPaperPlane} /> , path: '/founder/send-token/'},
  ];
  const tokenHolderViewItems = [
    { id: 'Overview', icon: <PieChartIcon />, path: '/employee/my-vesting-contracts/overview/'},
    { id: 'My Allocation', icon: <FontAwesomeIcon icon={faPieChart} />, path: '/employee/my-vesting-contracts/allocation-table/'},
  ]

  const enabledUserTypes = (user?.attributes?.enabledUserTypes ?? []) as (UserInterfaceRole[]);
  const defaultUserTypeView = (user?.attributes?.defaultUserTypeView ?? null) as (UserInterfaceRole | null);

  const hasGettingStarted = enabledUserTypes.length === 0;
  // TODO: perhaps we need to add permissions here as opposed to simply rendering the menu
  // Determine which view is present through the user attributes
  // const hasTokenOwnerView = (user?.attributes?.enabledUserTypes ?? []).indexOf('tokenOwner') !== -1;
  // Token holder view is default - assume we have it if we don't have the token owner view.
  // const hasTokenHolderView = !hasTokenOwnerView || (user?.attributes?.enabledUserTypes ?? []).indexOf('tokenHolder') !== -1;
  
  // TODO: remove the true - this is for debugging only
  const hasTokenOwnerView = defaultUserTypeView === 'tokenOwner';
  const hasTokenHolderView = defaultUserTypeView === 'tokenHolder';

  const switchUserTypeView = async (newDefaultUserTypeView: UserInterfaceRole) => {
    // No op if we're not changing anything
    if(newDefaultUserTypeView === user?.attributes?.defaultUserTypeView) {
      return;
    }

    setIsChangingUserType(true);
    try {
      await setUserData({defaultUserTypeView: newDefaultUserTypeView});
      // After we've changed the user, just go to the appropriate page
      navigate(newDefaultUserTypeView === 'tokenOwner' ? tokenOwnerViewItems[0].path : tokenHolderViewItems[0].path);
    }
    catch(e: any) {
      console.error(e);
    }
    setIsChangingUserType(false);
  }


  const categories = [
    {
      categoryTitle: '',
      children: [
          ...(hasGettingStarted ? [{ id: 'Getting Started', icon: <FontAwesomeIcon icon={faChartLine} />, path: '/getting-started/'}] : []),
          ...(hasTokenOwnerView ? tokenOwnerViewItems : []),
          ...(hasTokenHolderView ? tokenHolderViewItems : []),
      ]
    }
  ]

  const titleCaseToUrlPath = (x: string) => x.replace(/ /g, '-').toLowerCase();

  const menuTextColor = theme.palette.primary.contrastText;
  const paperProps = {
    sx: {
      backgroundColor: theme.palette.primary.main, 
      color: menuTextColor,
      width: drawerWidth,
      ...drawerPaperProps?.sx
    }, 
    ...drawerPaperProps
  };
  const listItemIconSx = {
      color: 'inherit',
      minWidth: 'auto',
      marginRight: 2,
      '& svg': {
          fontSize: 20,
      },
  }
  const listItemTextSx = {
      fontSize: 12,
      lineHeight: 1.25,
  }
  

  return <Drawer variant="permanent" PaperProps={paperProps} {...drawerProps}>
       {/* sx={{ backgroundColor: theme.palette.primary.main }} */}
      <List disablePadding>
        <ListItem sx={{px: 3, py: 2}}>
          <img src={vtvlIcon} alt="vtvl.co Icon" style={ {width: 32 }}/>
          <img src={vtvlLogo} alt="vtvl.co Logo" style={ {width: 80, paddingLeft: 10 }}/>
          {/* <ListItemIcon sx={{}}>
           
          </ListItemIcon>
          <ListItemText disableTypography sx={{listItemTextSx}}>
            
          </ListItemText>
             */}
        </ListItem>
        {categories.map(({ categoryTitle, children }, index) => (
          <Box key={index} sx={{px: 2, py: 4}}>
            {categoryTitle && <ListItem sx={{p: 0, mt: 1, fontWeight: 500, fontSize: 16}}>
              <ListItemText>{categoryTitle}</ListItemText>
            </ListItem>}
            {children.map((child: {id: string, path?: string, icon?: any}) => {
              const to = child?.path ?? (`/${titleCaseToUrlPath(categoryTitle)}/${titleCaseToUrlPath(child.id)}/`);
              const isSelected = to.indexOf(pathname) !== -1;
              const menuItemSx = {
                // py: '2px',
                // px: 3,
                // color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover, &:focus': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  borderRadius: 1,
                  // my: 1,
                  py: 1,
                  color: menuTextColor,
                
                };
                
              const listItemSx = {
                  my: 0.5,
                ...(isSelected ? {
                  backgroundColor:  theme.palette.primary.dark,
                  borderRadius: 1,
                } : null)
              };

              return (
                <ListItem disablePadding key={child.id} component={NavLink} to={to} sx={listItemSx}>
                  <ListItemButton selected={isSelected} sx={menuItemSx}>
                    <ListItemIcon sx={listItemIconSx}>{child.icon}</ListItemIcon>
                    <ListItemText disableTypography sx={listItemTextSx}>{child.id}</ListItemText>
                  </ListItemButton>
                </ListItem>
              )
            })}
            {index < categories.length - 1 && <Divider sx={{ mt: 2, backgroundColor: 'rgb(255,255,255,0.15)' }} />}
          </Box>
        ))}
        {(enabledUserTypes.length > 1) && <ListItem>
            <ListItemButton onClick={() => switchUserTypeView(hasTokenOwnerView ? 'tokenHolder' : 'tokenOwner')} disabled={isChangingUserType}>
              <ListItemText>Switch to token {hasTokenOwnerView ? 'holder' : 'owner'} view</ListItemText>
            </ListItemButton>
        </ListItem>}
      </List>
      
      <Backdrop open={isChangingUserType}>
          <CircularProgress />
      </Backdrop>
    </Drawer>;
}