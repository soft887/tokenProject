import { CircularProgress } from "@mui/material";
import React, { FC } from "react";
import { useMoralis } from "react-moralis";
import { Navigate } from "react-router";
import { UserInterfaceRole } from "../../../utils/types";


const UserDashboardPage: FC = (props) => {
    // This page currently only contains logic to redirect them appropriately, we might want to revisit this later
    const { isAuthenticated, isAuthenticating, user } = useMoralis();

    const defaultUserTypeView = (user?.attributes?.defaultUserTypeView ?? null) as (UserInterfaceRole | null);

    let to;
    if(isAuthenticated) {
        if(defaultUserTypeView) {
            to = defaultUserTypeView === 'tokenOwner' ? '/founder/tokens/' : '/employee/my-vesting-contracts/overview/';
        }
        else {
            to = "/account-select/";
        }
    }
    else {
        to = '/login/';
    }
    return <Navigate to={to} />;   
}

export default UserDashboardPage;