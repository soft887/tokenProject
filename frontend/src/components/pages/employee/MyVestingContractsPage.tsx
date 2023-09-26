import { Card, CardContent, Typography } from "@mui/material";
import { FC, useEffect, useState } from "react";
import { useMoralis } from "react-moralis";
import { Address } from "../../../utils/types";
import DashboardPageLayout from "../../layout/DashboardPageLayout";
import MyTokenAllocation, { MyTokenAllocationProps } from "../../token/MyTokenAllocation";

export type MyVestingContractPageProps = {
    variant: MyTokenAllocationProps['variant']
}



const MyVestingContractPage: FC<MyVestingContractPageProps> = (props: MyVestingContractPageProps) => {
    const {variant = 'table'} = props;

    const [selectedWalletAddress, setSelectedWalletAddress] = useState<Address|null>(null);

    const {web3: web3Provider} = useMoralis();

    // Todo: replace this with proper dispatching of selected user acct to redux
    useEffect( () => {
        web3Provider && web3Provider?.listAccounts().then(addresses => {
            addresses?.[0] && setSelectedWalletAddress(addresses[0])
        });    
    }, [web3Provider])

    const innerContent = selectedWalletAddress ?
                            <MyTokenAllocation walletAddress={selectedWalletAddress} variant={variant} /> :
                            <Typography>Please select a wallet address.</Typography>

    // This is a page containing my vesting contracts but called tokens
    return <DashboardPageLayout>
        <Typography variant={'h4'}>My Tokens</Typography>
        {/* If it's a table, show it in a card */}
        {/* Otherwise, since it consists of two cards, make sure it works as expected  */}
        {variant === 'table' ? <Card>
            <CardContent>{innerContent}</CardContent>
        </Card> 
        : innerContent}
    </DashboardPageLayout>
}

export default MyVestingContractPage;