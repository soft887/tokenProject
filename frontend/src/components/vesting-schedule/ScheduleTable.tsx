import React, { FC, useEffect, useState } from "react";
import { Box, Button, Grid, Paper, TextField, MenuItem, TableContainer, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import { Duration, format as formatDate, add as addDate, parseISO as parseISODate, formatDistance, formatDuration, formatDistanceToNow } from 'date-fns';
import { TokenInfo} from '../../utils/types'
import { BigNumber, BigNumberish, utils } from "ethers";
import { formatTokenAmount } from "../../utils/contract/token";
import { DATETIME_FORMAT } from "../../settings";
// import { getTokenDisplayableAmount } from "../../utils/contract/token";


type AbsoluteVestingScheduletem = {
    absoluteTimestampSecs: number; // absolute timestamp of this - shouldnt be Date due to redux serialization issues
    amount: string; // Amount in wei, convertible to BigNumber. To appease Redux, we don't use the BigNumber, and to be more consistent, we always use the raw value and convert while displaying
}

type RelativeVestingScheduleItem = {
    timeElapsed: Duration;
    amount: string;
}



export type ScheduleTableProps = ({
    scheduleItems: AbsoluteVestingScheduletem[],
    // scheduleItems: any,
    type: 'absolute',
    referenceDate?: undefined // must be undefined as it makes no sense here
} | {
    scheduleItems: RelativeVestingScheduleItem[],
    // scheduleItems: any,
    type: 'relative',
    referenceDate?: Date
}) & {
    token: TokenInfo
}

const ScheduleTable: FC<ScheduleTableProps> = (props) => {
    const { 
        token,
        scheduleItems,
        type: scheduleType,
        referenceDate = new Date(),
     } = props;
    
    return <TableContainer component={Paper}>
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Date Delta</TableCell>
                    <TableCell>Amount</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {scheduleType === 'absolute' && scheduleItems.map(schItem => <TableRow key={schItem.absoluteTimestampSecs}>
                        <TableCell>{formatDate(new Date(schItem.absoluteTimestampSecs * 1000), DATETIME_FORMAT)}</TableCell>
                        <TableCell>{formatDistanceToNow(new Date(schItem.absoluteTimestampSecs * 1000))}</TableCell>
                        <TableCell>{formatTokenAmount(schItem.amount, token)}</TableCell>
                    </TableRow>
                )}
                {scheduleType === 'relative' && scheduleItems.map((schItem, i) => <TableRow key={i}>
                        <TableCell>{formatDate(addDate(referenceDate, schItem.timeElapsed ), DATETIME_FORMAT)}</TableCell>
                        <TableCell>{formatDuration(schItem.timeElapsed)}</TableCell>
                        <TableCell>{formatTokenAmount(schItem.amount, token)}</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </TableContainer>
}

export default ScheduleTable;