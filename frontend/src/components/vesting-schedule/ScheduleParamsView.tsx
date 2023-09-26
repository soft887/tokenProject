import React, { FC, useEffect, useState } from "react";
import { Box, Button, Paper, TextField, MenuItem, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, List, ListItem, Stack, Typography } from "@mui/material";
import { Duration, format as formatDate, add as addDate, parseISO as parseISODate, formatDistance, formatDuration, formatDistanceToNow } from 'date-fns';
import { ClaimInfo, TokenInfo} from '../../utils/types'
import { BigNumber, BigNumberish, utils } from "ethers";
import { formatTokenAmount } from "../../utils/contract/token";
import { DATETIME_FORMAT, DATETIME_S_FORMAT } from "../../settings";
// import { getTokenDisplayableAmount } from "../../utils/contract/token";



export type ScheduleParamsViewProps = {
    claimInfo: ClaimInfo;
    token?: TokenInfo
}

const ScheduleParamsView: FC<ScheduleParamsViewProps> = (props) => {
    const {claimInfo, token} = props;

    return <Stack spacing={2} sx={{my: 2}}>
        <Box>
                <strong>Cliff:</strong> &nbsp;
                {(claimInfo.cliffReleaseTimestamp > 0) ? <>
                    <Typography>{formatTokenAmount(claimInfo.cliffAmount, token)} at &nbsp;
                    {formatDate(claimInfo.cliffReleaseTimestamp * 1000, DATETIME_S_FORMAT)}</Typography>
                </> : <Typography>No Cliff</Typography>}
        </Box>
        <Stack direction={'row'}>
            <Box sx={{mr: 2}}>
                <strong>Linear Schedule Start:</strong> &nbsp;
                <Typography>{formatDate(claimInfo.startTimestamp * 1000, DATETIME_S_FORMAT)}</Typography>
            </Box>
            <Box>
                <strong>Linear Schedule End:</strong> &nbsp;
                <Typography>{formatDate(claimInfo.endTimestamp * 1000, DATETIME_S_FORMAT)}</Typography>
            </Box>
        </Stack>
        <Box>
            <strong>Linear Release:</strong> &nbsp;
            <Typography>{formatTokenAmount(claimInfo.linearVestAmount, token)} total, intervals of {claimInfo.releaseIntervalSecs} seconds</Typography>
        </Box>
        {/* <ListItem>
            <strong>Schedule is {pendingClaimInfo.isActive ? 'Active' : 'Inactive'}</strong>
        </ListItem> */}
    </Stack>
}

export default ScheduleParamsView;