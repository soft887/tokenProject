import React, { FC } from "react";
import { Box, Link as MuiLink, Typography, useTheme } from "@mui/material";

interface FooterProps {
    
}

const Footer: FC<FooterProps> = (props) => {
    const {
    } = props;

    const theme = useTheme();

    return <Box component="footer" sx={{ p: 2 }}>
        <Typography variant="body2" color="primary" align="center" {...props}>
            {'Copyright © '}
            <MuiLink color="inherit" href="https://vtvl.co/">
                vtvl.co
            </MuiLink>{' '}
            {new Date().getFullYear()}
        {'.'}
        </Typography>
    </Box>
}

export default Footer;