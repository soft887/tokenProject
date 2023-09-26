import { useEffect } from "react";
import { useMoralis } from "react-moralis";
import { useSelector } from "react-redux";
import { Outlet } from "react-router";
import { useAppDispatch } from "../../store/store";
import { fetchContractInfo, fetchMyTokens, fetchMyVestingContracts, selectMyVestingContractBasicInfo, selectMyTokensStatus, selectVestingContractsStatus } from "../../store/vestingSlice";
import MoralisAuthenticationOverlay from "../generic/MoralisAuthenticationOverlay";

type EmployeeOverlayProps = {
    
};

const EmployeeOverlay = (props: EmployeeOverlayProps) => {
    const { 
        Moralis, 
        web3: web3Provider, 
    } = useMoralis();

    const dispatch = useAppDispatch();
    const tokenLoadState = useSelector(selectMyTokensStatus);
    const vestingContractBasicEntries = useSelector(selectMyVestingContractBasicInfo);
    const vestingContractAddresesLoadState = useSelector(selectVestingContractsStatus);

    useEffect(() => {
        if(Moralis) {
            (tokenLoadState !== 'loaded') && dispatch(fetchMyTokens({Moralis}));
            
            if(vestingContractAddresesLoadState !== 'loaded') {
                dispatch(fetchMyVestingContracts({Moralis}));
            }
            else if(web3Provider) {
                vestingContractBasicEntries.map(async ({address: contractAddress, chainId}) => {
                    dispatch(fetchContractInfo({address: contractAddress, provider: web3Provider, chainId})).unwrap().catch(e => {
                        console.log(`fetchContractInfo: Error when loading contract from ${contractAddress}. Does the contract exist?`, {message: e.message})
                    });
                });
            }
        }
    // Adding vesting vestingContractAddresses to dep list causes retriggering of this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Moralis, web3Provider, dispatch, tokenLoadState, vestingContractAddresesLoadState]);

    return <MoralisAuthenticationOverlay needsWeb3Provider element={<Outlet />} />
};

export default EmployeeOverlay;
