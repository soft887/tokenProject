import React, {FC, useState} from 'react';
import { Box, Snackbar, Stack, TextField, TextFieldProps } from "@mui/material";
import { Address, Chain } from "../../utils/types";
import {utils} from "ethers";
import Icon from 'react-crypto-icons';

export type AddressDisplayProps = Omit<TextFieldProps, 'onChange'> & {
    value: Address,
    onChange?: (rawValue: string, isValid: boolean) => void,
    copyable?: boolean,
    editable?: boolean,
    maxDisplayChars?: number | null,
    chain?: Chain['nativeCurrency']['symbol'];
    fontSize?: number;
}

const AddressDisplay: FC<AddressDisplayProps> = (props) => {

    const {
        value, 
        onChange = null,
        copyable = false,
        maxDisplayChars = null,
        editable = false,
        chain = null,
        fontSize = 14,
        ...rest
    } = props;
    
    const [addr, setAddr] = useState(value);

    const [showCopied, setShowCopied] = React.useState(false);

    // const [showCopied, setShowCopied] = useState<any | null>(null);
    
    const copyToClipboard = () => {
        if(!copyable) return;

        navigator.clipboard.writeText(addr);
        setShowCopied(true);

        // if(showCopied !== null) { 
        //     clearInterval(showCopied);
        // }
        // setShowCopied(setTimeout(() => setShowCopied(null), 1200));
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;

        setAddr(newVal);
        onChange?.(newVal, utils.isAddress(newVal));
    }

    let abbrValue = addr;
    if(maxDisplayChars) {
        const numCharsBegin = Math.max(Math.floor(maxDisplayChars / 2 + 2), 4);
        const numCharsEnd = Math.max(Math.floor(maxDisplayChars / 2), 4);
        if(numCharsBegin + numCharsEnd < addr?.length) {
            abbrValue = addr.substring(0, numCharsBegin) + '...' + addr.substring(addr.length - numCharsEnd)
        }
    }

    const isDisplayOnly = !editable || maxDisplayChars;

    return <Stack direction={"row"} alignContent={'center'}>
        {isDisplayOnly && <>
            {chain && <Box sx={{mr: 0.5, verticalAlign: 'middle'}}>
                <Icon name={chain} size={1.5 * fontSize} />
            </Box>}
            <Box
                sx={{
                ...(copyable ? {cursor: 'pointer'} : null),
                    fontSize,
                    ...rest.sx
                }}
                onClick={copyToClipboard}>
                    {abbrValue}
            </Box> 
        </>}
        {!isDisplayOnly && <>
            {chain && <Box sx={{m: 1, ml: 0}}>
                <Icon name={chain} size={2.5 * fontSize} />
            </Box>}
            <TextField 
                onClick={copyToClipboard} 
                // disabled={!editable && maxDisplayChars ? maxDisplayChars < addr?.length : false} // assume shortened boxes are display only, since we can't write a shortened one (or maybe in a modal - todo?)
                value={abbrValue} 
                onChange={handleChange} 
                error={utils.isAddress(addr)}
                helperText={utils.isAddress(addr) ? 'Please enter a valid address.' : ''}
                sx={{
                    ...rest.sx
                }}
                variant={'outlined'}
                InputProps={{
                    // ...(isDisplayOnly ? {disableUnderline: true} : null),
                    sx:{
                        fontSize,
                        ...rest?.InputProps?.sx
                    },
                    ...rest.InputProps,
                }}
                {...rest}  />
        </>}
        <Snackbar 
            open={showCopied} 
            message="Copied."
            onClose={() => setShowCopied(false)}
            autoHideDuration={1200}

            />
    </Stack>
}

export default AddressDisplay;