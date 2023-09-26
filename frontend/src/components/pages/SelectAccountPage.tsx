import React, { FC, useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import DashboardPageLayout from "../layout/DashboardPageLayout";
import { useNavigate } from "react-router";
import { UserInterfaceRole, UserType } from "../../utils/types";
import { SetUserData } from "react-moralis/lib/hooks/core/useMoralis/utils/setUserData";
import { useMoralis } from "react-moralis";
import MarketingPageLayout from "../layout/MarketingPageLayout";

export type SelectAccountPageProps = {
    
}

const SelectAccountPage: FC<SelectAccountPageProps> = () => {

    const navigate = useNavigate();

    const { Moralis, user, setUserData, userError } = useMoralis();

    const userRoles: {roleName: UserType, navigateUrl: string, title?: string}[] = [
        {roleName: 'Founder', navigateUrl: '/founder/tokens/', }, 
        {roleName: 'Team', navigateUrl: '/employee/my-vesting-contracts/overview/', title: 'Employee'},
        {roleName: 'Investor', navigateUrl: '/employee/my-vesting-contracts/overview/'}, 
    ];

    const setCurrentRole = async (roleName: UserType, navigateUrl: string) => {
        const userInterfaceType: UserInterfaceRole = (roleName === 'Founder') ? 'tokenOwner' : 'tokenHolder';

        // TODO: should use common logic as used in the profile page
        await setUserData({
            defaultUserTypeView: userInterfaceType,
            enabledUserTypes: [userInterfaceType]
        } as unknown as SetUserData);
        navigate(navigateUrl);
    }

    return <MarketingPageLayout>
        <Stack sx={ {maxWidth: 400, mx: 'auto', borderRadius: 3} }>
            <Typography variant="h4">Create your account</Typography>
            <Stack sx={{width: '70%'}} spacing={2}>
                {userRoles.map(({roleName, navigateUrl, title}) => 
                    <Button key={roleName} variant="contained" color="primary" sx={{width: '100%'}} onClick={() => setCurrentRole(roleName, navigateUrl)} >{title ?? roleName}</Button>
                )}
            </Stack>
        </Stack>
        {userError && <Alert severity="error">{userError}</Alert>}
    </MarketingPageLayout>
}

export default SelectAccountPage;