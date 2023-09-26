import { createSlice, createAsyncThunk, createEntityAdapter, EntityState } from '@reduxjs/toolkit'
import { Address, TokenInfo, VestingContractInfo, KnownVestingUserInfo, ClaimTemplate, LoadedState, ClaimInfo, Chain, TokenContractType, MyTokenEntry, MyVestingContractEntry } from '../utils/types';
import VTVLVesting from "@vtvl/contracts/VTVLVesting.sol/VTVLVesting.json";
import { MoralisContextValue, useMoralis } from "react-moralis";
import { RootState } from './store';
import ERC20Token from "@vtvl/openzeppelin-artifacts/token/ERC20/ERC20.sol/ERC20.json";
import { BigNumber, ethers } from 'ethers';
import MoralisType from "moralis";
import { loadTokenMetadataFromContract } from '../utils/contract/token';
import produce from 'immer';
import { loadVestingContractMetadataFromContract } from '../utils/contract/vesting';
import { standardizeChainId } from '../utils/contract/chain';


const modelNames = {
    TokenInfo: "TokenInfo",
    VestingContractInfo: "VestingContractInfo",
    User: "VestingUser",
    ClaimTemplate: "ClaimTemplate"
}

// type MoralisObjArg = Pick<MoralisContextValue, 'Moralis'>;
type MoralisObjArg = {Moralis: MoralisType} // Pick<MoralisContextValue, 'Moralis'>;

type AddressProvider = {address: Address, provider: ethers.Contract['provider']};
// When we have a read only operation, we can use Moralis API for a read-only op
type AddressChainProvider = AddressProvider & (Partial<MoralisObjArg> & {chainId: Chain['chainId'], allowCrossChain?: boolean});

export type VestingContractSliceState = {
    blockchainTokenInfos: {
        loadedTokenIds: string[],
        loadingTokenIds: string[],
        entities: EntityState<TokenInfo>
    },
    blockchainVestingContractInfos: {
        entities: EntityState<VestingContractInfo>
    },
    
    // "My" entries are entries retrieved from the database - they might be fully or partially present
    // They are however not the source of truth, as those are the above entries
    myUsers: {
        status: LoadedState,
        entities: EntityState<KnownVestingUserInfo>
    },
    myClaimTemplates: {
        status: LoadedState,
        entities: EntityState<ClaimTemplate>
    },
    myTokens: {
        status: LoadedState,
        entities: EntityState<MyTokenEntry>,
    },
    myVestingContracts: {
        status: LoadedState,
        entities: EntityState<MyVestingContractEntry>,
    },
}


const getChainAwareId = ({chainId, address}: {chainId: Chain['chainId'], address: Address, [x: string | number | symbol]: unknown}) => `${chainId}__${address}`;

const blockchainTokensInfosAdapter = createEntityAdapter<TokenInfo>({
    // selectId: (tokenInfo) => tokenInfo.address
    selectId: getChainAwareId
});
const blockchainVestingContractsInfoAdapter = createEntityAdapter<VestingContractInfo>({
    selectId: getChainAwareId
});
const myUsersAdapter = createEntityAdapter<KnownVestingUserInfo>({
    // No chain id necessary for user, since an user can control the same address across all chains
    selectId: (user) => user.address,
});
const myClaimTemplatesAdapter = createEntityAdapter<ClaimTemplate>({
    selectId: (claimTemplate) => claimTemplate.objectId
});
const myTokensAdapter = createEntityAdapter<MyTokenEntry>({
    selectId: getChainAwareId
});
const myVestingContractsAdapter = createEntityAdapter<MyVestingContractEntry>({
    selectId: getChainAwareId,
});

const initialState: VestingContractSliceState  = {
    blockchainTokenInfos: {
        loadedTokenIds: [],
        loadingTokenIds: [],
        entities: blockchainTokensInfosAdapter.getInitialState()
    },
    blockchainVestingContractInfos: {
        entities: blockchainVestingContractsInfoAdapter.getInitialState()
    },

    myUsers: {
        status: 'not-loaded',
        entities: myUsersAdapter.getInitialState()
    },
    myClaimTemplates: {
        status: 'not-loaded',
        entities: myClaimTemplatesAdapter.getInitialState()
    },
    myTokens: {
        status: 'not-loaded',
        entities: myTokensAdapter.getInitialState(),
    },
    myVestingContracts: {
        status: 'not-loaded',
        entities: myVestingContractsAdapter.getInitialState(),
    },
};

