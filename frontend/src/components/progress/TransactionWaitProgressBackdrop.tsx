import React, { useState, useEffect } from "react";
import { Backdrop, BackdropProps, Box, Card, CardContent, CardHeader, CircularProgress, LinearProgress, Stack, Typography } from "@mui/material";
import { BlockchainTransactionStatus } from "../../utils/types";

type TransactionWaitProgressBackdropProps = Omit<BackdropProps, 'open'> & {
    regularWaitTimeSecs?: number; // how much to be in "regular state". After this, we switch to "taking longer than expected state"
    status?: BlockchainTransactionStatus // Used if we want to use the backdrop to show pending transaction
    transactionStartDate?: Date, //  Need to send in the data where it all started, but we can also auto-infer
};

const TransactionWaitProgressBackdrop = (props: TransactionWaitProgressBackdropProps) => {
    const { 
        sx,
        transactionStartDate = null, // if this isn't set, assume we started the transaction when this thing was first spawned
        regularWaitTimeSecs = 14, // TODO: pull regular wait time from chain?
        // open = true,
        status = 'in-progress',
        ...restProps
    } = props;

    const [txStart, setTxStart] = useState(transactionStartDate ?? new Date());

    const [progress, setProgress] = useState(0);

    useEffect( () => {
        const timer = setInterval( () => {
            // If status not in progress, always progress = 0
            if(status === 'in-progress') {
                const _progress = ((new Date()).getTime() - txStart.getTime()) / regularWaitTimeSecs / 1000;
                setProgress(_progress);
            }
        }, 500);
        return () => clearInterval(timer);
    }, [txStart]);

    // If we'd changed from pending to in progress, but we didn't pass transactionStartDate, start the counter
    // at the moment where the tx actually started
    useEffect( () => {
        if(status === 'in-progress' && transactionStartDate === null) {
            setTxStart(new Date());
        }
    }, [status]);

    // No status means we force open
    // Otherwise, show the modal if it's either pending or in progress
    const isOpen = !status || (status === 'pending' || status === 'in-progress');

    return <Backdrop {...restProps} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, ...sx }} open={isOpen}>
        <Card>
            <CardHeader title={status === 'in-progress' ? "Your transaction is in progress" : "Your transaction is pending, please confirm it..."}/>
            <CardContent>
                {status === 'in-progress' && <>
                    {progress < 1 && <Stack spacing={2}>
                        <Typography>Please wait while your transaction is being executed...</Typography>
                        <LinearProgress variant="determinate" value={Math.round(progress * 100)} />
                    </Stack>}    
                    {progress > 1 && <Stack spacing={2}>
                        <Typography>It's taking a bit longer than expected, please be patient...</Typography>
                        <LinearProgress variant="indeterminate" color="error" />
                    </Stack>}    
                </>}
                {status === 'pending' && <Stack spacing={2}>
                    <Typography>Please confirm the transaction within your wallet app...</Typography>
                    <LinearProgress variant="indeterminate" />
                </Stack>}
            </CardContent>
        </Card>
        {/* <CircularProgress  /> */}
    </Backdrop>
};

// Usage note -> this component should be used like <TransactionWaitProgressBackdrop status={transactionStatus} />
export default TransactionWaitProgressBackdrop;
