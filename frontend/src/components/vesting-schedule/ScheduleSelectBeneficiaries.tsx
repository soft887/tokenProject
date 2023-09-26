import { FC, useEffect, useState } from "react";
import { useMoralis } from "react-moralis";
import { Box, Button,  TextField, Typography, MenuItem, Dialog, DialogTitle, DialogContent, FormGroup, OutlinedTextFieldProps, Stack, DialogActions, TableHead, TableBody, TableCell, TableRow, Table, IconButton, Alert } from "@mui/material";
import { ethers, utils } from "ethers";
import { useSelector } from "react-redux";
import { Address, AnonymousVestingUserInfo, KnownVestingUserInfo, RoundTypeList, UserTypeList, VestingBeneficiary } from "../../utils/types";
import { camelToTitleCase } from "../../utils/helpers";
import { myUsersSelectors, selectSingleVestingContractFull } from "../../store/vestingSlice";
import CsvImport from "../generic/CsvImport";
import UserTypeChip from "../generic/chip/UserTypeChip";
import RoundTypeChip from "../generic/chip/RoundTypeChip";
import DeleteIcon from '@mui/icons-material/Delete';
import AddressDisplay from "../address/AddressDisplay";

export type ScheduleSelectBeneficiariesProps = {
    maxNumBeneficiaries?: number,
    vestingContractAddress: Address;
    selectButtonText?: string;
    beneficiaries?: VestingBeneficiary[]; // allow passing in of outside objects
    backButtonText?: string;
    backButtonAction?: () => void;
} & ({
    displayOnly: false;
    onBeneficiariesSelected: (beneficiaries: VestingBeneficiary[]) => void;
    onKnownBeneficiarySave: (beneficiary: KnownVestingUserInfo) => Promise<boolean>;
} | {
    displayOnly?: true;
})


type CsvEntryType = Omit<KnownVestingUserInfo, 'isAnonymous'>;

