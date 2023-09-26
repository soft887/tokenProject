import React, {FC} from "react";
import { Box } from "@mui/material";
import { Address } from "../../utils/types";
import { ChainDisplay } from "../chain/ChainDisplay";
import { useMoralis } from "react-moralis";

export type VestingContractContextCardProps = {
    vestingContractAddress: Address;
}



const VestingContractContextCard: FC<VestingContractContextCardProps> = (props) => {
    const {vestingContractAddress} = props;

    const {chainId} = useMoralis();
 
    return <Box sx={{mb: 2}}>
        Chain: <ChainDisplay textOnly chainId={chainId} />. 
        Contract address: {vestingContractAddress}
    </Box>
}

export default VestingContractContextCard;