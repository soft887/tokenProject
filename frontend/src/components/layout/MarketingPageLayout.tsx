import { useState, FC } from "react";
import { Box, CssBaseline, useTheme, useMediaQuery } from "@mui/material";
import ErrorBoundary from "../generic/ErrorBoundary";
import { makeStyles } from "../../theme";

import MarketingHeader from "./MarketingHeader";

export type MarketingPageLayoutProps = {
    children?: any;
}; // & Pick<MarketingHeaderProps, ''>;

const useStyles = makeStyles<{isDrawerOpen: boolean}>()((theme: any, {isDrawerOpen}) => ({

}));

const drawerWidth = 256;

const MarketingPageLayout: FC<MarketingPageLayoutProps> = (props) => {
    const {
        children,
    } = props;

    const theme = useTheme();
    const isMobileView = useMediaQuery(theme.breakpoints.down('sm'));

    const [mobileOpen, setMobileOpen] = useState(false);
    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' , backgroundColor: '#FFFFFF'}}>
            <CssBaseline />
            
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <MarketingHeader 
                    onDrawerToggle={handleDrawerToggle} 
                    />
                <Box component="main" sx={{ flex: 1, py: 6, px: 5, backgroundColor: theme.palette.background.default }}>
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </Box>
            
            </Box>
      </Box>);
}

export default MarketingPageLayout;