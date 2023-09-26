import { useEffect } from "react";
import { useMoralis } from "react-moralis";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../store/store";
import { fetchMyClaimTemplates, selectMyClaimTemplatesStatus, fetchMyUsers, selectMyUsersStatus } from "../../store/vestingSlice";
import EmployeeOverlay from "./EmployeeOverlay";

const FounderOverlay = () => {
    const { Moralis, } = useMoralis();

    const dispatch = useAppDispatch();
    const scheduleHeadersLoadState = useSelector(selectMyClaimTemplatesStatus);
    const myUsersLoadState = useSelector(selectMyUsersStatus);
    
    useEffect(() => {
        if(Moralis) {
            (scheduleHeadersLoadState !== 'loaded') &&  dispatch(fetchMyClaimTemplates({Moralis}));
            (myUsersLoadState !== 'loaded') &&  dispatch(fetchMyUsers({Moralis}));
        }
    }, [Moralis, dispatch, myUsersLoadState, scheduleHeadersLoadState]);

    // Simply load all the employee stuff, plus users&schedules extra
    return <EmployeeOverlay />
}

export default FounderOverlay;