const ScheduleSelectBeneficiaries: FC<ScheduleSelectBeneficiariesProps> = (props) => {

    const { 
        maxNumBeneficiaries = null,
        vestingContractAddress,
        // @ts-ignore
        onKnownBeneficiarySave = null,
        // @ts-ignore
        onBeneficiariesSelected = null,
        selectButtonText = "Select",
        backButtonText = "Back",
        backButtonAction = null,
        beneficiaries: passedInBeneficiaries = [],
        displayOnly = false,
     } = props;
     
    const {web3: web3Provider, Moralis, user, chainId} = useMoralis();

    const vestingContractInfo = useSelector(selectSingleVestingContractFull({address: vestingContractAddress, chainId}));
   

    const [isAddSingleUserOpen, setIsAddSingleUserOpen] = useState(false);
    const [isAddUserCsvOpen, setIsAddUserCsvOpen] = useState(false);
    const [singleUserAddMode, setSingleUserAddMode] = useState<'known' | 'anonymous'>('known');

    const [beneficiaries, setBeneficiaries] = useState<VestingBeneficiary[]>(passedInBeneficiaries);

    const [userForExistingUserPrompt, setUserForExistingUserPrompt] = useState<KnownVestingUserInfo|null>(null);
    
    // Whether we should ping the db to save the user, or should we simply skip DB adding, and we'll add it to the internal list
    const [shouldDbAddUser, setShouldDbAddUser] = useState(true);

    const [currentBeneficiaryState, setCurrentBeneficiaryState] = useState<KnownVestingUserInfo & {isAnonymous: boolean}>({
        name: "",
        address: "",
        isAnonymous: false,
        userType: UserTypeList[0],
        roundType: RoundTypeList[0],
        companyName: "",
    });

    const myUserEntities = useSelector(myUsersSelectors.selectEntities)

    const [formFieldErrors, setFormFieldErrors] = useState<Partial<typeof currentBeneficiaryState>>({});

    const handleAddUser = async () => {
        let ben;
        let beneficiaryAddSuccess = true;

        const {address: nonCasedAddress, ...restBeneficiaryState} = currentBeneficiaryState;

        // Correctly case the accress, according to ethereum standards (to avoid mismatches later on)
        const address = ethers.utils.getAddress(nonCasedAddress);

        if(singleUserAddMode === 'anonymous') {
            ben = {address, isAnonymous: true} as AnonymousVestingUserInfo;
        }
        else {
            ben = {...restBeneficiaryState, address, isAnonymous: false} as KnownVestingUserInfo;

            if(shouldDbAddUser) {
                beneficiaryAddSuccess = onKnownBeneficiarySave && (await onKnownBeneficiarySave?.(ben));
            }
        }
        if(beneficiaryAddSuccess) {
            setBeneficiaries([...beneficiaries, ben])
            setCurrentBeneficiaryState({...currentBeneficiaryState, isAnonymous: false, name: "", address: "", companyName: ""}); // reset some form params
            setShouldDbAddUser(true);
        }
    }

    const fieldProps = (name: keyof KnownVestingUserInfo): OutlinedTextFieldProps => ({
        name,
        margin: "normal",
        variant: "outlined",
        disabled: (shouldDbAddUser === false) && (name !== 'address'), // if not db adding, then only address is changeable
        label: camelToTitleCase(name),
        value: currentBeneficiaryState[name],
        onChange: (e: any) => setCurrentBeneficiaryState({...currentBeneficiaryState, [name]: e.target.value}),
        // sx: {width: 200, marginRight: 2},
        error: !!formFieldErrors?.[name],
        helperText: formFieldErrors?.[name],
        fullWidth: true,
    });

    const handleFinish = () => {
        setIsAddSingleUserOpen(false);
        onBeneficiariesSelected?.(beneficiaries);
    }

    // Set errors whenever the form state is changed
    useEffect(() => {
        const newErrors: (typeof formFieldErrors) = {};
        if(!utils.isAddress(currentBeneficiaryState.address)) {
            newErrors.address = "Please enter a valid address.";
        }
        else {
            const existingUser = myUserEntities?.[currentBeneficiaryState.address];
            
            if(existingUser) {
                setUserForExistingUserPrompt(existingUser);
            }
            else if(userForExistingUserPrompt?.address !== currentBeneficiaryState.address) {
                setUserForExistingUserPrompt(null);
            }
        }
        setFormFieldErrors(newErrors)

        
    }, [currentBeneficiaryState]);

    const hasErrors = Object.keys(formFieldErrors).length > 0;


    const csvColumns = [
        {name: 'address', isOptional: false, label: 'Wallet Address'},
        {name: 'name'}, 
        {name: 'userType'}, 
        {name: 'roundType'},
        {name: 'companyName'},
    ].map(col => ({
        label: camelToTitleCase(col.name),
        isOptional: true, 
        ...col
    })) as {
        name: keyof CsvEntryType;
        label: string;
        isOptional: boolean
    }[];

    const validateCsvRow = (beneficiary: CsvEntryType) => {
        // If address is invalid, fail validation
        const errors = [];
        if(!ethers.utils.isAddress(beneficiary?.address)) {
            errors.push("Invalid address.");
        }
        if(!beneficiary?.name) {
            errors.push("Invalid beneficiary name.");
        }
        if(!beneficiary?.companyName) {
            errors.push("Invalid company name.");
        }
        return  (errors.length === 0) ? {isValid: true} : {
            isValid: false,
            allowIgnore: false,
            message: errors.join(" ")
        }
    }

    const handleReceiveCSVImport = async (entries: CsvEntryType[]) => {
        const saveErrors: (typeof entries) = [];

        let entriesToAdd;
        if(shouldDbAddUser) {
            entriesToAdd = await Promise.all(entries.map(async beneficiaryRow => {
                const ben = {
                    ...beneficiaryRow, 
                    address: ethers.utils.getAddress(beneficiaryRow.address), 
                    isAnonymous: false
                } as KnownVestingUserInfo;
                const beneficiaryAddSuccess = !onKnownBeneficiarySave || (await onKnownBeneficiarySave?.(ben));
    
                if(beneficiaryAddSuccess) {
                    return ben;
                }
                else {
                    saveErrors.push(beneficiaryRow);
                    return null;
                }
            }));
            entriesToAdd = entriesToAdd.filter(ben => ben !== null) as KnownVestingUserInfo[];
        }
        else {
            entriesToAdd = entries.map((entry: CsvEntryType) => ({address: entry.address, isAnonymous: true} as AnonymousVestingUserInfo))
        } 

        console.log("Save errors encountered:", saveErrors)

        setBeneficiaries([...beneficiaries, ...entriesToAdd]);
        setIsAddUserCsvOpen(false);
    }

    const setAddress = (address: Address) => {
        setCurrentBeneficiaryState({...currentBeneficiaryState, address});
    }

    const handleExistingUserOverride = () => {
        setShouldDbAddUser(true);
        setCurrentBeneficiaryState({...currentBeneficiaryState, ...userForExistingUserPrompt});
        setUserForExistingUserPrompt(null);
    }
    const handleExistingUserAddAsIs = () => {
        setShouldDbAddUser(false);
        setUserForExistingUserPrompt(null);
    }

    const showRandomMineButtons = (window?.location?.hostname?.indexOf('localhost') !== -1);

    return <Box>
        {!displayOnly && <>
        <Dialog open={isAddSingleUserOpen}>
            <DialogTitle>Add User</DialogTitle>
            <DialogContent>
                {/* Get rid of tabs for now */}
                {/* <Tabs value={singleUserAddMode} onChange={(e, newIndex) => setSingleUserAddMode(newIndex)}>
                    <Tab label={'Known'} value={'known'} />
                    <Tab label={'Anonymous'} value={'anonymous'} />
                </Tabs> */}
                <Box sx={{width: 400, height: 420}}>
                    <FormGroup>
                        <AddressDisplay 
                            // forcing rerender every time (because the buttons might have triggered a state change)
                            // TODO: get rid of this
                            key={new Date().getTime()} 
                            editable 
                            {...fieldProps('address')} 
                            value={currentBeneficiaryState.address} 
                            onChange={setAddress} 
                            sx={{mb: -1}} />
                        {userForExistingUserPrompt && <Box sx={{py: 1}}>
                            <Typography sx={{fontSize: 13}}>User exists. Would you like to override their metadata, or add as is?</Typography>
                            <Button onClick={handleExistingUserOverride}>Override</Button>
                            <Button onClick={handleExistingUserAddAsIs}>Add As is</Button>
                        </Box>}
                        {showRandomMineButtons && <Stack direction="row">
                            <Button onClick={async () => setAddress(await ethers.Wallet.createRandom().getAddress()) }>Random</Button>
                            <Button onClick={() => setAddress(ethers.utils.getAddress(user?.attributes?.ethAddress) ?? '') }>Mine</Button>
                        </Stack>}
                    </FormGroup>

                    {singleUserAddMode === 'known' && <>
                        <FormGroup row>
                            <TextField select {...fieldProps('userType')}>
                                {UserTypeList.map(ut => <MenuItem key={ut} value={ut}>{ut}</MenuItem>)}
                            </TextField>
                        </FormGroup>
                        
                        <FormGroup row>
                            <TextField {...fieldProps('name')} />
                            <TextField {...fieldProps('companyName')} />
                        </FormGroup>

                        <FormGroup row>
                            <TextField select {...fieldProps('roundType')}>
                                {RoundTypeList.map(rt => <MenuItem key={rt} value={rt}>{rt}</MenuItem>)}
                            </TextField>
                        </FormGroup>
                    </>}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button disabled={hasErrors} variant={'contained'} color={'primary'}   onClick={handleAddUser}>Save User and Add Another</Button>
                <Button disabled={hasErrors} variant={'contained'} color={'primary'}   onClick={() => {handleAddUser(); setIsAddSingleUserOpen(false);}}>Save User</Button>
                <Button variant={'contained'} color={'secondary'} onClick={() => setIsAddSingleUserOpen(false)}>Cancel</Button>
            </DialogActions>
        </Dialog>

        <Dialog open={isAddUserCsvOpen} fullScreen>
            <DialogTitle>Add User Set</DialogTitle>
            <DialogContent>
                <CsvImport 
                    columns={csvColumns} 
                    onImport={handleReceiveCSVImport} 
                    onCancel={() => setIsAddUserCsvOpen(false)} 
                    columnAutoMatchMethod={'name-label'}
                    trimSpaces 
                    validateRow={validateCsvRow}
                    />
            </DialogContent>
        </Dialog>

        <Stack spacing={2} direction={'row'} alignItems={'baseline'}>
            <Button 
                variant={'contained'} 
                onClick={() => setIsAddSingleUserOpen(true)}
                // Disable if we're at the max
                disabled={maxNumBeneficiaries ? (beneficiaries.length >= maxNumBeneficiaries) : false}
                >Add single user</Button>
            <Button 
                color={'secondary'} 
                variant={'contained'} 
                disabled={maxNumBeneficiaries ? (beneficiaries.length >= maxNumBeneficiaries) : false}
                onClick={() => setIsAddUserCsvOpen(true)}>Add users CSV</Button>
        </Stack>
        </>}
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>User Type</TableCell>
                    <TableCell>Round Type</TableCell>
                    <TableCell>Company Name</TableCell>
                    {!displayOnly && <TableCell></TableCell>}
                </TableRow>
            </TableHead>
            <TableBody>
                {beneficiaries.map((ben, i) => <TableRow key={ben.address}>
                    <TableCell>{ben.isAnonymous ? <Typography sx={{fontStyle: 'italic'}}>Anonymous</Typography> : ben.name}</TableCell>
                    <TableCell>
                        <AddressDisplay copyable value={ben.address} maxDisplayChars={12} />
                    </TableCell>
                    <TableCell>{!ben.isAnonymous && ben.userType && <UserTypeChip userType={ben.userType} />}</TableCell>
                    <TableCell>{!ben.isAnonymous && ben.roundType && <RoundTypeChip roundType={ben.roundType} />}</TableCell>
                    <TableCell>{!ben.isAnonymous && ben.companyName}</TableCell>
                    {!displayOnly && <TableCell>
                        <IconButton onClick={() => setBeneficiaries([...beneficiaries.slice(0, i), ...beneficiaries.slice(i+1)]) }>
                            <DeleteIcon />
                        </IconButton>
                    </TableCell>}
                </TableRow>)}
            </TableBody>
        </Table>
        {maxNumBeneficiaries && (beneficiaries.length >= maxNumBeneficiaries) && <Alert severity={'warning'}>
            You can add a maximum of {maxNumBeneficiaries} users to this schedule, due to the vested amount and the number of tokens on the contract. Please fund the contract further if you wish to add more in one go.
        </Alert>}

        {!displayOnly && <Stack spacing={2} direction={'row'} sx={{mt: 2}}>
            {backButtonAction && <Button variant={'contained'} color="secondary" onClick={backButtonAction}>{backButtonText}</Button>}
            <Button variant={'contained'} disabled={beneficiaries.length === 0 || (maxNumBeneficiaries ? beneficiaries.length > maxNumBeneficiaries : false)} onClick={handleFinish}>{selectButtonText}</Button>
        </Stack>}
    </Box>
}

export default ScheduleSelectBeneficiaries;