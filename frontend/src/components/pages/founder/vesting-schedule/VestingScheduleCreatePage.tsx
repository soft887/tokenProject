import { FC, useState } from "react";
import { Box, Button, CardContent, Card, Dialog, DialogTitle, DialogContent, Typography, CircularProgress, Backdrop, Alert, Checkbox, FormControlLabel, Stack, Stepper, Step, StepButton, Snackbar } from "@mui/material";
import { useMoralis } from "react-moralis";
import DashboardPageLayout from "../../../layout/DashboardPageLayout";
import ERC20Token from "@vtvl/openzeppelin-artifacts/token/ERC20/ERC20.sol/ERC20.json";
import VTVLVesting from "@vtvl/contracts/VTVLVesting.sol/VTVLVesting.json";
import { ClaimInfo, PendingClaimTemplate, KnownVestingUserInfo, VestingBeneficiary, BlockchainTransactionStatus } from '../../../../utils/types';
import { batchScheduleToContractDto, claimToContractDto } from "../../../../utils/helpers";
import { useAppDispatch } from "../../../../store/store";
import { useSelector } from "react-redux";
import { doAddClaimTemplate, selectSingleVestingContractFull,  doAddMyUser, fetchClaims } from "../../../../store/vestingSlice";
import { useNavigate, useParams } from "react-router";
import ScheduleChart from "../../../vesting-schedule/ScheduleChart";
import VestingContractContextCard from "../../../vesting-contract/VestingContractContextCard";
import ScheduleCreateForm, { VestingScheduleFormState } from "../../../vesting-schedule/ScheduleCreateForm";
import ScheduleParamsView from "../../../vesting-schedule/ScheduleParamsView";
import ScheduleSelectBeneficiaries from "../../../vesting-schedule/ScheduleSelectBeneficiaries";
import BackButton from "../../../generic/buttons/BackButton";
import TransactionWaitProgressBackdrop from "../../../progress/TransactionWaitProgressBackdrop";

export type VestingScheduleCreatePageProps = {
}


