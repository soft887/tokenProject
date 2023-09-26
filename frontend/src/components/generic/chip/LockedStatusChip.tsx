import React from 'react';
import {BoxProps} from '@mui/material';
import ColorChip from './ColorChip';

export type LockedStatusChipProps = BoxProps & {
    lockedStatus: 'Locked' | 'Unlocked'
}


export const colors: {[k in LockedStatusChipProps['lockedStatus']]: string} = {
    Locked: '#D7E5DE', 
    Unlocked: '#C99', 
} as const;

export default function LockedStatusChip(props: LockedStatusChipProps) {
    const {lockedStatus, ...rest} = props;

    const backgroundColor = colors[lockedStatus];
    return <ColorChip {...rest} backgroundColor={backgroundColor}>
        {lockedStatus}
    </ColorChip>
}


