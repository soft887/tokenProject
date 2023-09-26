import React from 'react';
import {BoxProps} from '@mui/material';
import {RoundType} from '../../../utils/types';
import ColorChip from './ColorChip';

export type RoundTypeChipProps = BoxProps & {
    roundType: RoundType
}


export const roundTypeColors: {[k in RoundType]: string} = {
    Private: '#E9D0A0', 
    'Pre-seed': '#A5DBE0', 
    Seed: '#A5D0BB',
} as const;


export default function RoundTypeChip(props: RoundTypeChipProps) {
    const {roundType, ...rest} = props;

    const backgroundColor = roundTypeColors[roundType];

    return <ColorChip {...rest} backgroundColor={backgroundColor}>
        {roundType}
    </ColorChip>
}