export const fetchMyTokens = createAsyncThunk<MyTokenEntry[], MoralisObjArg>('myTokensCache', async ({ Moralis }, thunkAPI) => {
    const MoralisTokenModel = Moralis.Object.extend(modelNames.TokenInfo);
    const tokenQuery = new Moralis.Query(MoralisTokenModel);

    const tokenResults = await tokenQuery.find();
    let tokenCache: MyTokenEntry[] = [];
    let foundAddresses: Address[] = [];

    tokenResults.forEach((tokenObj: any) => {
        // console.log(tokenObj, tokenObj.attributes)
        const addr =  tokenObj?.attributes?.address ?? null;
        if(addr && foundAddresses.indexOf(addr) === -1){
            foundAddresses.push(addr);

            try {
                const {address, name, symbol, chainId, totalSupply, decimals, iconUrl, contractType, ownerAddresses = []} = tokenObj.attributes as MyTokenEntry;
                if(addr !== address) {
                    console.log("Invalid token address, skipping.", addr, address);
                    return;
                }
                tokenCache.push({address, name, symbol, chainId, totalSupply: totalSupply, decimals, iconUrl, contractType, ownerAddresses});
            }
            catch(e) {
                console.log("Error while loading token from cache. Skipping. Token addr:", addr, "Error:", e);
            }
        }
    });
    
    return tokenCache;
});
export const doAddMyToken = createAsyncThunk<void, MoralisObjArg & MyTokenEntry>('myTokensCacheAdd', async ({ Moralis, ...tokenMeta }, thunkAPI) => {
    const {address, chainId} = tokenMeta;

    if(myTokensSelectors.selectById(thunkAPI.getState() as RootState, getChainAwareId({address, chainId}))) {
        throw new Error("Selected token address already present. Please delete it first.");
    }

    const {totalSupply, ...restTokenMeta} = tokenMeta;

    const MoralisTokenModel = Moralis.Object.extend(modelNames.TokenInfo);
    // We need to stringify totalsupply to be able to serialize
    const tokenModel = new MoralisTokenModel({...restTokenMeta, totalSupply: totalSupply?.toString()});
    tokenModel.setACL(new Moralis.ACL(Moralis.User.current()));
    await tokenModel.save();

    thunkAPI.dispatch(fetchMyTokens({Moralis}));
});
export const doDeleteMyToken = createAsyncThunk<void, MoralisObjArg & Pick<TokenInfo, 'chainId' | 'address'>>('myTokensCacheDelete', async ({ Moralis, address, chainId }, thunkAPI) => {

    if(!myTokensSelectors.selectById(thunkAPI.getState() as RootState, getChainAwareId({address, chainId}))) {
        throw new Error("Selected token address not present. Unable to delete.");
    }

    const TokenModel = Moralis.Object.extend(modelNames.TokenInfo);
    const query = new Moralis.Query(TokenModel);
    query.equalTo("address", address).equalTo("chainId", chainId);
    const tokenModelsMatch = await query.find();
    // console.log(tokenModelsMatch)
    await Promise.all(tokenModelsMatch?.map(x=>x.destroy()));
    
    thunkAPI.dispatch(fetchMyTokens({Moralis}));
});

