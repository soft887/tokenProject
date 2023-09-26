import React, { FC } from "react";
import { Chain } from "../../utils/types";
import { lookupChainMeta, standardizeChainId } from '../../utils/contract/chain';
import { Typography } from "@mui/material";

export type ChainDisplayProps = {
    chainId?: Chain['chainId'] |  null,
    textOnly?: boolean
}

//  TODO: consider merging to AddressDisplay
export const ChainDisplay: FC<ChainDisplayProps> = (props) => {
    const {
        chainId,
        textOnly = false
    } = props;

    let label = 'N/A';

    if(chainId) {
        try {
            const chainMeta = lookupChainMeta(chainId);
            label = chainMeta.chainSymbol;
        }
        catch(e) {
            console.error(e)
            label = `Unknown (${standardizeChainId(chainId, {verifyValidChainId: false})})`
        }
    }


    return textOnly ? <>{label}</> : <Typography>{label}</Typography>;
}