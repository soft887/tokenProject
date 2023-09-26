import React, { useState, FC } from "react";
import { Box, CssBaseline, useTheme, useMediaQuery } from "@mui/material";
import Footer from "./Footer";
import ErrorBoundary from "../generic/ErrorBoundary";
import { makeStyles } from "../../theme";

import DashboardNavigator from "./DashboardNavigator";
import DashboardHeader, {DashboardHeaderProps} from "./DashboardHeader";

export type DashboardPageLayoutProps = {
    children?: any;
    headerTitle?: string | null;
} & Pick<DashboardHeaderProps, 'onSearchChange' | 'hasBackButton'>;

const useStyles = makeStyles<{isDrawerOpen: boolean}>()((theme: any, {isDrawerOpen}) => ({

}));

const drawerWidth = 256;

const DashboardPageLayout: FC<DashboardPageLayoutProps> = (props) => {
    const {
        children,
        headerTitle = null,
        onSearchChange = undefined,
        hasBackButton = false,
    } = props;

    const theme = useTheme();
    const isMobileView = useMediaQuery(theme.breakpoints.down('sm'));

    const [mobileOpen, setMobileOpen] = useState(false);
    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' , backgroundColor: '#E5E5E5'}}>
            <CssBaseline />
            <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
                {isMobileView && <DashboardNavigator drawerWidth={drawerWidth} variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} />}
                <DashboardNavigator drawerWidth={drawerWidth} sx={{ display: { sm: 'block', xs: 'none' } }} />
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <DashboardHeader 
                    onDrawerToggle={handleDrawerToggle} 
                    pageTitle={headerTitle} 
                    onSearchChange={onSearchChange}
                    hasBackButton={hasBackButton}
                    />
                <Box component="main" sx={{ flex: 1, py: 6, px: 5, backgroundColor: theme.palette.background.default }}>
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </Box>
            
                <Footer />
            </Box>
      </Box>);
}

export default DashboardPageLayout;