export const fetchMyVestingContracts = createAsyncThunk<MyVestingContractEntry[], MoralisObjArg>('myVestingContractsCache', async ({ Moralis }, thunkAPI) => {
    const VestingContractModel = Moralis.Object.extend(modelNames.VestingContractInfo);
    const contractQuery = new Moralis.Query(VestingContractModel);

    const contractResults = await contractQuery.find();
    
    let vestingContractCache: MyVestingContractEntry[] = [];
    let foundIds: string[] = [];
    
    contractResults.forEach((vestingContractObj: any) => {
        // Get the data about each of the contracts
        const {address, chainId, ownerAddresses = []} = vestingContractObj?.attributes;

        // Calculate its lookup id
        const currentEntryId = getChainAwareId(vestingContractObj?.attributes)

        // If the id is valid and hasn't been touched yet
        if(address && chainId && foundIds.indexOf(currentEntryId) === -1){
            // Add it to our cache that we'll return, and also push it to the list so that we don't duplicate it
            const targetObj: MyVestingContractEntry = {address, chainId, ownerAddresses};
            vestingContractCache.push(targetObj);
            foundIds.push(address);
        }
    });
    return vestingContractCache;
});
export const doAddMyVestingContract = createAsyncThunk<void, MoralisObjArg & MyVestingContractEntry>('myVestingContractsAdd', async ({ Moralis, ...contractMeta }, thunkAPI) => {
    const {address, chainId} = contractMeta; 

    const existingContracts = myVestingContractsSelectors.selectById(thunkAPI.getState() as RootState, getChainAwareId({address, chainId}));
    if(!!existingContracts) {
        throw new Error("Selected contract address already present. Please delete it first.");
    }
    const VestingContractModel = Moralis.Object.extend(modelNames.VestingContractInfo);
    const vModel = new VestingContractModel(contractMeta);
    vModel.setACL(new Moralis.ACL(Moralis.User.current()));
    await vModel.save();

    thunkAPI.dispatch(fetchMyVestingContracts({Moralis}));
});
export const doDeleteMyVestingContract = createAsyncThunk<void, MoralisObjArg & Pick<MyVestingContractEntry, 'address' | 'chainId'>>('myVestingContractsDelete', async ({ Moralis, address, chainId }, thunkAPI) => {
    const existingContractsInCache = myVestingContractsSelectors.selectById(thunkAPI.getState() as RootState, getChainAwareId({address, chainId}));
    if(!existingContractsInCache) {
        throw new Error("Selected contract address not present. Unable to remove.");
    }

    const VestingContractModel = Moralis.Object.extend(modelNames.VestingContractInfo);
    const contractQuery = new Moralis.Query(VestingContractModel);
    contractQuery.equalTo("address", address).equalTo("chainId", chainId);
    const vestingModelsMatch = await contractQuery.find();
    
    await Promise.all(vestingModelsMatch?.map(x=>x.destroy()));
    
    thunkAPI.dispatch(fetchMyVestingContracts({Moralis}));
});

export const fetchMyUsers = createAsyncThunk<KnownVestingUserInfo[], MoralisObjArg>('myUsers', async ({ Moralis }, thunkAPI) => {
    const UserModel = Moralis.Object.extend(modelNames.User);
    const query = new Moralis.Query(UserModel);
    const results = await query.find();

    return results.map((resultEntry: any) => {
        // Drop ACL, createdAt, updatedAt
        // const {name, address, ACL, createdAt, updatedAt, ...rest} = resultEntry.attributes;
        const {objectId, name, address, companyName, userType, roundType, isAnonymous} = resultEntry.attributes;
        const targetObj: KnownVestingUserInfo = {objectId, name, address, companyName, userType, roundType, isAnonymous};
        return targetObj;
    });
});
export const doAddMyUser = createAsyncThunk<void, MoralisObjArg & Omit<KnownVestingUserInfo, 'objectId'> & {allowUpsert?: boolean}>('myUsers/add', async ({ Moralis, allowUpsert = false, address, ...userMeta }, thunkAPI) => {
    const existing = myUsersSelectors.selectById(thunkAPI.getState() as RootState, address);
    if(!!existing && !allowUpsert) {
        throw new Error("Selected user address already present. Please delete them first.");
    }
    const UserModel = Moralis.Object.extend(modelNames.User);
    const user = new UserModel({address, ...userMeta});
    user.setACL(new Moralis.ACL(Moralis.User.current()));
    await user.save();

    thunkAPI.dispatch(fetchMyUsers({Moralis}));
});
export const doDeleteMyUser = createAsyncThunk<void, MoralisObjArg & {address: Address}>('myUsers/delete', async ({ Moralis, address }, thunkAPI) => {
    const existing = myUsersSelectors.selectById(thunkAPI.getState() as RootState, address);
    if(!existing) {
        throw new Error("Selected user not present. Unable to delete.");
    }
    const query = new Moralis.Query(modelNames.User);
    query.equalTo('address', address);
    
    // TODO: check this logic
    // TODO: revise to delete everyone
    await (await query.first())?.destroy();

    thunkAPI.dispatch(fetchMyUsers({Moralis}));
});

