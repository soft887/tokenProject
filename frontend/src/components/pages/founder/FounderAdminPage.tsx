import React, { FC, useEffect, useState } from "react";
import { Box, Grid, Paper, Table, TableBody, TableRow, TableCell, TableHead, Button, TextField, CardHeader, CardContent, Card, MenuItem, Tab, Tabs, Typography } from "@mui/material";
import { useMoralis } from "react-moralis";
import { useSelector } from "react-redux";
import { doAddMyUser, doDeleteMyUser, fetchMyUsers, myUsersSelectors } from "../../../store/vestingSlice";
import { Address, KnownVestingUserInfo, UserTypeList } from "../../../utils/types";
import MyUsersManagement from "../../user/MyUsersManagement";
import DashboardPageLayout from "../../layout/DashboardPageLayout";
import { camelToTitleCase } from "../../../utils/helpers";
import { useAppDispatch } from "../../../store/store";
import MyVestingContractsManagement from "../../vesting-contract/MyVestingContractsManagement";
import MyVestingScheduleTemplatesList from "../../vesting-schedule/MyClaimTemplatesList";
import MyProfileSettings from "../../user/MyProfileSettings";

export type FounderAdminPageProps = {
    
}

const FounderAdminPage: FC<FounderAdminPageProps> = () => {
    const beneficiaries = useSelector(myUsersSelectors.selectAll);
    const dispatch = useAppDispatch();

    const { Moralis } = useMoralis();

    const tabOptions = ['vestingScheduleTemplates', 'users', 'vestingContracts', 'myProfile'] as const;

    const [selectedTab, setSelectedTab] = useState<(typeof tabOptions)[number]>(tabOptions[0]);

    useEffect( () => {
        Moralis && dispatch && dispatch(fetchMyUsers({Moralis}));
    }, [Moralis, dispatch])

    return <DashboardPageLayout headerTitle={'User Management Page'}>
        <Typography variant={'h4'}>Settings</Typography>
        <Card>
            <CardContent>
                <Tabs value={selectedTab} onChange={(e, newTab) => setSelectedTab(newTab)}>
                    {tabOptions.map(tabOpt => <Tab key={tabOpt} value={tabOpt} label={camelToTitleCase(tabOpt)} />)}
                </Tabs>
                
                {selectedTab === 'myProfile' && <MyProfileSettings />}
                {selectedTab === 'users' && <MyUsersManagement />}
                {selectedTab === 'vestingScheduleTemplates' && <MyVestingScheduleTemplatesList />}
                {selectedTab === 'vestingContracts' && <MyVestingContractsManagement />}

            </CardContent>
        </Card>

    </DashboardPageLayout>
}

export default FounderAdminPage;