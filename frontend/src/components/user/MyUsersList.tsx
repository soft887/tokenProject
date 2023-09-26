import React, { FC, useEffect, useState } from "react";
import { Box, Grid, Paper, Table, TableBody, TableRow, TableCell, TableHead, Button, TextField, CardHeader, CardContent, Card, MenuItem } from "@mui/material";
import { useMoralis } from "react-moralis";
import { useSelector } from "react-redux";
import DeleteAfterConfirmButton from "../generic/buttons/DeleteAfterConfirmButton";
import AddressDisplay from "../address/AddressDisplay";
import { Address } from "../../utils/types";
import { useAppDispatch } from "../../store/store";
import { fetchMyUsers, myUsersSelectors } from "../../store/vestingSlice";
import { camelToTitleCase } from "../../utils/helpers";


export type MyUsersListProps = {
    onDeleteUser: (address: Address) => void
}

const MyUsersList: FC<MyUsersListProps> = ({onDeleteUser}) => {
    const beneficiaries = useSelector(myUsersSelectors.selectAll);
    const dispatch = useAppDispatch();
    const { Moralis } = useMoralis();
    
    useEffect( () => {
        Moralis && dispatch && dispatch(fetchMyUsers({Moralis}));
    }, [Moralis, dispatch]);

    return <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Address</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>User Type</TableCell>
                    <TableCell>Round Type</TableCell>
                    <TableCell>Company Name</TableCell>
                    <TableCell></TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {beneficiaries.map((beneficiary, i) => (
                    <TableRow key={i}>
                        <TableCell><AddressDisplay value={beneficiary.address} copyable maxDisplayChars={10} /></TableCell>
                        <TableCell>{beneficiary.name}</TableCell>
                        <TableCell>{beneficiary.companyName}</TableCell>
                        <TableCell>{beneficiary.roundType}</TableCell>
                        <TableCell>{beneficiary.userType ? camelToTitleCase(beneficiary.userType) : 'N/A'}</TableCell>
                        <TableCell>
                            <DeleteAfterConfirmButton onDelete={() => onDeleteUser(beneficiary.address)} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
}

export default MyUsersList;