export const fetchMyClaimTemplates = createAsyncThunk<ClaimTemplate[], MoralisObjArg>('myClaimTemplates', async ({ Moralis }, thunkAPI) => {
    const ClaimTemplateModel = Moralis.Object.extend(modelNames.ClaimTemplate);
    const query = new Moralis.Query(ClaimTemplateModel);
    const results = await query.find();

    return results.map((resultEntry: any) => {
        
        const  {label, isTimestampRelative, scheduleStartTimestamp, totalAmountTokens, cliffDurationAfterScheduleStart, cliffPercent, linearReleaseFrequency, scheduleEndTimestamp, tokenAddress, vestingContractAddress} = resultEntry.attributes;
        const objectId = resultEntry.id;
        return {objectId, label, isTimestampRelative, scheduleStartTimestamp, totalAmountTokens, cliffDurationAfterScheduleStart, cliffPercent, linearReleaseFrequency, scheduleEndTimestamp, tokenAddress, vestingContractAddress};
    });
});
export const doAddClaimTemplate = createAsyncThunk<void, MoralisObjArg & {claimTemplate: Omit<ClaimTemplate, 'objectId'>}>('myClaimTemplates/add', async ({ Moralis, claimTemplate }, thunkAPI) => {
    // const existing = myUsersSelectors.selectById(thunkAPI.getState() as RootState, address);
    const ClaimTemplateModel = Moralis.Object.extend(modelNames.ClaimTemplate);
    const claimTplModel = new ClaimTemplateModel(claimTemplate);
    claimTplModel.setACL(new Moralis.ACL(Moralis.User.current()));
    await claimTplModel.save();

    thunkAPI.dispatch(fetchMyClaimTemplates({Moralis}));
});
export const doDeleteClaimTemplate = createAsyncThunk<void, MoralisObjArg & {objectId: string}>('myClaimTemplates/remove', async ({ Moralis, objectId }, thunkAPI) => {
    // const existing = myUsersSelectors.selectById(thunkAPI.getState() as RootState, address);
    const ClaimTemplateModel = Moralis.Object.extend(modelNames.ClaimTemplate);
    const query = new Moralis.Query(ClaimTemplateModel);
    query.equalTo('objectId', objectId);
    await (await query.first())?.destroy();

    thunkAPI.dispatch(fetchMyClaimTemplates({Moralis}));
});


export const fetchBlockchainTokenInfo = createAsyncThunk<TokenInfo, AddressChainProvider & {updateDbEntry?: boolean}>('blockchainTokens', async ({address, provider, chainId, allowCrossChain = false, Moralis = null, updateDbEntry = null}, thunkAPI) => {
    const currentChainId = standardizeChainId((await provider.getNetwork())?.chainId);
    if(currentChainId !== chainId) {
        // This logic should be implemented by something similar to this
        // Moralis?.Web3API.native.runContractFunction(...{
        //     chain: chainId,
        //     address,
        //     abi: ERC20Token.abi,
        //     function_name: 'blabla',
        //     params: {params_obj}
        // })
        // TODO: get the data cross chain
        throw Error("CrossChain transactions not allowed")
    }

    const tokenContract = new ethers.Contract(address, ERC20Token.abi, provider);
    const tokenMeta = await loadTokenMetadataFromContract(tokenContract);
    
    // In case we were given the updateDbEntry param, use the new information to update the token state
    if(updateDbEntry) {
        if(!Moralis) {
            throw Error("updateDbEntry given but Moralis not given. Moralis object must be sent.")
        }
        const {address, chainId} = tokenMeta;

        const MoralisTokenModel = Moralis.Object.extend(modelNames.TokenInfo);

        const query = new Moralis.Query(MoralisTokenModel);
        query.equalTo("address", address).equalTo("chainId", chainId);
        const tokenModelsMatch = await query.find();
        
        if(tokenModelsMatch.length !== 1) {
            throw Error(`${tokenModelsMatch.length} found for ${chainId}::${address}. There must be exactly 1 entry`);
        }
        // TODO: make this logic more robust
        const modelToUpdate =  tokenModelsMatch?.[0];

        // Await here so that we properly catch exceptions if appropriate
        await modelToUpdate.save(tokenMeta);
    }
    
    return tokenMeta;
});

