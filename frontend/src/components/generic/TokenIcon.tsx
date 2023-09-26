import React from 'react';
import {Box, BoxProps} from '@mui/material';

export type TokenIconProps = BoxProps & {
    url?: string|null;
    alt?: string;
    size?: number;
};

export default function TokenIcon(props: TokenIconProps) {
    const {
        url, 
        alt = "",
        size = 20,
        ...rest
    } = props;

    return <Box sx={{width: size, height: size}} {...rest}>
        {url && <img style={{width: '100%', height: '100%'}} src={url} alt={alt} />}
    </Box>;
}


