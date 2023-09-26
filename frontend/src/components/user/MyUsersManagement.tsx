import React, { FC, useEffect, useState } from "react";
import { Box, Grid, Paper, Table, TableBody, TableRow, TableCell, TableHead, Button, TextField, CardHeader, CardContent, Card, MenuItem, Typography } from "@mui/material";
import { useMoralis } from "react-moralis";
import { useSelector } from "react-redux";
import { UserType, UserTypeList } from '../../utils/types';
import { useAppDispatch } from "../../store/store";
import { doAddMyUser, doDeleteMyUser, fetchMyUsers, myUsersSelectors } from "../../store/vestingSlice";
import { Address, KnownVestingUserInfo } from "../../utils/types";
import DashboardPageLayout from "../layout/DashboardPageLayout";
import { camelToTitleCase } from "../../utils/helpers";
import UserAddForm from "./UserAddForm";
import MyUsersList from "./MyUsersList";

export type MyUserManagementPageProps = {
    
}

const MyUsersManagement: FC<MyUserManagementPageProps> = () => {
    const dispatch = useAppDispatch();
    const { Moralis } = useMoralis();

    const addUser = (userFormState: KnownVestingUserInfo) => {
        dispatch(doAddMyUser({Moralis, ...userFormState}))
        
    };
    const deleteUser = (address: Address) => {
        dispatch(doDeleteMyUser({Moralis, address}));
    };

    return <MyUsersList onDeleteUser={deleteUser} />
}

export default MyUsersManagement;