export const fetchContractInfo = createAsyncThunk<VestingContractInfo, AddressChainProvider>('blockchainVestingContract/contractInfo', async ({address, provider, chainId, allowCrossChain = false, Moralis = null}, thunkAPI) => {
    const currentChainId = standardizeChainId((await provider.getNetwork())?.chainId);
    if(currentChainId !== chainId) {
        // This logic should be implemented by something similar to this
        // Moralis?.Web3API.native.runContractFunction(...{
        //     chain: chainId,
        //     address,
        //     abi: ERC20Token.abi,
        //     function_name: 'blabla',
        //     params: {params_obj}
        // })
        // TODO: get the data cross chain
        throw Error("CrossChain transactions not allowed");
    }

    const vestingContract = new ethers.Contract(address, VTVLVesting.abi, provider);
    
    // We potentially don't need to redo this call, maybe we can pull from cache
    const tokenAddress = await vestingContract.tokenAddress();
    const tokenContract = new ethers.Contract(tokenAddress, ERC20Token.abi, provider);

    const tokenInfo = blockchainTokensSelectors.selectById(thunkAPI.getState() as RootState, getChainAwareId({address: tokenAddress, chainId}));
    
    if(!tokenInfo) {
        await thunkAPI.dispatch(fetchBlockchainTokenInfo({address: tokenAddress, chainId, provider})).unwrap();
    }

    const vestingContractMeta = await loadVestingContractMetadataFromContract(vestingContract, tokenContract);
    return vestingContractMeta;
});

type FetchClaimsReturnType = {
    chainId: Chain['chainId']
    claims: {[k: Address]: ClaimInfo}
    numClaims: number
    beneficiariesWithEmptyClaims: Address[]
    expectedNumClaims: number
    areAllExpectedClaimsLoaded: boolean
    areAllClaimsLoaded: boolean
}

export const fetchClaims = createAsyncThunk<FetchClaimsReturnType, AddressChainProvider & {beneficiaries?: Address[]}>('blockchainVestingContract/capTable', async ({ address, provider, chainId, beneficiaries = null}, thunkAPI) => {
    const currentChainId = standardizeChainId((await provider.getNetwork())?.chainId);
    if(currentChainId !== chainId) {
        // This logic should be implemented by something similar to this
        // Moralis?.Web3API.native.runContractFunction(...{
        //     chain: chainId,
        //     address,
        //     abi: ERC20Token.abi,
        //     function_name: 'blabla',
        //     params: {params_obj}
        // })
        // TODO: get the data cross chain
        throw Error("CrossChain transactions not allowed")
    }

    const vestingContract = new ethers.Contract(address, VTVLVesting.abi, provider);

    // Receive the addresses of beneficiaries to load from the argument. If none sent, retrieve them from the contract.
    const beneficiariesToLoad: Address[] = beneficiaries ?? (await vestingContract.allVestingRecipients());
    
    // Now, for each beneficiary, we explicitly call getClaim
    const beneficiaryClaimsRaw = await Promise.all(beneficiariesToLoad.map(addr => vestingContract.getClaim(addr)));
    
    // call toString on on the appropriate values and cast them into ClaimInfo
    const beneficiaryClaimsUnfiltered: ClaimInfo[] = beneficiaryClaimsRaw.map((claimRaw) => {
        const {startTimestamp, endTimestamp, cliffReleaseTimestamp, releaseIntervalSecs, linearVestAmount, cliffAmount, amountWithdrawn, isActive} = claimRaw;
        return {startTimestamp, endTimestamp, cliffReleaseTimestamp, releaseIntervalSecs, linearVestAmount: linearVestAmount.toString(), cliffAmount: cliffAmount.toString(), amountWithdrawn: amountWithdrawn.toString(), isActive}
    });
    
    // filter them out into those that are or aren't valid (judging by the start timestamp)
    const beneficiaryClaims = Object.fromEntries(beneficiariesToLoad.map((beneficiary, i) => {
        const claim = beneficiaryClaimsUnfiltered[i];
        if(claim && claim.startTimestamp && claim.endTimestamp) {
        }
        return [beneficiary, (claim && claim.startTimestamp && claim.endTimestamp) ? claim : null];
    }).filter(([b, c]) => !!c));
    const beneficiariesWithEmptyClaims = beneficiaryClaimsUnfiltered.map(({startTimestamp, endTimestamp}, i) => (!startTimestamp || !endTimestamp) ? i : null).filter(x=>x !== null).map(i => beneficiariesToLoad?.[i as number]);

    // This is the case if nothing has been "killed off" in filtering
    const areAllExpectedClaimsLoaded = (Object.keys(beneficiaryClaims).length === beneficiariesToLoad.length);

    const claimsObj = {
        chainId,
        claims: beneficiaryClaims,  // All valid claims (including inactives)
        numClaims: Object.keys(beneficiaryClaims).length, // Number of valid claims
        beneficiariesWithEmptyClaims, // the list of beneficiaries (from the initial list) that don't have any claims
        expectedNumClaims: beneficiariesToLoad.length, // how many did we expect to load - number of entries sent in or the number of all claimants
        areAllExpectedClaimsLoaded, // Were we able to retrieve a valid claim for all of the sent in beneficiaries
        areAllClaimsLoaded: (beneficiaries === null) && areAllExpectedClaimsLoaded, //  does this list contain ALL of the claims that are on the contract
    }
    return claimsObj;
});


