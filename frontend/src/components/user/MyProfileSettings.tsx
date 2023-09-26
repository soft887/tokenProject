import { FC, useState } from "react";
import { Box, Button, Typography, FormControlLabel, Checkbox, Stack, FormGroup, CircularProgress, Alert } from "@mui/material";
import { useMoralis } from "react-moralis";
import { UserInterfaceRole, UserRoleObjectList } from "../../utils/types";
import { useAppDispatch } from "../../store/store";
import { SetUserData } from "react-moralis/lib/hooks/core/useMoralis/utils/setUserData";

export type MyProfileSettingsProps = {
    
}

const MyProfileSettings: FC<MyProfileSettingsProps> = () => {
    const { Moralis, user, setUserData, userError } = useMoralis();

    const [enabledUserTypes, setEnabledUserTypes] = useState<UserInterfaceRole[]>(user?.attributes?.enabledUserTypes?.sort() ?? []);
    const [defaultUserTypeView, setDefaultUserTypeView] = useState<UserInterfaceRole>(user?.attributes?.defaultUserTypeView ?? 'tokenOwner');

    const [notificationData, setNotificationData] = useState<string | null>(null);
    const [isProfileUpdateInProgress, setIsProfileUpdateInProgress] = useState(false);
    

    const handleToggleUserType = (userSlug: UserInterfaceRole, isRequested: boolean) => {
        const ind = enabledUserTypes.indexOf(userSlug);
        
        if(ind !== -1 && !isRequested) { // remove it
            const newUserTypes = [...enabledUserTypes.slice(0, ind), ...enabledUserTypes.slice(ind+1)];
            setEnabledUserTypes(newUserTypes); // already sorted
            
            if(newUserTypes.indexOf(defaultUserTypeView) === -1) { // we've deleted the default view, need to change it
                setDefaultUserTypeView(newUserTypes?.[0] ?? null);
            }
        }
        else if (ind === -1 && isRequested) {
            setEnabledUserTypes([...enabledUserTypes, userSlug].sort());

            if(!defaultUserTypeView) {
                setDefaultUserTypeView(userSlug);
            }
        }
    }


    const handleSubmitEnabledUserTypes = async () => {
        try {
            setIsProfileUpdateInProgress(true);
            await setUserData({defaultUserTypeView, enabledUserTypes} as unknown as SetUserData);
            setNotificationData("Successfully updated.");
        }
        catch(e: any) {
            setNotificationData(`Error while updating: ${e} ${userError}.`);
            
        }
        setIsProfileUpdateInProgress(false);
    }

    return <Box>
        <Typography>Enabled Views</Typography>
        <Stack>
            {UserRoleObjectList.map(({slug, label}, i) => { 
                const ind = enabledUserTypes.indexOf(slug);
                const isChecked = ind !== -1;
                
                return <FormGroup key={i}>
                    <FormControlLabel
                        control={<Checkbox checked={isChecked} onChange={(e) => handleToggleUserType(slug, e.target.checked)} />}
                        label={label}
                    /> 
                    {/* Set default not really required */}
                    {/* {isChecked && <Button onClick={(e) => setDefaultUserTypeView(slug)} disabled={defaultUserTypeView === slug}>Set Default</Button>}  */}
                </FormGroup>
            })}

            <Button variant="contained" onClick={handleSubmitEnabledUserTypes} disabled={isProfileUpdateInProgress}>Save</Button>
            {isProfileUpdateInProgress && <CircularProgress />}
            {notificationData && <Alert severity={notificationData?.indexOf('uccess') !== -1 ? 'info' : 'error'}>{notificationData}</Alert>}
        </Stack>
        
    </Box>
}

export default MyProfileSettings;