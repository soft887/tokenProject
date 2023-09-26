import { CircularProgress, LinearProgress, LinearProgressProps, Stack, Typography } from "@mui/material";
import React from "react";
import { formatTokenAmount } from "../../utils/contract/token";

type NumericalProgressBarProps = {
    name?: string;
    valueCurrent?: number;
    valueEnd?: number;
    color?: LinearProgressProps['color'];
    valueSuffix?: string;
    showEndValue?: boolean;
    showPercentDecimals?: number; // how many decimals in percentages to show. null to not show
    barWidth?: number;
}


export const NumericalProgressBar = (props: NumericalProgressBarProps) => {
    const {
        name, 
        valueCurrent, 
        valueEnd, 
        color, 
        valueSuffix = null,
        showEndValue = false,
        showPercentDecimals = null,
        barWidth = undefined,
    } = props;

    const fraction = (valueCurrent && valueEnd) ? (valueCurrent / valueEnd) : 0.0;

    // Undefined, null and the sort
    if(!valueCurrent &&  valueCurrent !== 0) {
        return <CircularProgress />;
    }

    return <Stack>
        <Typography sx={{fontSize: 'inherit', fontWeight: 'inherit'}}>
            {valueCurrent} {valueSuffix}
            {showEndValue && <> / {valueEnd} {valueSuffix}</>}
            {showPercentDecimals !== null && <> ({(fraction * 100).toFixed(showPercentDecimals)} %)</>}
        </Typography>
        <LinearProgress color={color} variant="determinate" value={fraction * 100} sx={ { width: barWidth, height: 4, borderRadius: 4} } />
    </Stack>
}