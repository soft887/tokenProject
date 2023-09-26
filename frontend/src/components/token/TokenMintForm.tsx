import React, { FC, useEffect, useState } from "react";
import { ethers, BigNumber } from "ethers"
import DashboardPageLayout from "../layout/DashboardPageLayout";
import { Address, TokenContractType, TokenInfo } from '../../utils/types';
import { loadTokenMetadataFromContract, parseTokenAmount } from '../../utils/contract/token';
import { Box, BoxProps, Button, Checkbox, CircularProgress, FormControl, FormControlLabel, FormLabel, getBottomNavigationActionUtilityClass, Grid, MenuItem, OutlinedTextFieldProps, Radio, RadioGroup, Slider, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { useMoralis } from "react-moralis";
import FullPremintERC20Token from "@vtvl/contracts/token/FullPremintERC20Token.sol/FullPremintERC20Token.json";
import VariableSupplyERC20Token from "@vtvl/contracts/token/VariableSupplyERC20Token.sol/VariableSupplyERC20Token.json";
import { camelToTitleCase, removeComma } from "../../utils/helpers";
import { standardizeChainId } from "../../utils/contract/chain";

export type TokenMintFormProps = BoxProps & {
    onMintStart?: (formState: TokenMintFormState) => void,
    onMintWaiting?: (formState: TokenMintFormState, address: Address) => void,
    onMintEnd?: (tokenInfo: TokenInfo, contractType: TokenContractType) => void,
    onMintError?: (errorMessage: string) => void,
}

type TokenMintFormState = Omit<TokenInfo, 'address' | 'totalSupply' | 'chainId'> & {
    initialSupplyTokens: number;
    maxSupplyTokens: number;
    contractType: 'full-premint' | 'fixed-supply' | 'variable-supply';
}

const TokenMintForm: FC<TokenMintFormProps> = (props) => {

    const _testingRandomIconUrls = [
        'https://cdn-icons-png.flaticon.com/512/2592/2592201.png',
        'https://cdn-icons-png.flaticon.com/128/2152/2152539.png',
        'https://cdn-icons-png.flaticon.com/512/3985/3985588.png',
        'https://cdn-icons-png.flaticon.com/128/7318/7318950.png',
    ];

    const {
        Moralis,
        web3: web3Provider,
        chainId
    } = useMoralis();

    const [formState, setFormState] = useState<TokenMintFormState>({
        name: '',
        symbol: '',
        decimals: 18,
        initialSupplyTokens: 0,
        maxSupplyTokens: 0,
        iconUrl: _testingRandomIconUrls[(new Date()).getTime() % 4],
        contractType: 'fixed-supply',
    });
    const [isTokenCreationInProgress, setIsTokenCreationInProgress] = useState(false);

    const [formFieldErrors, setFormFieldErrors] = useState<Partial<{ [k in keyof TokenMintFormState]: string }>>({});

    const getContractTemplate = (contractType: TokenMintFormState['contractType']) => (contractType === 'full-premint' ? FullPremintERC20Token : VariableSupplyERC20Token);

    const {
        onMintStart = null,
        onMintWaiting = null,
        onMintEnd = null,
        onMintError = null,
        ...boxProps
    } = props;

    const handleCreate = async () => {
        try {
            // const ethers = Moralis.web3Library;
            const deployer = web3Provider ? web3Provider.getSigner() : null;

            // This shouldn't happen - since we should actually call this when we have web3lib enabled
            if (!ethers || !web3Provider || !deployer) {
                throw new Error("Invalid ethers or web3Provider instance.");
            }

            const { name, symbol, decimals, contractType: formContractType, maxSupplyTokens, initialSupplyTokens, iconUrl = null } = formState;

            // if(!newTokenProps.name || !newTokenProps.symbol || !newTokenProps.totalSupply || !newTokenProps.decimals) {
            if (!name || !symbol) {
                throw new Error("Invalid token data - name or symbol.");
            }

            if (!formContractType) {
                throw new Error("Please select a contract type.");
            }

            // const totalSupplyTokens = (maxSupplyTokens||0);
            // if(totalSupplyTokens < 0) {
            //     throw new Error(`Invalid value for totalSupply: ${totalSupplyTokens}`);

            // }


            let maxSupply: string; // TBD later, dependinbgn on the contract type
            let initialSupply = parseTokenAmount(parseFloat(removeComma(initialSupplyTokens)), { decimals: decimals });
            let contractType = (formContractType === 'fixed-supply') ? 'variable-supply' : formContractType;

            if (BigNumber.from(initialSupply).lt(0)) {
                throw new Error(`Initial supply cannot be less than 0.`);
            }

            const TokenFactory = ethers.ContractFactory.fromSolidity(getContractTemplate(contractType), deployer);
            let tokenContract;

            setIsTokenCreationInProgress(true);

            console.log("Token properties:", formState);
            console.log("Deploying the contracts with the account:", await deployer.getAddress());
            console.log("Account balance:", ethers.utils.formatUnits(await deployer.getBalance()), 'ETH');

            /// Notify we've started the mint process
            onMintStart?.(formState);

            switch (formContractType) {
                case 'fixed-supply':
                    maxSupply = parseTokenAmount(parseFloat(removeComma(maxSupplyTokens)), { decimals: decimals });
                    initialSupply = parseTokenAmount(parseFloat(removeComma(initialSupplyTokens)), { decimals: decimals });

                    if (BigNumber.from(maxSupply).lte(0)) {
                        throw new Error(`Max supply cannot be negative or zero.`);
                    }
                    if (BigNumber.from(maxSupply).lt(BigNumber.from(initialSupply))) {
                        throw new Error(`Max supply cannot be less than initial supply.`);
                    }

                    // Variable supply contract is actually used here 
                    tokenContract = await TokenFactory.deploy(name, symbol, initialSupply, maxSupply);
                    break;

                case 'variable-supply':
                    maxSupply = '0'; // Max supply is 0, since 0 means no limit
                    tokenContract = await TokenFactory.deploy(name, symbol, initialSupply, maxSupply);
                    break;

                case 'full-premint':
                    if (BigNumber.from(initialSupply).lte(0)) {
                        throw new Error(`Initial supply cannot be less or equal 0, because nothing can be minted later.`);
                    }
                    tokenContract = await TokenFactory.deploy(name, symbol, initialSupply);
                    break;
            }

            onMintWaiting?.(formState, tokenContract.address);

            await tokenContract.deployed();

            console.log("Deployed an ERC Token for testing.");
            console.log("Address:", tokenContract.address);
            const tokenMeta = await loadTokenMetadataFromContract(tokenContract);
            console.log(`Name: ${tokenMeta.name}, Symbol: ${tokenMeta.symbol}. Supply: ${ethers.utils.formatUnits(tokenMeta.totalSupply, tokenMeta.decimals)} ${tokenMeta.symbol}`);
            // console.log(tokenMeta)
            const outTokenInfo = {
                chainId: standardizeChainId((await tokenContract.provider.getNetwork()).chainId),
                address: tokenContract.address,
                name,
                symbol,
                decimals,
                iconUrl,
                totalSupply: tokenMeta.totalSupply,
            }
            onMintEnd?.(outTokenInfo, contractType);
        }
        catch (e: any) {
            console.error(e.message)
            onMintError?.(`Error while minting a token. ${e.message}`)
        }
        setIsTokenCreationInProgress(false);
    };

    const updateFormState = (k: string, v: any) => {
        let str = v
            .toString()
            .replaceAll(",", "")
            .replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")
        if (k === 'initialSupplyTokens' || k === 'maxSupplyTokens') {
            if (removeComma(v).toString()[0] === "0" && removeComma(v).toString().length > 0) {
                str = str.substring(1);
            }
            if (/^\d*$/.test(removeComma(v))) {
                const newFormState = { ...formState, [k]: str };
                setFormState(newFormState);
            } else {
                const newFormState = { ...formState, [k]: str.slice(0, v.length - 1) };
                setFormState(newFormState);
            }
        } else {
            setIsTokenCreationInProgress(false);
            const newFormState = { ...formState, [k]: v };
            setFormState(newFormState);
        }
    }
    useEffect(() => {
        const formErrors: typeof formFieldErrors = {};
        // const formErrors = Object.fromEntries(
        //     // Note: iconUrl is optional, omit it from error handling
        //     Object.entries(formState).map(([k, v]) => (!v && (['decimals'].indexOf(k) === -1) && (['symbol'].indexOf(k) === -1) && (['iconUrl'].indexOf(k) === -1)) ? [k, `Token ${k} is required to mint tokens.`] : [null, null]).filter(([k, v]) => k && v)
        // );

        const initialSupplyTokensN = parseFloat(removeComma(formState.initialSupplyTokens));
        const maxSupplyTokensN = parseFloat(removeComma(formState.maxSupplyTokens));

        // For full premint, we must have nonzero supply, otherwise the token is useless
        // For variable, *for now* we also disallow 0 since contract does that, but this might not be desired
        if (formState.contractType === 'full-premint' || formState.contractType === 'variable-supply') {
            if (initialSupplyTokensN <= 0 || isNaN(initialSupplyTokensN)) {
                formErrors.initialSupplyTokens = 'Token supply must be greater than zero.';
            }
        }
        // In other cases, we can allow initialSupplyTokens == 0 but not negative
        else if (initialSupplyTokensN < 0) {
            formErrors.initialSupplyTokens = 'Amount to mint must be a whole positive number.';
        }


        if (formState.contractType === 'fixed-supply') {
            if (initialSupplyTokensN > maxSupplyTokensN || isNaN(initialSupplyTokensN) || isNaN(maxSupplyTokensN)) {
                formErrors.initialSupplyTokens = 'Initial supply must be less than or equal to the max supply.';
                formErrors.maxSupplyTokens = 'Max supply must be greater than or equal to the initial supply.';
            }
            if (formState.maxSupplyTokens <= 0) {
                formErrors.maxSupplyTokens = 'Max supply must be nonzero.';
            }
        }

        if (formState.name.length < 3) {
            formErrors.name = "Token name must contain a minimum of three characters.";
        }

        if (formState.symbol.length < 2) {
            formErrors.symbol = "Token symbol must contain a minimum of two characters.";
        }

        if (maxSupplyTokensN < 0) {
            formErrors.maxSupplyTokens = 'Token supply must be a whole positive number.';
        }

        setFormFieldErrors(formErrors);

    }, [formState])

    const fieldProps = (name: keyof typeof formState): OutlinedTextFieldProps => ({
        key: name,
        name,
        margin: "normal",
        variant: "outlined",
        label: camelToTitleCase(name),
        value: formState[name] ?? "",
        onChange: (e: any) => updateFormState(name, e.target.value),
        error: !!(formFieldErrors?.[name] ?? false),
        helperText: (formFieldErrors[name] ?? ""),
    })

    return <Box {...boxProps}>
        <form noValidate onSubmit={handleCreate}>
            <Stack>

                <TextField {...fieldProps('name')} label={'Token name'} />
                <TextField {...fieldProps('symbol')} label={'Token symbol'} />

                <Tooltip title={"The number of decimals on the token contract. 18 is the default value and it should be maintained unless you have a strong reason to change it. This represents the smallest subdivision of a single token, so with a value of 18, the smallest amount of tokens one can have is 1e-18."}>
                    <TextField {...fieldProps('decimals')} />
                </Tooltip>
                <TextField {...fieldProps('iconUrl')} label={'Icon URL'} />


                <FormControl>
                    <FormLabel>Contract Type</FormLabel>
                    <RadioGroup value={formState.contractType} onChange={e => updateFormState('contractType', e.target.value)}>
                        {/* <FormControlLabel value="full-premint" control={<Radio />} label="Full Pre-Mint" /> */}
                        <Tooltip title="Mint a token for which you can mint additional tokens at will in the future. Initially, the only Initial supply will be minted">
                            <FormControlLabel value="variable-supply" control={<Radio />} label="Unlimited Supply" />
                        </Tooltip>
                        <Tooltip title="Mint a token for which there's a limited supply. You can mint the full supply immediately, or mint just a portion now and the remainder later.">
                            <FormControlLabel value="fixed-supply" control={<Radio />} label="Fixed Supply" />
                        </Tooltip>
                    </RadioGroup>
                </FormControl>

                {/* Todo: componentize - inject different components for different contract types, or something of the sort */}
                {/* {formState.contractType && <Typography>Contract template: {getContractTemplate(formState.contractType).contractName}</Typography>} */}
                {formState.contractType === 'full-premint' && <Box>
                    <TextField fullWidth {...fieldProps('initialSupplyTokens')} label={`Initial supply (${formState.symbol || 'Tokens'})`} />
                    {formState.initialSupplyTokens && <Typography>{formState.initialSupplyTokens} {formState.symbol ?? 'tokens'} will initially be minted. No further tokens can be minted.</Typography>}
                </Box>}
                {formState.contractType === 'fixed-supply' && <Box>
                    <TextField fullWidth {...fieldProps('maxSupplyTokens')} label={`Max supply (${formState.symbol || 'Tokens'})`} />
                    <Slider
                        aria-label="Custom marks"
                        value={Math.round(100 * Math.max(0, Math.min(parseFloat(removeComma(formState.initialSupplyTokens)) / parseFloat(removeComma(formState.maxSupplyTokens)), 1)))}
                        getAriaValueText={value => `${value} %`}
                        step={1}
                        valueLabelDisplay="auto"
                        marks={[0, 25, 50, 75, 100].map(value => ({ value, label: `${value} %` }))}
                        // TODO: should probably work with rounding as opposed to flooring. But upstream code requires that the number have no comma
                        onChange={(e, newPerc) => { updateFormState('initialSupplyTokens', Math.floor(parseFloat(removeComma(formState.maxSupplyTokens)) * (newPerc as number) * 0.01)) }}
                    />
                    <FormControlLabel
                        control={<Checkbox checked={parseFloat(removeComma(formState.initialSupplyTokens)) === parseFloat(removeComma(formState.maxSupplyTokens))} />}
                        label="Mint Total Supply"
                        onClick={(e) => (parseFloat(removeComma(formState.initialSupplyTokens)) !== parseFloat(removeComma(formState.maxSupplyTokens))) && updateFormState('initialSupplyTokens', parseFloat(removeComma(formState.maxSupplyTokens)))} />

                    <TextField fullWidth {...fieldProps('initialSupplyTokens')} label={`Initial supply (${formState.symbol || 'Tokens'})`} />
                    {(Object.keys(formFieldErrors).length === 0) && <Typography>
                        {formState.initialSupplyTokens} {formState.symbol ?? 'tokens'} will initially be minted. {' '}
                        {parseFloat(removeComma(formState.maxSupplyTokens)) > parseFloat(removeComma(formState.initialSupplyTokens)) ? <>
                            Later on, you can mint further {parseFloat(removeComma(formState.maxSupplyTokens)) - parseFloat(removeComma(formState.initialSupplyTokens))} {formState.symbol ?? 'tokens'} at will until the max supply of {' '}
                            {formState.maxSupplyTokens ?? '(Please enter)'} {formState.symbol ?? 'tokens'} is reached.
                        </> : <>
                            You cannot mint any further tokens since the initial supply is already equal to the maximum supply.
                        </>}
                    </Typography>}
                </Box>}
                {formState.contractType === 'variable-supply' && <Box>
                    <TextField fullWidth {...fieldProps('initialSupplyTokens')} label={`Initial supply (${formState.symbol || 'Tokens'})`} />
                    {(Object.keys(formFieldErrors).length === 0) && <Typography>
                        {formState.initialSupplyTokens} {formState.symbol ?? 'tokens'} will initially be minted.
                        Later on, you can mint tokens with no limit.
                    </Typography>}
                </Box>}


                <Button variant={'contained'} onClick={handleCreate} disabled={isTokenCreationInProgress || (Object.keys(formFieldErrors).length > 0)}>Create token</Button>
            </Stack>
            {isTokenCreationInProgress && <CircularProgress />}
        </form>
    </Box>

}

export default TokenMintForm;