const vestingContractsSlice = createSlice({
    name: 'vestingContracts',
    initialState,
    reducers: {

    },
    extraReducers: (builder) => {
        builder.addCase(fetchMyTokens.pending, (state, action) => {
            state.myTokens.status = 'loading';
        });
        builder.addCase(fetchMyTokens.fulfilled, (state, action) => {
            try {
                const { payload: cachedTokens } = action; 
                // const {tokens} = payload;
                myTokensAdapter.setAll(state.myTokens.entities, cachedTokens);
                state.myTokens.status = 'loaded';
            }
            catch(e) {
                state.myTokens.status = 'error';
                console.error("Error while loading token collection from database:", e)
            }
        });


        builder.addCase(fetchMyVestingContracts.pending, (state, action) => {
            state.myVestingContracts.status = 'loading';
        });
        builder.addCase(fetchMyVestingContracts.fulfilled, (state, action) => {
            try {
                const { payload: cachedVC } = action; 
                myVestingContractsAdapter.setAll(state.myVestingContracts.entities, cachedVC);
                state.myVestingContracts.status = 'loaded';
            }
            catch(e) {
                state.myVestingContracts.status = 'error';
                console.error("Error while loading vesting contract metadata from database:", e)
            }
        });

        builder.addCase(fetchMyUsers.pending, (state, action) => {
            state.myUsers.status = 'loading';
        });
        builder.addCase(fetchMyUsers.fulfilled, (state, action) => {
            try {
                const { payload: users } = action; 
                myUsersAdapter.setAll(state.myUsers.entities, users);
                state.myUsers.status = 'loaded';
            }
            catch(e) {
                state.myUsers.status = 'error';
                console.error("Error while loading user metadata from database:", e)
            }
        });

        builder.addCase(fetchMyClaimTemplates.pending, (state, action) => {
            state.myClaimTemplates.status = 'loading';
        });
        builder.addCase(fetchMyClaimTemplates.fulfilled, (state, action) => {
            try {
                const { payload: schHeaders } = action; 
                myClaimTemplatesAdapter.setAll(state.myClaimTemplates.entities, schHeaders);
                state.myClaimTemplates.status = 'loaded';
            }
            catch(e) {
                state.myClaimTemplates.status = 'error';
                console.error("Error while loading claim template metadata from database:", e)
            }
        });


        builder.addCase(fetchBlockchainTokenInfo.pending, (state, action) => {
            // state.blockchainTokenInfos.status = 'loading';
            const { meta: {arg: {address, chainId}} } = action; 

            const {blockchainTokenInfos: t} = state;

            const tokenId = getChainAwareId({address, chainId});

            // add to loading
            if(tokenId && t.loadingTokenIds.indexOf(tokenId) === -1) {
                t.loadingTokenIds.push(tokenId); // add to loading
            }
            t.loadedTokenIds = t.loadedTokenIds.filter(a => a !== tokenId); // remove from loaded

        });
        builder.addCase(fetchBlockchainTokenInfo.fulfilled, (state, action) => {
            const {blockchainTokenInfos: t} = state;

            try {
                const { payload: tokenMeta } = action;  
                const {updateDbEntry} = action.meta.arg;

                blockchainTokensInfosAdapter.setOne(t.entities, tokenMeta);

                const tokenId = getChainAwareId(tokenMeta);

                t.loadingTokenIds = t.loadingTokenIds.filter(a => a !== tokenId); // remove from loading
                t.loadedTokenIds.push(tokenId); // add to loaded

                // If we've been asked to update the db entry, then we need to make sure to reflect this change on the tokens adapter as well
                if(updateDbEntry) {
                    myTokensAdapter.updateOne(state.myTokens.entities, {
                        id: tokenId,
                        changes: tokenMeta
                    });
                }
            }
            catch(e) {
                const { meta: {arg: {address, chainId}} } = action; 

                const tokenId = getChainAwareId({address, chainId});
                
                t.loadingTokenIds = t.loadingTokenIds.filter(a => a !== tokenId); // remove from loading
                t.loadedTokenIds  = t. loadedTokenIds.filter(a => a !== tokenId); // remove from loaded
            }
        });
        builder.addCase(fetchContractInfo.pending, (state, action) => {
            // state.blockchainVestingContractInfos.status = 'loading';
            const { meta: {arg: {address, chainId}} } = action; 
            const tokenId = getChainAwareId({address, chainId});
            blockchainVestingContractsInfoAdapter.removeOne(state.blockchainVestingContractInfos.entities, tokenId);
        });
        builder.addCase(fetchContractInfo.fulfilled, (state, action) => {
            try {
                const { payload: vestingContractInfo } = action; 
                blockchainVestingContractsInfoAdapter.setOne(state.blockchainVestingContractInfos.entities, vestingContractInfo);
                // state.blockchainVestingContractInfos.status = 'loaded';
            }
            catch(e) {
                // state.blockchainVestingContractInfos.status = 'error';
                const { meta: {arg: {address, chainId}} } = action; 
                const tokenId = getChainAwareId({address, chainId});
                blockchainVestingContractsInfoAdapter.removeOne(state.blockchainVestingContractInfos.entities, tokenId);
                console.error("Error while loading token metadata from blockchain:", e)
            }
        });

        
        builder.addCase(fetchClaims.fulfilled, (state, action) => {
            try {
                const { payload: claimsResultObj, meta: {arg: {address, beneficiaries = null}} } = action; 

                const {claims, areAllClaimsLoaded, beneficiariesWithEmptyClaims, chainId} = claimsResultObj;

                // TODO: remove previous claims based on beneficiariesEmptyClaims
                const updateObj = {
                    id: getChainAwareId({address, chainId}), 
                    changes: {
                        claims,
                        claimsLoadStatus: (areAllClaimsLoaded ? 'loaded-full' : 'loaded-partial') as VestingContractInfo['claimsLoadStatus']
                    }
                };

                blockchainVestingContractsInfoAdapter.updateOne(state.blockchainVestingContractInfos.entities, updateObj);
            }
            catch(e) {
                // state.vestingContracts.status = 'error';
                console.error("Error while loading cap table from blockchain:", e)
            }
        });
    }
});