const VestingScheduleCreatePage: FC<VestingScheduleCreatePageProps> = () => {
    const { 
        Moralis, 
        web3: web3Provider,
        chainId 
    } = useMoralis();

    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    
    const {vestingContractAddress = ""} = useParams();

    const [errorText, setErrorText] = useState<string | null>(null);
    const [notificationText, setNotificationText] = useState<string|null>(null);
    
    // const [pendingClaimExtras, setPendingClaimExtras] = useState<PendingClaimExtra | null>(null);
    const [pendingClaimInfo, setPendingClaimInfo] = useState<ClaimInfo | null>(null);

    const [pendingBeneficiaries, setPendingBeneficiaries] = useState<VestingBeneficiary[] | null>(null);
    
    const [scheduleCreateState, setScheduleCreateState] = useState<BlockchainTransactionStatus>("idle");
    
    const selectedVestingContract = useSelector(selectSingleVestingContractFull({address: vestingContractAddress, chainId}));

    const [scheduleFormState, setScheduleFormState] = useState<VestingScheduleFormState | null>(null);

    const [isScheduleConfirmed, setIsScheduleConfirmed] = useState(false);

    const [currentStepNum, setCurrentStepNum] = useState<number>(0);

    const [maxReachableStepNum, setMaxReachableStepNum] = useState<number>(0); // if we went back, what's the last step we can go up to

    const [maxNumBeneficiaries, setMaxNumBeneficiaries] = useState<number>(0);

    const steps = [
        'Design Schedule',
        'Add Users',
        'Preview Schedule',
    ]

    const addSchedule = async () => {
        try {
            const ethers = Moralis.web3Library;
    
            if(!ethers || !web3Provider || !chainId) {
                throw new Error("Invalid chain or ethers or web3Provider instance.");
            }
            
            setScheduleCreateState('pending');
        
            const signer = web3Provider.getSigner();
        
            const vestingContract = new ethers.Contract(vestingContractAddress, VTVLVesting.abi, signer);
            console.log(`vestingContract initialized on ${vestingContract.address}`);

            // const {recipientAddress} = pendingClaimExtras ?? {};
            
            if(!pendingClaimInfo) {
                throw new Error("Cannot proceed when we have no contract schedule")
            }

            if(!pendingBeneficiaries || pendingBeneficiaries.length === 0) {
                throw new Error("Please select at least one recipient address.")
            }

            let newScheduleIdTx;
            if(pendingBeneficiaries.length === 1) {
                const recipientAddress = pendingBeneficiaries[0].address;

                const contractScheduleDto = claimToContractDto(recipientAddress, pendingClaimInfo);
                console.log(`Contract: ${vestingContract.address}. Adding a schedule with ${contractScheduleDto.length} items. Items:`, contractScheduleDto);
                newScheduleIdTx = await vestingContract.createClaim(...contractScheduleDto);
            }
            else {
                const batchScheduleDto = batchScheduleToContractDto(pendingBeneficiaries?.map(b=>b.address), pendingClaimInfo);
                console.log(`Contract: ${vestingContract.address}. Adding a schedule for ${pendingBeneficiaries.length} recipients. Items:`, batchScheduleDto);
                newScheduleIdTx = await vestingContract.createClaimsBatch(...batchScheduleDto);
            }

            setScheduleCreateState('in-progress');
            console.log("Vesting schedule added.", newScheduleIdTx);
            
            const waitResult = await newScheduleIdTx.wait(); // Need to wait for the tx to come through
            console.log("Vesting schedule transaction came through.");
            
            // Only notify the user of completion after all has been done
            setScheduleCreateState('confirmed');

            // Refresh the claims after we're done (no need to hold on this one)
            dispatch(fetchClaims({address: vestingContract.address, provider: web3Provider, chainId}));
        }
        catch(e: any) {
            const errorText = `Error while adding the schedule: ${e.message}. ${e?.data?.message}`;
            setErrorText(errorText);
            setScheduleCreateState('idle');
        }
    }
    
    

    const handleReceiveSchedule = async (pendingClaim: ClaimInfo) => {
        setErrorText(null);
        setPendingClaimInfo(pendingClaim);
        setCurrentStepNum(1);
        setMaxReachableStepNum(1);

        // TODO: revise logic move some better place
        // This is the logic to calculate the number of beneficiaries by dividing the total amount on the contract by the allocation per user.
        try {
            const ethers = Moralis.web3Library;
    
            if(!ethers || !web3Provider) {
                throw new Error("Invalid ethers or web3Provider instance.");
            }
            const signer = web3Provider.getSigner();
            const vestingContract = new ethers.Contract(vestingContractAddress, VTVLVesting.abi, signer);
            const tokenContract = new ethers.Contract(await vestingContract.tokenAddress(), ERC20Token.abi, signer);
            const contractBalance = ethers.BigNumber.from(pendingClaim.cliffAmount).add(pendingClaim.linearVestAmount);
            const nb = (await tokenContract.balanceOf(vestingContractAddress)).div(contractBalance);
            const nbi = nb.toString();
            setMaxNumBeneficiaries(nbi);
        }
        catch {
            setMaxNumBeneficiaries(0);
        }
    }

    const handleBeneficiariesSelected = (beneficiaries: VestingBeneficiary[]) => {
        if(pendingClaimInfo === null) {
            setErrorText("Invalid claim");
            return;
        }
        setErrorText(null);
        console.log("Received beneficiaries", beneficiaries)
        setPendingBeneficiaries(beneficiaries);
        setCurrentStepNum(2);
        setMaxReachableStepNum(2);
    }

    const handleCreateClaimTemplate = async (claimTemplate: PendingClaimTemplate) => {
        try {
            console.log("Creating claim template", claimTemplate)
            await dispatch(doAddClaimTemplate({Moralis, claimTemplate})).unwrap();
            setNotificationText(`Claim template '${claimTemplate.label}' saved.`);
            return true;
        }
        catch(e: any) {
            const errorText = `Error while creating a claim template: ${e.message}. ${e?.data?.message}`;
            setErrorText(errorText);
            return false;
        }
    }

    const handleCreateBeneficiary = async (b: KnownVestingUserInfo) => {
        try {

            await dispatch(doAddMyUser({...b, allowUpsert: true, Moralis})).unwrap();
            setNotificationText(b.name ? `Beneficiary created: ${b.name}.` : 'Anonymous beneficiary created.');
            return true;
        }
        catch(e: any) {
            const errorText = `Error while creating a beneficiary: ${e?.data?.message ?? e.message}`;
            setErrorText(errorText);
            return false;
        }
    }
    
    const resetForm = () => {
        setScheduleCreateState('idle'); 
        setPendingClaimInfo(null); 
        setPendingBeneficiaries(null);
        setCurrentStepNum(0);
        setMaxReachableStepNum(0);
    }

    const handleGoBack = () => {
        (currentStepNum > 0) && setCurrentStepNum(currentStepNum - 1);
        // () => setPendingClaimInfo(null)
    }

    return <DashboardPageLayout>
        <Snackbar open={notificationText !== null} onClose={() => {setNotificationText(null);}} autoHideDuration={5000} >
            <Alert severity={'info'}>{notificationText}</Alert>
        </Snackbar>
        {selectedVestingContract?.tokenAddress && <BackButton url={`/founder/tokens/${selectedVestingContract.tokenAddress}/vesting-contracts/`}>Back to Vesting Contract List</BackButton>}
        <VestingContractContextCard vestingContractAddress={vestingContractAddress} />

        <Typography variant={'h4'}>Create Vesting Schedule</Typography>
        <Card>
            <CardContent>
                <Stepper nonLinear activeStep={currentStepNum} sx={{mb: 3, width: 500}}>
                    {steps.map((label, index) => (
                        <Step key={label} completed={index < maxReachableStepNum}>
                            <StepButton 
                                color="inherit" 
                                sx={{'& *': {fontSize: 14}}}
                                disabled={index > maxReachableStepNum}
                                onClick={() => setCurrentStepNum(index)}>
                                    {label}
                            </StepButton>
                        </Step>
                    ))}
                </Stepper>
                <Box sx={{ml: 1}}>
                    {steps[currentStepNum] === 'Design Schedule' && <>
                        <ScheduleCreateForm 
                            formState={scheduleFormState}
                            onFormStateChange={setScheduleFormState}
                            // pendingClaimInfo={pendingClaimInfo}
                            vestingContractAddress={vestingContractAddress}
                            onPendingClaimTemplateFinish={handleCreateClaimTemplate} 
                            onScheduleFinish={handleReceiveSchedule}
                            onScheduleError={() => setPendingClaimInfo(null)}
                            createButtonText={'Proceed to add Users'}
                            />
                    {/* <Box>Please select and calculate a schedule.</Box> */}
                    </>}

                    {steps[currentStepNum] === 'Add Users' && <>
                        <ScheduleSelectBeneficiaries 
                            maxNumBeneficiaries={maxNumBeneficiaries}
                            beneficiaries={pendingBeneficiaries ?? []}
                            backButtonText="Back"
                            backButtonAction={handleGoBack}
                            selectButtonText="Next"
                            vestingContractAddress={vestingContractAddress} 
                            onBeneficiariesSelected={handleBeneficiariesSelected}
                            onKnownBeneficiarySave={handleCreateBeneficiary}
                            />


                    {/* <Box>Please select and calculate a schedule.</Box> */}
                    </>}

                    {(selectedVestingContract?.token && steps[currentStepNum] === 'Preview Schedule' && pendingClaimInfo !== null) && <Stack spacing={2}>
                        <ScheduleParamsView claimInfo={pendingClaimInfo} token={selectedVestingContract?.token} />
                        
                        <Typography variant={'h5'}>Users</Typography>
                        <ScheduleSelectBeneficiaries 
                            displayOnly 
                            vestingContractAddress={vestingContractAddress} 
                            beneficiaries={pendingBeneficiaries ?? []} /> 

                        <ScheduleChart tokenInfo={selectedVestingContract.token} claimInfo={pendingClaimInfo} />
                        {/* <ScheduleTable type={'absolute'} scheduleItems={pendingSchedule.scheduleItems} token={selectedVestingContract.token} /> */}
                        <FormControlLabel 
                                sx={{maxWidth: 500}}
                                control={<Checkbox value={isScheduleConfirmed} onChange={e => setIsScheduleConfirmed(e.target.checked)} />} 
                                label="Please review the above information carefully before confirming. The schedule cannot be changed once the transaction is sent to the blockchain." />

                        <Stack direction={'row'} spacing={2}>
                            <Button variant={'contained'} color="secondary" onClick={handleGoBack}>Back</Button>
                            <Button disabled={!isScheduleConfirmed} variant={'contained'} onClick={addSchedule}>Add Schedule</Button>
                        </Stack>
                    </Stack>}
                </Box>
            </CardContent>
        </Card>

        {(scheduleCreateState === 'pending' || scheduleCreateState === 'in-progress') && <TransactionWaitProgressBackdrop status={scheduleCreateState} />}

        {errorText && <Alert severity={'error'}>{errorText}</Alert>}

        <Dialog open={scheduleCreateState === 'confirmed'} onClose={() => setScheduleCreateState('idle')}>
            <DialogTitle>Schedule successfully created!</DialogTitle>
            <DialogContent sx={{textAlign: 'center'}}>
                <Button variant="contained" color="primary" sx={{width: '70%', my: 1}} onClick={resetForm}>Create another schedule</Button>
                <Button variant="contained" color="info" sx={{width: '70%', my: 1}} onClick={() => navigate(`/founder/vesting-contracts/${selectedVestingContract?.address}/cap-table`)}>View Cap Table</Button>
                <Button variant="contained" color="info" sx={{width: '70%', my: 1}} onClick={() => navigate(`/founder/tokens/${selectedVestingContract?.token?.address}/vesting-contracts/`)}>Go back</Button>
            </DialogContent>
        </Dialog>

    </DashboardPageLayout>
}

export default VestingScheduleCreatePage;