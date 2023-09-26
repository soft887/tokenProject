import React, { FC, useEffect, useState } from "react";
import { Box, Button, Grid, Paper, TextField, MenuItem, TableContainer, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import { Duration, format as formatDate, add as addDate, parseISO as parseISODate, formatDistance, formatDuration, formatDistanceToNow } from 'date-fns';
import { ClaimInfo, TokenInfo} from '../../utils/types'
import { BigNumber, BigNumberish, utils } from "ethers";
import { formatTokenAmount } from "../../utils/contract/token";
import { DATETIME_FORMAT } from "../../settings";

import {Chart,ArgumentAxis,ValueAxis,LineSeries,Title,Legend,} from '@devexpress/dx-react-chart-material-ui';

// import { getTokenDisplayableAmount } from "../../utils/contract/token";



export type ScheduleChartProps = {
    tokenInfo: TokenInfo
    claimInfo: ClaimInfo
}

const ScheduleChart: FC<ScheduleChartProps> = (props) => {
    const { 
        tokenInfo,
        claimInfo,
    } = props;


    const startAmt = +formatTokenAmount(claimInfo.cliffAmount, tokenInfo, {showSymbol: false, outputDecimals: 2});
    const endAmt = +formatTokenAmount(BigNumber.from(claimInfo.linearVestAmount).add(claimInfo.cliffAmount).toString(), tokenInfo, {showSymbol: false, outputDecimals: 2});

    // Repeat the same data point, but later in the future, to showcase everything has been vested (extend by 5% of schedule time - * 1000 / 20 )
    const scheduleFractionMsecs = (claimInfo.endTimestamp - claimInfo.startTimestamp) * 50;

    // Linear vesting has three crucial points, now, cliff time, and end time
    const chartData = [
        {  
            ts: (claimInfo.startTimestamp) * 1000 - scheduleFractionMsecs, 
            amount: 0,
        },
        {   // Cliff moment
            ts: (claimInfo.startTimestamp - 1)* 1000, 
            amount: 0,
        },
        {
            ts: claimInfo.startTimestamp * 1000, 
            amount: startAmt
        },
        {
            ts: claimInfo.endTimestamp * 1000, 
            amount: endAmt
        },
        { 
            ts: claimInfo.endTimestamp * 1000 + scheduleFractionMsecs,
            amount: endAmt
        },
    ];



    return <Chart data={chartData}>
        {/* @ts-ignore */}
        <ArgumentAxis tickFormat={() => tick => formatDate(tick, DATETIME_FORMAT)} />
        {/* <ArgumentAxis /> */}
        {/* @ts-ignore */}
        {/* <ValueAxis tickFormat={() => tick => +formatTokenAmount(tick, tokenInfo, {outputDecimals: 2, showSymbol: false})}/> */}
        <ValueAxis />
        {/* <ValueAxis max={50} labelComponent={({text,...props}) => <ValueAxis.Label {...props} text={text} />} /> */}
        <LineSeries name="Amount vested" valueField="amount" argumentField="ts" />
        <Title text={`Amount vested over time`} textComponent={props => <Title.Text {...props} sx={{ whiteSpace: 'pre' }} />} />
    </Chart>
//   <TableCell>{formatDate(new Date(schItem.absoluteTimestampSecs * 1000), DATETIME_FORMAT)}</TableCell>
//   <TableCell>{formatDistanceToNow(new Date(schItem.absoluteTimestampSecs * 1000))}</TableCell>
//   <TableCell>{formatTokenAmount(schItem.amount, token)}</TableCell>
    
}

export default ScheduleChart;