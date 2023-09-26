import React from 'react';
import {BoxProps} from '@mui/material';
import {UserType} from '../../../utils/types';
import ColorChip from './ColorChip';

export type UserTypeChipProps = BoxProps & {
    userType: UserType
}


export const userTypeColors: {[k in UserType]: string} = {
    Founder: '#DCC8D5', 
    Team: '#B9CAD9', 
    Investor: '#EECDCF',
} as const;

export default function UserTypeChip(props: UserTypeChipProps) {
    const {userType, ...rest} = props;

    const backgroundColor = userTypeColors[userType];
    return <ColorChip {...rest} backgroundColor={backgroundColor}>
        {userType}
    </ColorChip>
}


