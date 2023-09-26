import {FC, useEffect, useState} from "react";
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, FormGroup, MenuItem, OutlinedTextFieldProps, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { Address, ClaimInfo, ClaimTemplate, PendingClaimTemplate } from "../../utils/types";
import { Duration, format as formatDate, add as addDate, parseISO as parseISODate, formatISO, formatDuration, differenceInSeconds, startOfDay } from 'date-fns';
import { useSelector } from "react-redux";
import { myClaimTemplatesSelectors, selectSingleVestingContractFull } from "../../store/vestingSlice";
import { calculatePendingClaimInfo, camelToTitleCase, dateToAbsoluteTimestampSecs, timestampToDate } from "../../utils/helpers";
import { DATETIME_FORMAT, DATETIME_S_FORMAT, DATE_FORMAT } from "../../settings";
import InfoIcon from '@mui/icons-material/Info';
import ClaimTemplateSelectDialog from "../claim-template/ClaimTemplateSelectDialog";
// import { getClaimTemplateFromPendingClaim, getPendingClaimFromClaimTemplate } from "../../utils/contract/vesting";
import ScheduleParamsView from "./ScheduleParamsView";
import { useMoralis } from "react-moralis";
import { errors } from "ethers";


export type VestingScheduleFormState = {
    scheduleStartDate: string;
    totalAmountTokens: string;
    cliffDurationAfterScheduleStart: (typeof cliffOpts)[number] | null;
    cliffPercent: string;

    linearReleaseFrequency: (typeof linearReleaseOptions)[number] | null;
    scheduleEndDate: string;

    claimTemplateLabel: string | "";
    isCreateClaimTemplate: boolean;
}


export type ScheduleCreateFormProps = {
    vestingContractAddress: Address;
    onScheduleFinish: (pendingClaim: ClaimInfo) => void
    onPendingClaimTemplateFinish?: (pendingClaimTemplate: PendingClaimTemplate) => Promise<boolean>
    onScheduleError?: () => void;
    createButtonText?: string;
    
    // These two are like value/onChange on a text field, used to pass in initial value/track changes
    // The component can be used like <ScheduleCreateForm formState={scheduleFormState} onFormStateChange={setScheduleFormState} ... />
    // with [scheduleFormState, setScheduleFormState] retrieved from a state hook. That way, component's state can be preserved between different loads etc
    // null/undefined is a permissable value for scheduleFormState.
    formState?: VestingScheduleFormState | null
    onFormStateChange?: (formState: VestingScheduleFormState) => void;
}

const cliffOpts: readonly Duration[] = [
    {minutes: 2},
    {minutes: 10},
    {months: 1},
    {months: 2},
    {months: 3},
    {months: 6},
    {months: 9},
    {years: 1},
    {years: 2},
];

const linearReleaseOptions: readonly (Duration & {label: string})[] = [
    {seconds: 1, label: 'Continuous'},
    {minutes: 1, label: 'Every Minute'},
    {hours:   1, label: 'Hourly'},
    {days:    1, label: 'Daily'},
    {weeks:   1, label: 'Weekly'},
    {months:  1, label: 'Monthly'},
    {years:   1, label: 'Yearly'},
]

