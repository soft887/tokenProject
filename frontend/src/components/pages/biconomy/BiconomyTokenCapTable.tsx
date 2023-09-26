import React, { FC, useEffect, useState } from "react";
import { Box, List, Typography, ListItem, Button, MenuItem, TextField, Card, CardHeader, CardContent, TableContainer, Table, TableHead, TableRow, TableBody, TableCell, Paper, Dialog, DialogTitle } from "@mui/material";
import DashboardPageLayout from "../../layout/DashboardPageLayout";
import { useMoralis } from "react-moralis";
import * as BiconomyVesting from "../../../thirdparty/contracts/biconomy/Vesting.json";
import TestERC20Token from "@vtvl/contracts/TestERC20Token.sol/TestERC20Token.json";
import { Duration, format as formatDate, add as addDate, parseISO as parseISODate, formatDistance as formatDateDistance } from 'date-fns';
import ScheduleTable from "../../vesting-schedule/ScheduleTable";
import { BigNumber } from "ethers";
import { DATETIME_FORMAT } from "../../../settings";

export type BiconomyTokenCapTableProps = {
    
}


// type ScheduleData = {
//     scheduleItems?: AbsoluteVestingScheduleItem[],
//     error?: string,
//     claimedData: any
// }
type ScheduleData = any;

const formatBNTs = (ts: BigNumber) => formatDate(new Date(BigNumber.from(ts).toNumber() * 1000), DATETIME_FORMAT);

const BiconomyTokenCapTable: FC<BiconomyTokenCapTableProps> = () => {

    const { 
        Moralis, 
        user, 
        web3: web3Provider, 
        account, 
        chainId, 
        isAuthenticated,
        setUserData,
        refetchUserData,
    } = useMoralis();

    const [biconomyClaimed, setBiconomyClaimed] = useState<{[k: string]: any}[] | null>(null);
    const [biconomyClaimCreated, setBiconomyClaimCreated] = useState<{[k: string]: any}[] | null>(null);

    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);

    const getEthers = () => {
        const ethers = Moralis.web3Library;

        // This shouldn't happen - since we should actually call this when we have web3lib enabled
        if(!ethers || !web3Provider) {
            
            throw new Error("Invalid ethers or web3Provider instance.");
        }

        const signer = web3Provider.getSigner();

        const mainnetProvider = new ethers.providers.JsonRpcProvider('https://speedy-nodes-nyc.moralis.io/476f8ed27ca8c180ebc32f48/eth/mainnet');

        return {ethers, signer, mainnetProvider};
    }

    useEffect( () => {
        try {
            const {ethers, signer, mainnetProvider} = getEthers();
        

            setTimeout(async () => {
                
                const tokenContract = new ethers.Contract('0xF17e65822b568B3903685a7c9F496CF7656Cc6C2', TestERC20Token.abi, mainnetProvider);
                const biconomyContract = new ethers.Contract('0xeE3593817fB142BFBEA560fcF47b3f354f519D33', TestERC20Token.abi, mainnetProvider);

                setBiconomyClaimed((await (await fetch('https://wwpnaydlscnf.usemoralis.com:2053/server/classes/biconomyClaimed', {headers: {"X-Parse-Application-Id": "u9lxJa36jUhb7DnlG5UpABlRbpFOwTg8ck5JSsdN"}})).json()).results);
                setBiconomyClaimCreated((await (await fetch('https://wwpnaydlscnf.usemoralis.com:2053/server/classes/biconomyClaimCreated', {headers: {"X-Parse-Application-Id": "u9lxJa36jUhb7DnlG5UpABlRbpFOwTg8ck5JSsdN"}})).json()).results);

                // @ts-ignore
                window.tokenContract = tokenContract; window.biconomyContract = biconomyContract; window.Moralis = Moralis;
            }, 200);
        }
        catch(e: any) {
        
        }
    }, [web3Provider, Moralis]);

    
    const biconomyClaimKeys = ['address', 'amount', 'beneficiary',  'block_number'];
    const biconomyClaimCreatedKeys = ['address', 'beneficiary', 'endTime', 'startTime', 'unlockAmount', 'unlockTime', 'vestAmount'];

    const viewClaimDetails = async (c: any) => {

        
        // @ts-ignore
        const x = encodeURIComponent(JSON.stringify({"beneficiary":c?.beneficiary}))
        console.log(x)
        setScheduleData({
            scheduleItems: c,
            claimedData: (await (await fetch('https://wwpnaydlscnf.usemoralis.com:2053/server/classes/biconomyClaimed?where=' + x, {headers: {"X-Parse-Application-Id": "u9lxJa36jUhb7DnlG5UpABlRbpFOwTg8ck5JSsdN"}})).json()).results
        });
    }
    
    return <DashboardPageLayout headerTitle={'Token Cap Table'}>

        <Dialog onClose={() => setScheduleData(null)} open={!!scheduleData}>
            <DialogTitle>View Schedule</DialogTitle>
            <Typography>Claimed</Typography>
            <Box>
            <pre>
                {JSON.stringify(scheduleData?.claimedData, null, 4)}
            </pre>
            </Box>
            <Typography>ClaimCreated Info</Typography>
            <pre>
                {JSON.stringify(scheduleData?.scheduleItems, null, 4)}
            </pre>
            {/* {scheduleData.scheduleItems && <ScheduleTable schedule={scheduleData.scheduleItems} type={'absolute'} /> } */}
        </Dialog>

        <Card sx={ {m: 1} } >
            <CardHeader title={'Claim Created'} />
            <CardContent>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {/* @ts-ignore */}
                                {biconomyClaimCreatedKeys.map(k => <TableCell key={k}>{k}</TableCell>)}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                                {/* @ts-ignore */}
                            {biconomyClaimCreated?.map((bc, i) => <TableRow key={i} onClick={() => viewClaimDetails(bc)}>
                                {/* @ts-ignore */}
                                {biconomyClaimCreatedKeys.map(k => 
                                    <TableCell key={k}>
                                        {(k.endsWith('Time') ? 
                                            formatBNTs(bc?.[k]) : 
                                                (
                                                    k.endsWith('Amount') ? Math.round(bc?.[k] / Math.pow(10, 16)) / 100: bc?.[k]
                                                ))
                                                ?? 'N/A'}
                                    </TableCell>
                                )}
                            </TableRow>)}
                            
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>

        <Card sx={ {m: 1} }>
            <CardHeader title={'Claimed'} />
            <CardContent>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {/* @ts-ignore */}
                                {biconomyClaimKeys?.map(k => <TableCell key={k}>{k}</TableCell>)}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                                {/* @ts-ignore */}
                            {biconomyClaimed?.map((bc, i) => <TableRow key={i}>
                                {/* @ts-ignore */}
                                {biconomyClaimKeys.map(k => 
                                    <TableCell key={k}>
                                        {(k.endsWith('Time') ? 
                                            formatBNTs(bc?.[k]) : 
                                                (
                                                    k.endsWith('Amount') ? Math.round(bc?.[k] / Math.pow(10, 16)) / 100: bc?.[k]
                                                ))
                                                ?? 'N/A'}
                                    </TableCell>
                                )}
                            </TableRow>)}
                            
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    </DashboardPageLayout>;
}

export default BiconomyTokenCapTable;