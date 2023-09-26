import React, { FC, useEffect, useState } from "react";
import { Box, Grid, Paper, Table, TableBody, TableRow, TableCell, TableHead, Button, TextField, CardHeader, CardContent, Card, MenuItem, Stack, Typography } from "@mui/material";
import { useMoralis } from "react-moralis";
import { useSelector } from "react-redux";
import { UserType, UserTypeList } from '../../utils/types';
import { useAppDispatch } from "../../store/store";
import { doAddMyUser, doDeleteMyUser, fetchMyUsers, myUsersSelectors } from "../../store/vestingSlice";
import { Address, KnownVestingUserInfo } from "../../utils/types";
import DashboardPageLayout from "../layout/DashboardPageLayout";
import { camelToTitleCase } from "../../utils/helpers";

export type UserAddFormProps = {
    onAddUser: (userInfo: KnownVestingUserInfo) => void;
    user?: KnownVestingUserInfo;
}

const UserAddForm: FC<UserAddFormProps> = (props) => {
    const {onAddUser, user} = props;
    
    const [userFormState, setUserFormState] = useState<KnownVestingUserInfo>(user ??{
        name: '',
        address: '',
        userType: 'Founder',
        companyName: "",
        roundType: "Private",
        isAnonymous: false,
    })

    const userTypeOpts = UserTypeList.map((userTypeOpt, i) => <MenuItem key={userTypeOpt} value={userTypeOpt}>
        {camelToTitleCase(userTypeOpt)}
    </MenuItem>);


    return <Box>
        <Typography variant={'h4'}>Add User</Typography>
        <Card>  
            <CardContent>
                <Stack spacing={3}>
                    <TextField value={userFormState.name} label={"Name"} onChange={(e) => setUserFormState({...userFormState, name: e.target.value})} />
                    <TextField value={userFormState.address} label={"Address"} onChange={(e) => setUserFormState({...userFormState, address: e.target.value.trim()})} />
                    <TextField value={userFormState.companyName} label={"companyName"} onChange={(e) => setUserFormState({...userFormState, companyName: e.target.value.trim()})} />
                    <TextField value={userFormState.roundType} label={"roundType"} onChange={(e) => setUserFormState({...userFormState, roundType: e.target.value.trim() as KnownVestingUserInfo['roundType']})} />
                    <TextField select value={userFormState.userType} label={"Type"} onChange={(e) => setUserFormState({...userFormState, userType: e.target.value.trim() as KnownVestingUserInfo['userType']})}>
                        {userTypeOpts}
                    </TextField>
                </Stack>
                <Button variant={'contained'} onClick={() => onAddUser(userFormState)} sx={{mt: 3}}>Create</Button>
            </CardContent>
        </Card>  
    </Box>

}

export default UserAddForm;