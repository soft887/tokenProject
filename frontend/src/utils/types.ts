import { BigNumber } from "ethers";

export type Address = string;

// Idle => nothing happening. Pending => not yet sent the confirmation to metamask, so waiting for user confirmation
// in-progress => waiting for it to be confirmed
// Confirmed => all good, show success diallog
export type BlockchainTransactionStatus = 'idle' | 'pending' | 'in-progress' | 'confirmed';

// Address&ChainId required, rest optional
export type MyTokenEntry = 
            Pick<TokenInfo, 'address' | 'chainId'> & 
    Partial<Omit<TokenInfo, 'address' | 'chainId'>> & {
        contractType: TokenContractType;
        ownerAddresses: Address[];
    };

export type MyVestingContractEntry = 
              Pick<VestingContractInfo, 'address' | 'chainId' > 
    & Partial<Omit<VestingContractInfo, 'address' | 'chainId' >> & {
        ownerAddresses: Address[];
    };

// AddEthereumChainParameter 
export const MoralisSymbolList = [
    'ethereum', 'bsc', 'polygon',
    'goerli', 'bsc testnet', 'mumbai',
    'dev', 
] as const;

export type MoralisSymbol = typeof MoralisSymbolList[number];
export type Chain = {
    chainSymbol: MoralisSymbol; // our addition
    chainName: string;
    chainId: string;

    nativeCurrency: {
        name: string;
        symbol: string; // 2-6 characters long
        decimals: number;
      };
    rpcUrls: string[];
    blockExplorerUrls?: string[];
    // iconUrls?: string[]; // Currently ignored.
}

export const UserTypeList = ['Founder', 'Team', 'Investor'] as const;
export type UserType = (typeof UserTypeList)[number];

export const RoundTypeList = ['Pre-seed', 'Seed', 'Private'] as const;
export type RoundType = (typeof RoundTypeList)[number];

export type LoadedState = 'not-loaded' | 'loading' | 'loaded' | 'error';

export const UserRoleObjectList = [
    {slug: 'tokenOwner', label: "Token Owner"},
    {slug: 'tokenHolder', label: "Token Holder"},
] as const;

export type UserInterfaceRole = (typeof UserRoleObjectList)[number]['slug'];

const TokenContractTypeList = ['full-premint', 'variable-supply'] as const;
export type TokenContractType = typeof TokenContractTypeList[number] | null;

// Pure token info retrievable from the blockchain, without knowing any specifics
export type TokenInfo = {
    chainId: Chain['chainId'];
    address: Address;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string; // Unfortunately need to use string here as opposed to BigNumber to avoid serialization issues
    iconUrl?: string|null;
}

export type ClaimInfo = {
    startTimestamp: number
    endTimestamp: number
    cliffReleaseTimestamp: number;
    releaseIntervalSecs: number; // Every how many seconds does the vested amount increase. 
    linearVestAmount: string; // total entitlement
    cliffAmount: string; // how much is released at the cliff
    amountWithdrawn: string; // how much was withdrawn thus far
    isActive: boolean; // whether this claim is active (or revoked)
}

export type CalculatedClaimInfo = {
    streamedAmount: string
    withdrawnAmount: string
    totalPlannedVestedAmount: string
    canWithdrawAmount: string
    fullAmountVestedTimestamp: number
}

export type VestingContractInfo = {
    chainId: Chain['chainId'];
    address: Address;
    tokenAddress: string;

    claims: {[beneficiaryAddress: Address]: ClaimInfo & {beneficiary?: KnownVestingUserInfo}}, // claims always accessible (although potentially empty), but their load status not so
    claimsLoadStatus: 'not-loaded' | 'loading-partial' | 'loading-full' | 'error' | 'loaded-partial' | 'loaded-full'
} & ({ 
        contractBalance: string ; // In tokens, unfortunately need to use string here as opposed to BigNumber to avoid serialization issues with redux
        numTokensReservedForVesting: string;
        numVestingRecipients: number;
        metadataLoadStatus: 'loaded'
    } | {
        metadataLoadStatus: 'not-loaded' | 'loading' | 'error'
    }
    // Loaded-partial state means: some data was loaded - but doesn't mean that was comprehensive at the time of the load (there might be other entries)
)  & ({ // Vesting recipients with their status
    vestingRecipients: Address[];
    vestingRecipientsLoadStatus: 'loaded-full'
} | {
    vestingRecipientsLoadStatus: 'not-loaded' | 'loading-full' | 'error'
}
)

export type KnownVestingUserInfo = {
    objectId?: string;
    name: string;
    address: Address;
    userType?: UserType;
    companyName?: string;
    roundType?: RoundType;
    isAnonymous: false;
}
export type AnonymousVestingUserInfo = Pick<KnownVestingUserInfo, 'address'> & {isAnonymous: true}

export type VestingBeneficiary = KnownVestingUserInfo | AnonymousVestingUserInfo;

export type ClaimTemplate = {
    tokenAddress: string | null;
    vestingContractAddress: string | null;

    objectId: string; // Cannot use address as an ID as a single contract might have multiple claim templates, a claim template might be used for different contracts
    // contractAddress?: Address; // We don't really need to associate a template with the contract
    label: string;
    isTimestampRelative: boolean;

    scheduleStartTimestamp: number;
    totalAmountTokens: string; 
    cliffDurationAfterScheduleStart: Duration | null;
    cliffPercent: number | null;

    linearReleaseFrequency: Duration;
    scheduleEndTimestamp: number;
}; // & Partial<Omit<ClaimInfo, 'isActive' | 'amountWithdrawn'>>


export type PendingClaimTemplate = Omit<ClaimTemplate, 'objectId'>

// function addUserSchedule(address _recipient, uint32 _scheduleId, uint64 _scheduleStartTimestamp, uint16 _multiplier ) public onlyOwner  {
export type AddVestingClaimDto = [
    recipientAddress: Address,

    startTimestamp: number,
    endTimestamp: number,
    cliffReleaseTimestamp: number,
    releaseIntervalSecs: number, // Every how many seconds does the vested amount increase. 
    linearVestAmount: BigNumber, // total entitlement
    cliffAmount: BigNumber // how much is released at the cliff
];