const ScheduleCreateForm: FC<ScheduleCreateFormProps> = (props) => {
    const {
        vestingContractAddress, 
        onScheduleFinish,
        onScheduleError,
        onFormStateChange = null,
        createButtonText = "Prepare Schedule", 
        onPendingClaimTemplateFinish = null,
        formState: passedInFormState = null,
    } = props;

    const {chainId} = useMoralis();

    const selectedVestingContract = useSelector(selectSingleVestingContractFull({address: vestingContractAddress, chainId}));

    const _testingStartDate = startOfDay(new Date());
    const _testingEndDate = addDate(_testingStartDate, {days: 1});

    const [pendingClaimInfo, setPendingClaimInfo] = useState<ClaimInfo | null>(null);
    const [pendingClaimTemplate, setPendingClaimTemplate] = useState<PendingClaimTemplate | null>(null);

    const myClaimTemplates = useSelector(myClaimTemplatesSelectors.selectAll);

    // const [isCreateClaimTemplate, setIsCreateClaimTemplate] = useState(false);
    
    const [isSelectClaimTemplateDialogSelectorOpen, setIsSelectClaimTemplateDialogSelectorOpen] = useState(false);

    const [tentativeDatePossibilities, setTentativeDatePossibilities] = useState<Date[]>([])

    // const [formState, setFormState] = useState<VestingScheduleFormState>(passedInFormState ??{
    //     claimTemplateLabel: "",
    //     isCreateClaimTemplate: false,

    //     scheduleStartDate: formatISO(_testingStartDate),
    //     totalAmountTokens: "100",
    //     cliffDurationAfterScheduleStart: cliffOpts[2],
    //     cliffPercent: "15",

    //     // linearReleaseFrequency: linearReleaseOptions[1],
    //     linearReleaseFrequency: null,
    //     scheduleEndDate: formatISO(_testingEndDate),
    // });
    const [formState, setFormState] = useState<VestingScheduleFormState>(passedInFormState ?? {
        claimTemplateLabel: "",
        isCreateClaimTemplate: false,

        scheduleStartDate: "",
        totalAmountTokens: "",
        cliffDurationAfterScheduleStart: null,
        cliffPercent: "",

        // linearReleaseFrequency: linearReleaseOptions[1],
        linearReleaseFrequency: null,
        scheduleEndDate: "",
    });

    const [formFieldErrors, setFormFieldErrors] = useState<Partial<{[k in (keyof VestingScheduleFormState | 'general')]: string}>>({});
    const [errorText, setErrorText] = useState<string | null>(null);

    const parseFormDate = (dateStr: string) => {
        // return new Date(dateStr);
        return parseISODate(dateStr);
    }

    const getLinearVestStartDate = () => {
        const scheduleStartDate = parseFormDate(formState.scheduleStartDate);
        return formState.cliffDurationAfterScheduleStart ? addDate(scheduleStartDate, formState.cliffDurationAfterScheduleStart) : scheduleStartDate
    }

    /**
     * Process the current form state to obtain a pending claim and errors (if any).
     */
    const validateSchedule = () => {
        const errors: typeof formFieldErrors = {}
        setPendingClaimInfo(null);

        // Do the calculations multiplied by 100000
        // We might want to switch to bignumbers right here, but the input can be decimal on the user's side
        const totalAmountTokensMulE5 = 100000 * parseFloat(formState.totalAmountTokens)
        // Cliff amount is 0 if we have no cliff selected
        const cliffAmountTokensMulE5 = formState.cliffDurationAfterScheduleStart ? Math.floor(totalAmountTokensMulE5 * parseFloat(formState.cliffPercent) * 0.01) : 0;
        const linearVestedAmountTokensMulE5 = totalAmountTokensMulE5 -  cliffAmountTokensMulE5;

        // Just in case - go back to dividing by 10e5
        const cliffAmountTokens = +(cliffAmountTokensMulE5 * 0.00001).toFixed(5);
        const linearVestedAmountTokens = +(linearVestedAmountTokensMulE5 * 0.00001).toFixed(5);

        // Parse/process this
        const scheduleStartDate = parseFormDate(formState.scheduleStartDate);
        // const scheduleEndDate = addDate(parseFormDate(formState.scheduleEndDate), {seconds: 6});
        const scheduleEndDate = parseFormDate(formState.scheduleEndDate);

        if(!selectedVestingContract) {
            errors.general = "Please select the vesting contract.";
        }

        if(isNaN(scheduleStartDate.getTime())) {
            errors.scheduleStartDate = "Start date must be set.";
        }
        
        if(!formState.linearReleaseFrequency) {
            errors.linearReleaseFrequency = "Release frequency must be set."
        }
        else if(!scheduleEndDate) { // Don't error on endDate if already errored on linearReleaseFrequency
            errors.scheduleEndDate = "End date must be set."
        }

        if(!(totalAmountTokensMulE5 > 0)) {
            errors.totalAmountTokens = "Tokens must be assigned to the schedule.";
        }
        else if((parseFloat(formState.totalAmountTokens) * 1000 % 1) > 0.000001) {
            errors.totalAmountTokens = "Amount can't have more than three decimal places.";
        }

        if(formState.cliffDurationAfterScheduleStart) {
            if(!(cliffAmountTokensMulE5 > 0)) {
                errors.cliffPercent = "If using cliff, cliff percent must be set.";
            }
            else if((parseFloat(formState.cliffPercent) * 100 % 1) > 0.000001) {
                errors.cliffPercent = "Cliff cannot more than two decimal places.";
            }
            else if(parseFloat(formState.cliffPercent) >= 100) {
                errors.cliffPercent = "Cliff cannot be more than 100%.";
            }
        } 

        if(formState.isCreateClaimTemplate && !formState.claimTemplateLabel) {
            errors.isCreateClaimTemplate = "Attempting to create a claim template, but template is not set.";
        }
        
        // TS prerequisite for everything that follows (should be error handled above )
        if(!isNaN(scheduleStartDate.getTime()) && formState.linearReleaseFrequency) {

            const linearVestStartTime = getLinearVestStartDate();
            let linearVestEndTime = scheduleEndDate;

            // Distinguish the casese where we're before or after the linear vest star time
            if(scheduleEndDate < linearVestStartTime) {
                errors.scheduleEndDate = errors.scheduleStartDate = `Linear vesting end date must be after the start date. Linear vesting starts at ${formatDate(linearVestStartTime, DATETIME_S_FORMAT)} because of the cliff.`
            }
            else if(scheduleEndDate < scheduleStartDate) {
                errors.scheduleEndDate = errors.scheduleStartDate = "End date must be after the start date."
            }

            if(linearVestStartTime && linearVestEndTime && formState.linearReleaseFrequency) {
                // How many times does the release interval fit into the whole date interval
                // Must be a whole number, otherwise we get undefined behaviour
                const lengthReleaseIntervalSecs = differenceInSeconds(addDate(linearVestStartTime, formState.linearReleaseFrequency), linearVestStartTime);
                const numReleaseIntervalMultiples = Math.abs(differenceInSeconds(linearVestEndTime, linearVestStartTime) / lengthReleaseIntervalSecs);
                const releaseIntervalDecimalPart = numReleaseIntervalMultiples % 1;

                const wholePart = numReleaseIntervalMultiples - releaseIntervalDecimalPart;
                const closestMatchMult = Math.max(Math.round(numReleaseIntervalMultiples), 1); // cant  go lower than 1
                const tentativeEndDate = addDate(linearVestStartTime, {seconds: closestMatchMult * lengthReleaseIntervalSecs});
                
                // console.log({lengthReleaseIntervalSecs, numReleaseIntervalMultiples, releaseIntervalDecimalPart, closestMatchMult, tentativeEndDate, secondsDifference: numReleaseIntervalMultiples * releaseIntervalDecimalPart})

                // If the tentative and actually selected date are very close together (30 seconds), just use the tentative date
                if((scheduleEndDate > linearVestStartTime) && (releaseIntervalDecimalPart < 0.0001 || (lengthReleaseIntervalSecs * releaseIntervalDecimalPart) < 100)) {
                    // In this case, just use the tentative assuming it's close enough
                    linearVestEndTime = tentativeEndDate;
                }
                else {
                    errors.linearReleaseFrequency = `Invalid interval. Closest end date: ${tentativeEndDate ? formatDate(tentativeEndDate, DATETIME_FORMAT) : 'N/A'}. You can select one of the options below.`;
                    const tentativeDates = [];
                    const startMultiplier = Math.max(closestMatchMult - 2, 0);
                    for(let m = startMultiplier; m < startMultiplier + 4; m++) {
                        const tentativeEndDate = addDate(linearVestStartTime, {seconds: m * lengthReleaseIntervalSecs});
                        if(tentativeEndDate > linearVestStartTime) {
                            tentativeDates.push(tentativeEndDate);
                        }
                    }
                    setTentativeDatePossibilities(tentativeDates);
                }
            }
            
            if(isNaN(scheduleEndDate.getTime())) {
                errors.scheduleEndDate = "Invalid end date."
            }

            try {

                if(formState.isCreateClaimTemplate) {
                    if(!formState.claimTemplateLabel) {
                        errors.claimTemplateLabel = "Claim template label must be selected if template creation is desired."
                    }
                    else {
                        // const claimTemplate = getClaimTemplateFromPendingClaim(pendingClaimInfo, formState.claimTemplateLabel, selectedVestingContract.address);
                        const claimTemplate: PendingClaimTemplate = {
                            tokenAddress: selectedVestingContract?.token?.address ?? null,
                            vestingContractAddress: selectedVestingContract?.address ?? null,

                            label: formState.claimTemplateLabel,
                            isTimestampRelative: true,
                        
                            scheduleStartTimestamp: dateToAbsoluteTimestampSecs(scheduleStartDate),
                            totalAmountTokens: formState.totalAmountTokens,
                            cliffDurationAfterScheduleStart: formState.cliffDurationAfterScheduleStart,
                            cliffPercent: parseFloat(formState.cliffPercent),
                        
                            linearReleaseFrequency: formState.linearReleaseFrequency,
                            scheduleEndTimestamp: dateToAbsoluteTimestampSecs(linearVestEndTime),
                        }
                        setPendingClaimTemplate(claimTemplate)
                    }
                } 

                if(Object.keys(errors).length === 0) {
                    const pendingClaimInfo = calculatePendingClaimInfo({
                        linearVestStartTime, 
                        linearVestEndTime, 
                        cliffReleaseTime: (cliffAmountTokens > 0) ? linearVestStartTime : null, // cliff time and linear start are at the same moment
                        releaseInterval: formState.linearReleaseFrequency, 
                        linearVestedAmountTokens, 
                        cliffAmountTokens,
                        unitDecimals: selectedVestingContract?.token?.decimals ?? 18
                    });
                    setPendingClaimInfo(pendingClaimInfo);
                }
            }
            catch(e: any) {
                errors.general = e.message;
            }
        }
        setFormFieldErrors(errors);
    }

    const handlePrepareSchedule = async () => {
        // Validate the data, report claim template should be created, and report schedule finished.
        try{
            if(!pendingClaimInfo) {
                throw new Error("Invalid claim");
            }
            if(!selectedVestingContract){
                throw new Error("Vesting contract not loaded");
            }
         
            if(formState.isCreateClaimTemplate && pendingClaimTemplate) {
               
                onPendingClaimTemplateFinish?.(pendingClaimTemplate);
            }

            onScheduleFinish?.(pendingClaimInfo);
        }
        catch(e: any) {
            const errorText = `Error while calculating the schedule: ${formFieldErrors?.general ?? e.message}`;
            setErrorText(errorText);

            onScheduleError?.();
        }
    }

    // Immediately run the validator
    useEffect(validateSchedule, [formState]);

    // Once a claim is selected, load the respective data into the form
    const handleSelectClaimTemplate = (claimTemplate: ClaimTemplate) => {
        // const claimTemplate = myClaimTemplates.filter(ct => ct.label === selectedClaimTemplateId)?.[0];
        // if(!claimTemplate) 
        //     return;
        // const {startTimestamp, endTimestamp, cliffReleaseTimestamp, linearVestAmount, cliffAmount, releaseIntervalSecs} = getPendingClaimFromClaimTemplate(claimTemplate, new Date())

        let scheduleStartDate = timestampToDate(claimTemplate.scheduleStartTimestamp);
        let cliffReleaseDate = claimTemplate.cliffDurationAfterScheduleStart ? addDate(scheduleStartDate, claimTemplate.cliffDurationAfterScheduleStart) : claimTemplate.scheduleStartTimestamp;
        let linearVestStartDate = cliffReleaseDate;
        let scheduleEndDate = timestampToDate(claimTemplate.scheduleEndTimestamp)

        const newState: VestingScheduleFormState = {
            scheduleStartDate: formatDate(scheduleStartDate, DATE_FORMAT),
            scheduleEndDate: formatDate(scheduleEndDate, DATE_FORMAT),
            // totalAmountTokens: formatTokenAmount(claimTemplate.totalAmount, selectedVestingContract?.token),
            totalAmountTokens: claimTemplate.totalAmountTokens,
            cliffDurationAfterScheduleStart: claimTemplate.cliffDurationAfterScheduleStart,
            cliffPercent: claimTemplate.cliffPercent?.toString() ?? "",
            linearReleaseFrequency: linearReleaseOptions.find(lro => {
                const [unit, num] = Object.entries(claimTemplate.linearReleaseFrequency)?.[0];

                // @ts-ignore
                return (lro?.[unit] === num);
            }) ?? linearReleaseOptions[0],

            claimTemplateLabel: "", 
            isCreateClaimTemplate: false,  
        };
        // console.log("loading", newState, "from", claimTemplate)
        setFormState(newState);
        setIsSelectClaimTemplateDialogSelectorOpen(false);
    }

    const updateFormState = (name: keyof VestingScheduleFormState, value: string) => {
        let newValue;
        // const newErrors: (typeof formFieldErrors) = {};
        const otherAssignments: Partial<VestingScheduleFormState> = {};
        switch(name) {
            // Objects
            case 'cliffDurationAfterScheduleStart': 
                newValue = JSON.parse(value);
                // if(!newValue) {
                //     newErrors[name] = "Invalid cliffDurationAfterScheduleStart";
                // }
                break;
            case 'linearReleaseFrequency':
                newValue = JSON.parse(value);
                
                if(!newValue) {
                    otherAssignments.scheduleEndDate = "";
                }
                break;

            case 'scheduleStartDate':
            case 'scheduleEndDate':
                const dt = parseISODate(value);
                try {
                    newValue = formatISO(dt);
                }
                catch(e: any) {
                    newValue = "";
                }
                break

            // Everything else will be parsed int he validation fn
            default:
                newValue = value;
                break;
        }
        const newState = {...formState, [name]: newValue, ...otherAssignments };
        setFormState(newState);
        onFormStateChange?.(newState); // Notify the listeners of the change
    }

    const fieldWidth = 190;

    const fieldProps = (name: keyof VestingScheduleFormState): OutlinedTextFieldProps => ({
        name,
        margin: "normal",
        variant: "outlined",
        label: camelToTitleCase(name),
        value: formState[name] ?? "",
        // onChange: (e: any) => setFormState({...formState, [name]: e.target.value }),
        onChange: (e: any) => updateFormState(name, e.target.value),
        sx: {width: fieldWidth, marginRight: 2},
        error: !!(formFieldErrors?.[name] ?? false),
        helperText: (formFieldErrors[name] ?? ""),
    })

    const startDt = formState.scheduleStartDate && parseFormDate(formState.scheduleStartDate);
    const endDt = formState.scheduleEndDate && parseFormDate(formState.scheduleEndDate);

    const fullWidth = 2 * (fieldWidth + 8);

    return <Box>
        <Button variant={"outlined"} disabled={myClaimTemplates.length === 0} onClick={() => setIsSelectClaimTemplateDialogSelectorOpen(true)}>Load Template</Button>

        <ClaimTemplateSelectDialog 
                open={isSelectClaimTemplateDialogSelectorOpen} 
                onClaimTemplateSelect={handleSelectClaimTemplate}
                onClose={() => setIsSelectClaimTemplateDialogSelectorOpen(false)} />

        <FormGroup row>
            {/* formState.scheduleStartDate is actually an ISO8601 string, but just the part before T goes into the datepicker */}
            <Tooltip title={startDt && <>Selected Time (UTC): {startDt && formatDate(startDt, DATETIME_S_FORMAT)}</>}>
                <TextField type="date" InputLabelProps={{shrink: true}} {...fieldProps('scheduleStartDate')} value={startDt && formatDate(startDt, DATE_FORMAT)} />
            </Tooltip>
            <TextField {...fieldProps('totalAmountTokens')} />
        </FormGroup>

        <FormGroup row>
            <TextField select {...fieldProps('cliffDurationAfterScheduleStart')} value={JSON.stringify(formState.cliffDurationAfterScheduleStart)} sx={{width: fullWidth}}>
                <MenuItem value={"null"}>No Cliff</MenuItem>
                {cliffOpts.map((cliffOpt, i) => 
                    <MenuItem key={i} value={JSON.stringify(cliffOpt)}>{formatDuration(cliffOpt)}</MenuItem>
                )}
                {/* <MenuItem value={'custom'}>Custom</MenuItem> */}
            </TextField>
        </FormGroup>
        {/* Hide and disable the cliff percent field - as we don't really want to be deleting the value */}
        {formState.cliffDurationAfterScheduleStart !== null && <FormGroup row>
            <TextField {...fieldProps('cliffPercent')} label={'Release % (0 - 100)'} disabled={formState.cliffDurationAfterScheduleStart === null} sx={{width: fullWidth}} />
        </FormGroup>}

        <FormGroup row>
            <TextField select {...fieldProps('linearReleaseFrequency')} value={JSON.stringify(formState.linearReleaseFrequency) ?? ""}>
                <MenuItem value={"null"}>Please Select</MenuItem>
                {linearReleaseOptions.map((opt, i) => 
                    <MenuItem key={i} value={JSON.stringify(opt)}>{opt.label ?? formatDuration(opt)}</MenuItem>
                )}
            </TextField>
            <Tooltip title={endDt && <>Selected Time (UTC): {endDt && formatDate(endDt, DATETIME_S_FORMAT)}</>}>
                <TextField type="date" InputLabelProps={{shrink: true}} disabled={formState.linearReleaseFrequency === null} {...fieldProps('scheduleEndDate')} value={endDt && formatDate(endDt, DATE_FORMAT)}/> 
            </Tooltip>
            {/* formState.scheduleStartDate is actually an ISO8601 string, but just the part before T goes into the datepicker */}
        </FormGroup>

        {(formFieldErrors.linearReleaseFrequency || formFieldErrors.scheduleEndDate) && tentativeDatePossibilities.length > 0 && <FormGroup row>
            <Stack>
            {tentativeDatePossibilities.map((td,  i) => {
                return <Button key={i} onClick={e => updateFormState('scheduleEndDate', formatISO(td))}>{formatDate(td, DATETIME_S_FORMAT)}</Button>
            }) }
            </Stack>
            {formState.linearReleaseFrequency && <Tooltip title={`You've selected a schedule with the ${formState.linearReleaseFrequency.label} release frequency,
            but to a computer, this is actually ${differenceInSeconds(addDate(0, formState.linearReleaseFrequency), 0)} 
            seconds. Therefore, the end date of your schedule needs to complete n full intervals of that many seconds after the 
            linear vesting start date, which is ${formatDate(getLinearVestStartDate(), DATETIME_S_FORMAT)}.`}>
                <Button color={'inherit'} startIcon={<InfoIcon />}>What is this?</Button>
            </Tooltip>}
        </FormGroup>}
        <FormGroup>
            {/* no typecheck here for checked */}
            <FormControlLabel control={<Checkbox value={formState.isCreateClaimTemplate} onChange={e => updateFormState('isCreateClaimTemplate', e.target.checked as any)} />} label="Save as a template schedule" />
            {formState.isCreateClaimTemplate && <TextField {...fieldProps('claimTemplateLabel')} disabled={!formState.isCreateClaimTemplate} label={"Schedule Name"} sx={{width: fullWidth}} />}
        </FormGroup>
        {formFieldErrors?.general && <Alert severity="error">{formFieldErrors.general}</Alert>}

        {pendingClaimInfo && selectedVestingContract?.token && <ScheduleParamsView claimInfo={pendingClaimInfo} token={selectedVestingContract?.token} />}

        {errorText && <Alert severity={'error'}>{errorText}</Alert>}
        
        {selectedVestingContract === null && <>
            <CircularProgress /> 
            <Typography>Loading contract metadata. If this persists, please make sure that you've selected the right contract, and you're on the right chain.</Typography>
        </>}
        <Button sx={{width: fullWidth, mt: 2, minHeight: 20}} color={'primary'} onClick={handlePrepareSchedule} variant={'contained'} disabled={pendingClaimInfo === null || selectedVestingContract === null}>{createButtonText}</Button>
    </Box>
}

export default ScheduleCreateForm;