export const selectVestingSliceData = (state: RootState) => state.vesting;

const selectMyTokens = (state: RootState) => selectVestingSliceData(state).myTokens.entities;
export const myTokensSelectors = myTokensAdapter.getSelectors<RootState>(selectMyTokens);
export const selectMyTokensStatus = (state: RootState) => selectVestingSliceData(state).myTokens.status;

export const selectMyVestingContracts = (state: RootState) => selectVestingSliceData(state).myVestingContracts.entities;
export const selectVestingContractsStatus = (state: RootState) => selectVestingSliceData(state).myVestingContracts.status;
export const myVestingContractsSelectors = myVestingContractsAdapter.getSelectors<RootState>(state => state.vesting.myVestingContracts.entities);
export const selectMyVestingContractBasicInfo = (state: RootState) => myVestingContractsSelectors.selectAll(state) // No need to limit: // .map(x => ({address: x.address, chainId: x.chainId}))

export const myClaimTemplatesSelectors = myClaimTemplatesAdapter.getSelectors<RootState>(state => state.vesting.myClaimTemplates.entities);
export const myUsersSelectors = myUsersAdapter.getSelectors<RootState>(state => state.vesting.myUsers.entities);

export const selectMyUsersStatus = (state: RootState) => selectVestingSliceData(state).myUsers.status;
export const selectMyClaimTemplatesStatus = (state: RootState) => selectVestingSliceData(state).myClaimTemplates.status;

