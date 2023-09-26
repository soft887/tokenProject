import React, { FC, useEffect, useState } from "react";
import { Box, Grid, Paper, Table, TableBody, TableRow, TableCell, TableHead, Button, TextField, CardHeader, CardContent, Card, MenuItem, Alert, Typography } from "@mui/material";
import { useMoralis } from "react-moralis";
import { useSelector } from "react-redux";
import { UserType, UserTypeList } from '../../utils/types';
import { useAppDispatch } from "../../store/store";
import { doAddMyUser, doDeleteMyUser, doDeleteMyVestingContract, fetchMyUsers, myUsersSelectors, myVestingContractsSelectors, selectMyVestingContracts } from "../../store/vestingSlice";
import { Address, KnownVestingUserInfo } from "../../utils/types";
import DashboardPageLayout from "../layout/DashboardPageLayout";
import { camelToTitleCase } from "../../utils/helpers";
import AddressDisplay from "../address/AddressDisplay";
import DeleteAfterConfirmButton from "../generic/buttons/DeleteAfterConfirmButton";
import { ChainDisplay } from "../chain/ChainDisplay";

export type MyVestingContractsManagementProps = {
    
}

/**
 * Very simple overview of *ALL* *my* vesting contracts, not related to a token. Should probably be replaced with the regular form associated to a single token.
 * @returns 
 */
const MyVestingContractsManagement: FC<MyVestingContractsManagementProps> = () => {
    const dispatch = useAppDispatch();
    const { Moralis, chainId } = useMoralis();
    
    const [errorText, setErrorText] = useState<string | null>(null);

    const myVestingContracts = useSelector(myVestingContractsSelectors.selectAll);

    const deleteVestingContract = async (address: Address) => {
        setErrorText(null);
        if(!chainId) {
            setErrorText(`Invalid chain selected`);
            return;
        }
        try {
            await dispatch(doDeleteMyVestingContract({Moralis, address, chainId})).unwrap();
        } 
        catch(e: any) {
            setErrorText(`Unable to delete the vesting contract: ${e.message}`);
        }
    };

    return <>
        {errorText && <Alert severity={'error'}>{errorText}</Alert>}
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Chain ID</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell></TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {myVestingContracts.map((vestingContract, i) => (
                    <TableRow key={i}>
                        <TableCell><ChainDisplay chainId={vestingContract.chainId} /></TableCell>
                        <TableCell><AddressDisplay copyable value={vestingContract.address} maxDisplayChars={10} /></TableCell>
                        <TableCell>
                            <DeleteAfterConfirmButton onDelete={() => deleteVestingContract(vestingContract.address)} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </>
}

export default MyVestingContractsManagement;