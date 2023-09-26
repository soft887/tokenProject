import React from "react";
import { useMoralis } from "react-moralis";
import { standardizeChainId } from "../../utils/contract/chain";
import { Address, Chain } from "../../utils/types";

const isOwnerOfAddress = (ownerAddresses: Address|Address[]|null, selectedAddress: Address|null, allowOwnerless: boolean = false) => {
    if(selectedAddress === null) {
        return false;
    }

    // Ensure that this is an array, or null
    const ownerAddressesArray = Array.isArray(ownerAddresses) ? ownerAddresses : (ownerAddresses ? [ownerAddresses] : null)

    if(!ownerAddressesArray) {
        if(!allowOwnerless) {
            return false;
        }
    }
    // Case insensitive comparison
    else if (ownerAddressesArray?.map(x => x.toLowerCase()).indexOf(selectedAddress.toLowerCase()) === -1) {
        return false;
    }

    return true;
}

/**
 * The idea of this is to return the two functions which check whether an user has the right to do do read/write transactions on the blockchain
 * The purpose is to block them if they want to try to interact with the contract but have the wrong chain/account selected
 * @returns {canRead, canWrite}
 */
export default function useBlockchainTransactionPermissions(options?: {allowOwnerlessRead?: boolean, allowOwnerlessWrite?: boolean}) {
    const {
        Moralis, 
        user, 
        chainId,
        account: metaMaskSelectedAddress,
    } = useMoralis();

    const {allowOwnerlessRead = false, allowOwnerlessWrite = false} = options ?? {};

    const canRead = (targetChainId: Chain['chainId'], ownerAddresses?: Address|Address[]|null) => {
        // We can always read
        if(targetChainId !== chainId) {
            if(!chainId || standardizeChainId(targetChainId, {verifyValidChainId: false}) !== standardizeChainId(chainId, {verifyValidChainId: false})) {
                return false;
            }
            else {
                console.warn(`targetChainId (${targetChainId}) !== chainId (${chainId}), however after standardization, they match.`)
            }
        }

        // We allow it if selected address is in the owner accounts.
        // If we have no owner accounts, we will allow ownerless read if this is explicitly requested (legacy functionaility)
        return isOwnerOfAddress(ownerAddresses ?? null, metaMaskSelectedAddress, allowOwnerlessRead);
    }

    const canWrite = (targetChainId: Chain['chainId'], ownerAddresses?: Address|Address[]|null) => {
        if(!canRead(targetChainId, ownerAddresses)) {
            return false;
        }

        // We allow it if selected address is in the owner accounts.
        return isOwnerOfAddress(ownerAddresses ?? null, metaMaskSelectedAddress, allowOwnerlessWrite);
    }

    return {
        canRead,
        canWrite
    }
}