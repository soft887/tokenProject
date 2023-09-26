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

export type OwnProfilePageProps = {
    
}

const OwnProfilePage: FC<OwnProfilePageProps> = () => {
    
    return <DashboardPageLayout headerTitle={'My Profile'}>
        <MyProfileSettings />
    </DashboardPageLayout>
}

export default OwnProfilePage;