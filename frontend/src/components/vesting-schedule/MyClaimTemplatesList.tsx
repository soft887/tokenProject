import React, { FC, useEffect, useState } from "react";
import { Box, Grid, Paper, Table, TableBody, TableRow, TableCell, TableHead, Button, TextField, CardHeader, CardContent, Card, MenuItem, Typography, Stack } from "@mui/material";
import { useMoralis } from "react-moralis";
import { useSelector } from "react-redux";
import { UserType, UserTypeList } from '../../utils/types';
import { useAppDispatch } from "../../store/store";
import { doAddMyUser, doDeleteClaimTemplate, doDeleteMyUser, fetchMyClaimTemplates, fetchMyUsers, myClaimTemplatesSelectors, myUsersSelectors } from "../../store/vestingSlice";
import { Address, KnownVestingUserInfo } from "../../utils/types";
import DashboardPageLayout from "../layout/DashboardPageLayout";
import { camelToTitleCase, timestampToDate } from "../../utils/helpers";
import { format as formatDate } from "date-fns";
import { formatDuration } from "date-fns/esm";
import { DATETIME_FORMAT } from "../../settings";
import { formatTokenAmount } from "../../utils/contract/token";
import AddressDisplay from "../address/AddressDisplay";
import DeleteAfterConfirmButton from "../generic/buttons/DeleteAfterConfirmButton";

export type MyClaimTemplatesListProps = {
}

// This is called "Vesting schedule templates" within the system.
const MyClaimTemplatesList: FC<MyClaimTemplatesListProps> = () => {
    const myClaimTemplates = useSelector(myClaimTemplatesSelectors.selectAll);
    const dispatch = useAppDispatch();
    const { Moralis } = useMoralis();
    
    useEffect( () => {
        Moralis && dispatch && dispatch(fetchMyClaimTemplates({Moralis}));
    }, [Moralis, dispatch]);

//     const columns = ['label': string;
//     isTimestampRelative: boolean;

//     scheduleStartTimestamp: number;
//     totalAmountTokens: string; 
//     cliffDurationAfterScheduleStart: Duration | null;
//     cliffPercent: number | null;

//     linearReleaseFrequency: Duration;
//     scheduleEndTimestamp: number;
// }; // & Partial<Omit<ClaimInfo, 'isActive' | 'amountWit

    const handleDelete = (objectId: string) => {
        dispatch(doDeleteClaimTemplate({Moralis, objectId}));   
    }

    const InfoBox: FC<{title: string, children: any}> = ({title, children}) => <Box sx={{m: 2}}>
        <Typography sx={{size: 12}}>{title}</Typography>
        <Typography sx={{size: 14, fontWeight: 500}} component='div'>{children}</Typography>
    </Box>


    return <Table>
        <TableBody>
            {myClaimTemplates.map((claimTemplate, i) => (
                <TableRow key={i}>
                    <TableCell>
                        <Stack>
                            <InfoBox title={'Template'}>
                                {claimTemplate.label}
                            </InfoBox>
                        </Stack>
                    </TableCell>
                    <TableCell>
                        <InfoBox title={'Type'}>
                            N/A
                        </InfoBox>
                    </TableCell>

                    <TableCell>
                        <Stack>
                            <InfoBox title={'Contract Address'}>
                                <AddressDisplay value={claimTemplate.vestingContractAddress ?? ""} copyable maxDisplayChars={10} />
                            </InfoBox>

                            <InfoBox title={'Token Address'}>
                                <AddressDisplay value={claimTemplate.tokenAddress ?? ""} copyable maxDisplayChars={10} />
                            </InfoBox>
                        </Stack>
                    </TableCell>

                    {/* <TableCell>
                            <Typography>Timestamp type</Typography>
                            
                    </TableCell> */}

                    <TableCell>
                        <Stack>
                            <InfoBox title="Start">
                                {formatDate(timestampToDate(claimTemplate.scheduleStartTimestamp), DATETIME_FORMAT)}
                            </InfoBox>

                            <InfoBox title={'Cliff / Cliff %'}>
                                {claimTemplate.cliffDurationAfterScheduleStart ? <>
                                    {formatDuration(claimTemplate.cliffDurationAfterScheduleStart)} / {' '}
                                    {claimTemplate.cliffPercent} %
                                </> : 'N/A'}
                            </InfoBox>
                        </Stack>
                    </TableCell>

                    <TableCell>
                        <Stack>
                            <InfoBox title={'End'}>
                                {formatDate(timestampToDate(claimTemplate.scheduleEndTimestamp), DATETIME_FORMAT)}
                            </InfoBox>
                            <InfoBox title={'Timestamp Type'}>
                                {claimTemplate.isTimestampRelative ? 'Relative' : 'Absolute'}
                            </InfoBox>
                        </Stack>
                    </TableCell>
                    
                    <TableCell>
                        <InfoBox title={'Amount'}>
                            {claimTemplate.totalAmountTokens}
                        </InfoBox>
                        <InfoBox title={'Release Frequency'}>
                            {formatDuration(claimTemplate.linearReleaseFrequency)}
                        </InfoBox>
                    </TableCell>
                    <TableCell>
                        <DeleteAfterConfirmButton onDelete={() => handleDelete(claimTemplate.objectId)} />
                    </TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
}

export default MyClaimTemplatesList;