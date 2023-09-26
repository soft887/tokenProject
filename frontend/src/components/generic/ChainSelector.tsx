import { useState } from 'react';
import { Alert, Backdrop, Box, Card, CardContent, CircularProgress, MenuItem, Snackbar, TextField, Tooltip } from '@mui/material';
import { SupportedChainList } from '../../utils/chainDefinitions';
import { useMoralis } from 'react-moralis';
import { Chain } from '../../utils/types';
import { lookupChainMeta } from '../../utils/contract/chain';

export type ChainSelectorProps = {
};

export default function ChainSelector(props: ChainSelectorProps) {
    const {
        chainId, 
        web3: web3Provider,
        isWeb3Enabled,
    } = useMoralis();

    const [isChainChangeInProgress, setIsChainChangeInProgress] = useState(false);
    const [chainChangeError, setChainChangeError] = useState<string|null>(null);

    const handleChainChange = async (newChainId: Chain['chainId']) => {
        setChainChangeError(null);
        
        if(web3Provider && newChainId !== chainId) {            
            let chainData: Chain;
            try {
                chainData = lookupChainMeta(newChainId);
            }
            catch(e) {
                // Don't kill the error to block the whole thing
                setChainChangeError("Unsupported chain selected, please select a supported chain in your MetaMask.");
                return;
            }

            setIsChainChangeInProgress(true);
            
            try {
                // https://eips.ethereum.org/EIPS/eip-3326
                // @ts-expect-error
                await window.ethereum.request({method: 'wallet_switchEthereumChain', params: [{chainId: newChainId}]})
                // Moralis alternative
                // await Moralis.switchNetwork(newChainId)
            }
            catch(e: any) {
                const errCode = e?.code;
                let message = null;

                // Chain not present, try to add it
                if(errCode === 4902) {
                    if(!chainData.nativeCurrency) {
                        message = `Unable to add chain ${chainData.chainName} automatically because of missing nativeCurrency, please add it manually.`;
                    }
                    else {
                        // chainSymbol is our addition to the metadata, get rid of it
                        const {chainSymbol, ...chainDataArg} = chainData;
                        // Use direct Metamask for simplicity
                        // @ts-expect-error
                        await window.ethereum.request({method: 'wallet_addEthereumChain', params: [chainDataArg]});
                        // moralis alternative
                        // await Moralis.addNetwork(...)
                        console.log("Successfully added the chain.");
                    }
                }
                else {
                    message = e?.message
                }
                
                setChainChangeError(message ? (`Unable to change chain. (${errCode}) ${message}`) : null);
            }
            setIsChainChangeInProgress(false);
        }
    };

    const currentChainDataMissing = SupportedChainList.filter(chain => chain.chainId === chainId).length === 0;

    return <Box>
        <Backdrop open={isChainChangeInProgress}>
            <Card>
                <CardContent>
                    <CircularProgress />
                    {chainChangeError ?? "Chain change in progress, please accept the change on in your wallet app..."}
                </CardContent>
            </Card>
        </Backdrop>
        {currentChainDataMissing && <Alert severity="warning">The current chain is missing</Alert>}
        <Snackbar open={chainChangeError !== null} onClose={() => setChainChangeError(null)} autoHideDuration={5000} anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}>
            <Alert severity={'error'}>{chainChangeError}</Alert>
        </Snackbar>
        {isWeb3Enabled && <>
            <TextField select value={chainId} disabled={!chainId || isChainChangeInProgress} onChange={e => handleChainChange(e.target.value)}>
                {SupportedChainList.map(chain => <MenuItem key={chain.chainId} value={chain.chainId}>{chain.chainName}</MenuItem>)}
            </TextField>
        </>}
        {!isWeb3Enabled && <Tooltip title="Waiting for Web3 to initialize..."><CircularProgress /></Tooltip>}
        
    </Box>
}