export const blockchainTokensSelectors = blockchainTokensInfosAdapter.getSelectors<RootState>(state => state.vesting.blockchainTokenInfos.entities);
export const blockchainVestingContractSelectors = blockchainVestingContractsInfoAdapter.getSelectors<RootState>(state => state.vesting.blockchainVestingContractInfos.entities);

// Select everything about the active vesting contracts - i.e. select those from cache, and join them with all the other metadata
export const selectFilteredVestingContractsFull = (props?: {tokenAddress?: Address, chainId?: Chain['chainId']|null}) => (state: RootState) => {
    const {tokenAddress = null, chainId: passedInChainId = null} = props ?? {};

    const vestingContractBasicInfos = selectMyVestingContractBasicInfo(state);

    const vestingContractsFull = vestingContractBasicInfos.map(({address, chainId, ownerAddresses}, i) => {
        // Filter it out if we were given chainId
        if(passedInChainId && (passedInChainId !== chainId)) {
            return null;
        }
        const relevantUsers = myUsersSelectors.selectEntities(state);
        
        // const vestingContractInfo = blockchainVestingContractSelectors.selectById(state, address);
        const vestingContractInfo = blockchainVestingContractSelectors.selectAll(state).filter(contract => contract.address === address && contract.chainId === chainId)?.[0];
        // const tokenInfo = finalVestingContract?.tokenAddress ? blockchainTokensSelectors.selectById(state, finalVestingContract?.tokenAddress) ?? null : null,
        const tokenInfo = vestingContractInfo?.tokenAddress ? blockchainTokensSelectors.selectAll(state).filter(tokenContract => tokenContract.address === vestingContractInfo.tokenAddress && tokenContract.chainId === chainId)?.[0] : null;
        // TODO: fix this. We can't just get the first entry, we need to show all entries regardless of chain

        if(!vestingContractInfo) {
            return null;
        }
        if(tokenAddress && vestingContractInfo.tokenAddress !== tokenAddress) {
            return null;
        }
    
        const finalVestingContract = produce(vestingContractInfo, vestingContract => {
            if(vestingContract?.claimsLoadStatus === 'loaded-partial' || vestingContract?.claimsLoadStatus === 'loaded-full') {
                vestingContract.claims = Object.fromEntries(Object.entries(vestingContract.claims).map( ([beneficiaryAddress, claim]) => {
                    // Just in case, case insensitive retrieval
                    const matchUsers = Object.values(relevantUsers).filter(user => user?.address?.toLowerCase() === beneficiaryAddress.toLowerCase());
                    const beneficiary = matchUsers?.[0];
                    // If we don't care about case matching, simplify it to this
                    // const beneficiary = relevantUsers?.[beneficiaryAddress];
                    return [beneficiaryAddress, beneficiary ? {...claim, beneficiary} : claim];
                }));
            }
        });
        
        return {
            token: tokenInfo,
            ownerAddresses, 
            ...finalVestingContract,
        };
    })

    const filteredVestingContracts = vestingContractsFull.filter(<T>(vc?: T|null): vc is T => !!vc); // Appease TS-> tell it we eliminate the falsy values

    return filteredVestingContracts;
}
// Return type of the above
export type FullVestingContract = ReturnType<ReturnType<typeof selectFilteredVestingContractsFull>>[number];

// backward compatibility
export const selectVestingContractsFull = selectFilteredVestingContractsFull();

export const selectSingleVestingContractFull = (props: {address?: Address | null, chainId?: Chain['chainId'] | null}) => (state: RootState) => {
    const {address, chainId} = props;

    if(!address || !chainId) { 
        return null;
    }
    const selectedContracts = selectVestingContractsFull(state).filter(vc => vc.address === address && vc.chainId === chainId);
    return selectedContracts.length === 1 ? selectedContracts[0] : null;
} 

export default vestingContractsSlice.reducer;