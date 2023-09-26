import { useEffect, useState } from 'react';
import {Alert, AlertProps, MenuItem, Select, Snackbar} from '@mui/material';
import AddressDisplay from '../address/AddressDisplay';
import { useMoralis } from 'react-moralis';

export type UserAddressSelectorProps = {
    
};

export default function UserAddressSelector(props: UserAddressSelectorProps) {

    const { 
        web3: web3Provider, 
        isWeb3Enabled, 
        enableWeb3, 
        isAuthenticated, 
        Moralis, 
        chainId,
        user, 
        account: metaMaskSelectedAddress,
        logout,
        refetchUserData,
    } = useMoralis();

    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const [notificationMessage, setNotificationMessage] = useState<string|null>(null);
    const [notificationSeverity, setNotificationSeverity] = useState<AlertProps['severity']>('error');

    useEffect(() => {
        if(!user || !metaMaskSelectedAddress) {
            return;
        }


        const moralisAddresses = user?.attributes?.accounts ?? [];

        if(moralisAddresses.indexOf(metaMaskSelectedAddress) === -1) {
            const confirmResult = window.confirm(`You've changed the address in your MetaMask. Do you want to link the address ${metaMaskSelectedAddress}?\n`+
                        `If you choose to proceed, the system will ask you for a signature for the new address.\n` + 
                        `If you cancel, the system will log you out.`);
            // console.log(confirmResult)
            if(confirmResult) {
                console.log(metaMaskSelectedAddress)
                const linkPromise = Moralis.link(metaMaskSelectedAddress);
                linkPromise.then((updatedUserData) => {
                    console.log("Link successful.", updatedUserData);
                    // Link returns new user data, explicit refetch not necessary
                    // refetchUserData().then(newUserData => {
                    //     console.log("Refreshed user data", newUserData);
                    // }).catch(reason => {
                    //     alert("Unable to refresh the user data. Please refresh the page." + reason?.message);
                    // })
                }).catch(reason => {
                    console.error(reason)
                    const msg = "Unable to link the account: " + reason?.message;
                    setNotificationMessage(msg);
                    setNotificationSeverity('error');
                });
            }
            else {
                const msg = "Since the account has been switched, and the new account is not linked, logging you out. If you want to link this account later, please log in with the previous account, and then switch the address.";
                // setNotificationMessage(msg);
                // setNotificationSeverity('warning');
                // We can't do notifications in this scenario as we need to do a blocking action to make sure user understands what's happening
                logout();
                alert(msg);
            }
        }
        else {
            if(isInitialLoad) {
                setIsInitialLoad(false);
            }
            else {
                const msg = ("Switching to an already linked address. You will continue to be able to see all your data, but you will only be able to execute transactions from the new address.");
                setNotificationMessage(msg);
                setNotificationSeverity('info');
            }
        }

    }, [user, metaMaskSelectedAddress]);

    const handleRequestAddressChange = (newAccount: string) => {
        const msg = "Please change the address using your MetaMask.";
        setNotificationMessage(msg);
        setNotificationSeverity('error');
    }

    return <>
        {metaMaskSelectedAddress && <Select 
            value={metaMaskSelectedAddress} 
            onChange={e => e.target.value && handleRequestAddressChange(e.target.value)} 
            variant={"standard"}
            disableUnderline
            IconComponent={()=>null}
            >
                {user?.attributes?.accounts?.map((address: string) => <MenuItem key={address} value={address}>
                    <AddressDisplay 
                    // stupid hack to force rerender after value change
                        key={address}
                        value={address} 
                        // TODO: Proper chain detection
                        chain={'eth'}
                        maxDisplayChars={8}
                        fontSize={14}>
                            {address}
                    </AddressDisplay>
                </MenuItem>)}
        </Select>}
        
        <Snackbar open={notificationMessage !== null} onClose={() => setNotificationMessage(null)} autoHideDuration={10000} anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}>
            <Alert severity={notificationSeverity ?? 'error'}>{notificationMessage}</Alert>
        </Snackbar>
    </>
}


