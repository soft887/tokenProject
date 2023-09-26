import React from 'react';
import {Box, BoxProps} from '@mui/material';

export type ColorChipProps = BoxProps & {
    backgroundColor: string;
};

export default function ColorChip(props: ColorChipProps) {
    const {
        backgroundColor, 
        children, 
        ...rest
    } = props;

    return <Box 
        borderRadius={2} 
        {...rest} 
        sx={{
            backgroundColor,
            textAlign: 'center',
            p: 0.5,
            ...rest?.sx,
        }}>
        {children}
    </Box>
}


