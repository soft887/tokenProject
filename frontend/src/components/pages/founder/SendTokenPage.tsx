import React, { useState, useEffect } from 'react';
import { ethers, utils } from 'ethers'
// material UI
import { styled } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Snackbar, { SnackbarOrigin } from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';

import DashboardPageLayout from "../../layout/DashboardPageLayout";
import { copyText } from "../../../utils/helpers"
import TransactionWaitProgressBackdrop from "../../progress/TransactionWaitProgressBackdrop";
import { BlockchainTransactionStatus } from "../../../utils/types";
import ABI from './tokenSendABI.json'
import usdcABI from './usdcABI.json'

const contractAddress = "0x3b569D628615f0d05269760830196aB629A73657"
const testUSDCAddress = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F"
const roleList = ["Founder", "Investor", "Team member", "Advisor", "Other"]

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement<any, any>;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
    props,
    ref,
) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export interface State extends SnackbarOrigin {
    openAlert: boolean;
}

const StyledFormControl = styled(FormControl)`
    width: 150px;
`
const TokenAmountInput = styled('input')`
    width: 150px;
    height: 40px;
    box-shadow: 0 0 10px #0003;
    border-radius: 5px;
    border: 1px solid #673A58;
    padding: 0 1em;
`
const InputAddressArea = styled('div')`
    width: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1em 0;
    position: relative;
`
const StyledFormControlLabel = styled(FormControlLabel)`
    margin: 0 1em;
`
const StyledDialogContent = styled(DialogContent)`
    input {
        width: 100%;
        height: 50px;
        box-shadow: 0 0 10px #0003;
        border-radius: 5px;
        border: 1px solid #673A58;
        padding: 0 1em;
    }
    textarea {
        width: 100%;
        box-shadow: 0 0 10px #0003;
        border-radius: 5px;
        border: 1px solid #673A58;
        padding: 1em;
    }
`
const TextArea = styled('div')`
    position: relative;
    p {
        position: absolute;
        bottom: 0px;
        right: 20px;
    }
`
const CopyText = styled('h3') <{ display: number }>`
    background-color: #aaaa;
    padding: 3px 10px;
    border-radius: 50px;
    display: ${props => props.display ? 'block' : 'none'};
    position: absolute;
    top: -40px;
    right: -20px;
`
const AddressContainer = styled('div')`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
`
const CopyTextContainer = styled('div')`
    position: relative;
`
const OtherRoleInput = styled('input')`
    width: 50% !important;
    min-width: 200px;
    height: 56px !important;
    @media (max-width: 555px) {
        margin-top: 1em;
    }
`
const SpaceBetweenDiv = styled('div')`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    @media (max-width: 555px) {
        flex-direction: column;
        align-items: flex-start;
    }
`

type Props = {}

const SendTokenPage = (props: Props) => {
    const [isLoading, setIsLoading] = useState(false)
    const [tokenAmount, setTokenAmount] = useState([''])
    const [token, setToken] = useState([''])
    const [inputAddress, setInputAddress] = useState("")
    const [receiverName, setReceiverName] = useState("")
    const [addressList, setAddressList] = useState<any>([])
    const [swapStatus, setSwapStatus] = useState(false)
    const [swapItemStatus, setSwapItemStatus] = useState<any>([]);
    const [open, setOpen] = useState(false);
    const [tooltipTitle, setTooltipTitle] = useState("Send directly without swaping...")
    const [description, setDescription] = useState("")
    const [role, setRole] = useState("")
    const [state, setState] = React.useState<State>({
        openAlert: false,
        vertical: 'top',
        horizontal: 'center',
    });
    const { vertical, horizontal, openAlert } = state;
    const [displayMsg, setDisplayMsg] = useState("")
    const [responseStatus, setResponseStatus] = useState("success")
    const [showCopyText, setShowCopyText] = useState(false)
    const [modalPurpose, setModalPurpose] = useState("add")
    const [clickedUser, setClickedUser] = useState(-1)
    const [otherRole, setOtherRole] = useState("")
    const [tokenMintState, setTokenMintState] = useState<BlockchainTransactionStatus>("idle");

    // const addressList = [
    //     { id: 1, address: '0xD51e86a71F873988d530E9b634CCb8Dc8979F496', value: 3 },
    //     { id: 2, address: '0xD51e86a71F873988d530E9b634CCb8Dc8979F496', value: 4 },
    //     { id: 3, address: '0xD51e86a71F873988d530E9b634CCb8Dc8979F496', value: 5 },
    //     { id: 3, address: '0xD51e86a71F873988d530E9b634CCb8Dc8979F496', value: 6 },
    //     { id: 3, address: '0xD51e86a71F873988d530E9b634CCb8Dc8979F496', value: 7 },
    //     { id: 3, address: '0xD51e86a71F873988d530E9b634CCb8Dc8979F496', value: 8 },
    // ]
    const handleChange = (event: SelectChangeEvent<string>, idx: number) => {
        let tokenArray = [...token]
        tokenArray[idx] = event.target.value
        setToken(tokenArray);
    };
    const handleChangeAmount = (event: React.ChangeEvent<HTMLInputElement>, idx: number) => {
        const tokenAmountArray = [...tokenAmount]
        tokenAmountArray[idx] = event.target.value
        setTokenAmount(tokenAmountArray);
    };
    const handleInputAddress = (e: { target: { value: React.SetStateAction<string>; }; }) => {
        setInputAddress(e.target.value);
    }
    const handleReceiverName = (e: { target: { value: React.SetStateAction<string>; }; }) => {
        setReceiverName(e.target.value);
    }
    const handleSwapStatus = () => {
        setSwapStatus(!swapStatus)
        console.log('swapStatus', swapStatus);
        let itemStatusTemp = [...swapItemStatus]
        console.log('222', swapItemStatus);

        for (let i = 0; i < itemStatusTemp.length; i++) {
            itemStatusTemp[i] = !swapStatus
        }
        setSwapItemStatus(itemStatusTemp);
    }
    const handleItemSwapStatus = (index: number) => {
        let swapitems = [...swapItemStatus];
        swapitems[index] = !swapItemStatus[index];
        setSwapItemStatus(swapitems);
        const trueItemStatusArray = swapitems.filter((item) => {
            return item === true
        })
        if (trueItemStatusArray.length === swapitems.length) {
            setSwapStatus(true)
        } else setSwapStatus(false)
    }
    const handleSnackBar = () => {
        setState({
            openAlert: true,
            vertical: 'top',
            horizontal: 'center',
        });
    }
    const initializeInputFields = () => {
        setInputAddress("")
        setReceiverName("")
        setDescription("")
        setRole("")
        setOtherRole("")
    }
    const handleStoreAddresses = () => {
        if (!utils.isAddress(inputAddress)) {
            setDisplayMsg("Incorrect address")
            setResponseStatus("warning")
            handleSnackBar()
            return
        }
        if (receiverName === "") {
            setDisplayMsg("Please enter a receiver name")
            setResponseStatus("warning")
            handleSnackBar()
            return
        }
        if (role === "" || (role === "Other" && otherRole === "")) {
            setDisplayMsg("Please select a role")
            setResponseStatus("warning")
            handleSnackBar()
            return
        }
        const res = localStorage.getItem('@addressList')
        const items = res && JSON.parse(res);
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (inputAddress === items[i].address) {
                    setDisplayMsg("User already added")
                    setResponseStatus("warning")
                    handleSnackBar()
                    return
                }
            }
            items.push({
                id: items.length + 1,
                address: inputAddress,
                receiverName,
                description,
                role,
                otherRole
            })
            localStorage.setItem('@addressList', JSON.stringify(items));
            setAddressList(items);
        } else {
            const obj = [{
                id: 1,
                address: inputAddress,
                receiverName,
                description,
                role,
                otherRole
            }]
            localStorage.setItem('@addressList', JSON.stringify(obj));
            setAddressList(obj);
        }
        let swapitems = [...swapItemStatus];
        swapitems.push(false);
        setSwapItemStatus(swapitems);
        initializeInputFields()
        setOpen(false)
    }

    useEffect(() => {
        const res = localStorage.getItem('@addressList')
        const items = res && JSON.parse(res);
        console.log('items', items);
        if (items) {
            setAddressList(items);
            let SwapItems = [];
            for (let i = 0; i < items.length; i++) {
                SwapItems.push(false);
            }
            setSwapItemStatus(SwapItems);
        }
    }, [])

    useEffect(() => {
        if (swapStatus) setTooltipTitle("Receiver will receive as USDC...")
        else setTooltipTitle("Send directly without swaping...")
    }, [swapStatus])

    const handleSubmit = async (addr: string, amount: string, selectedToken: string, index: number) => {
        console.log('amount====', amount);
        console.log('typeof amount====', typeof (amount));
        console.log('typeof amount====', parseFloat(amount));

        if (amount === "" || !selectedToken) {
            setDisplayMsg("Please input amount and select a token")
            setResponseStatus("warning")
            handleSnackBar()
        } else {
            try {
                setTokenMintState('pending')
                const displayAddress = `${addr.slice(0, 5)} ... ${addr.substr(addr.length - 5)}`
                const provider = new ethers.providers.Web3Provider((window as any).ethereum)
                const accounts = await provider.send("eth_requestAccounts", []);
                const signer = provider.getSigner()
                const myContract = new ethers.Contract(contractAddress, ABI, signer);
                const USDCContract = new ethers.Contract(testUSDCAddress, usdcABI, signer)

                if (selectedToken === "USDC") {
                    // depost token
                    // check allowance tokenAmount
                    const allowanceRes = await USDCContract.allowance(accounts[0], contractAddress)
                    console.log('allowanceRes', allowanceRes.toString());
                    console.log('parseFloat(allowanceRes.toString())==', parseFloat(allowanceRes.toString()));
                    console.log('parseFloat(amount)==', parseFloat(amount));

                    // Approve token if allowance amount is smaller than input amount
                    if (parseFloat(allowanceRes.toString()) < parseFloat(amount)) {
                        console.log('approve start');

                        const approveRes = await USDCContract.approve(contractAddress, `${parseFloat(amount) * 10 ** 6}`);
                        await approveRes.wait()
                        console.log('approveRes', approveRes);
                    }
                    const depositRes = await myContract.depositTokens(`${parseFloat(amount) * 10 ** 6}`)
                    const transferRes = await myContract.sendTokens(addr, `${parseFloat(amount) * 10 ** 6}`)
                    setTokenMintState('in-progress');
                    const transaction = await transferRes.wait();
                    // setIsLoading(false)
                    setTokenMintState('confirmed');
                    setDisplayMsg(`${amount} USDC sent to ${displayAddress} successfully!`)
                    handleSnackBar()
                } else {
                    if (!swapItemStatus[index]) {
                        // send ETH, receive ETH
                        const res = await myContract.SendEther(addr, { value: utils.parseEther(amount) })
                        setTokenMintState('in-progress');
                        const transaction = await res.wait();
                        // setIsLoading(false)
                        setTokenMintState('confirmed');
                        handleSnackBar()
                    } else {
                        // send ETH, receive USDC
                        const res = await myContract.swapExactETHforTokens('1', addr, { value: utils.parseEther(amount) });
                        setTokenMintState('in-progress');
                        const transaction = await res.wait();
                        // setIsLoading(false)
                        setTokenMintState('confirmed');
                        handleSnackBar()
                    }
                    setDisplayMsg(`${amount} ETH sent to ${displayAddress} successfully!`)
                }
                setResponseStatus("success");
                // initialize token amount input & token selection
                const tokenAmountArray = [...tokenAmount]
                tokenAmountArray[index] = ""
                setTokenAmount(tokenAmountArray);
                let tokenArray = [...token]
                tokenArray[index] = ""
                setToken(tokenArray);
            } catch (error) {
                // setIsLoading(false)
                setTokenMintState('idle');
                console.log('handleSubmit error', error);
                setResponseStatus("error");
                setDisplayMsg("Transaction failed")
                handleSnackBar()
            }

        }
    }

    const handleDelete = (idx: number) => {
        console.log(swapItemStatus)
        if (window.confirm(`Are you sure you want to delete ${addressList[idx].receiverName}?`)) {
            const res = localStorage.getItem('@addressList')
            const items = res && JSON.parse(res);
            const arrayToBeSaved = items.filter((item: any) => {
                return item.address !== addressList[idx].address
            })
            localStorage.setItem('@addressList', JSON.stringify(arrayToBeSaved));
            setAddressList(arrayToBeSaved);
            const itemStatusTemp = [...swapItemStatus]
            itemStatusTemp.splice(idx, 1)
            setSwapItemStatus(itemStatusTemp)
        }
    }

    const handleClose = () => {
        initializeInputFields()
        setOpen(false)
    }

    const callCopyFunc = (txt: string, idx: number) => {
        copyText(txt)
        setShowCopyText(true)
        setClickedUser(idx)
        setTimeout(() => {
            setShowCopyText(false)
        }, 1000);
    }

    const handleViewUser = (idx: number) => {
        setOpen(true)
        setModalPurpose("view")
        setInputAddress(addressList[idx].address)
        setReceiverName(addressList[idx].receiverName)
        setDescription(addressList[idx]?.description)
        setRole(addressList[idx]?.role)
        setOtherRole(addressList[idx]?.otherRole)
    }

    return (
        <DashboardPageLayout>
            <Container maxWidth="xl">
                <TransactionWaitProgressBackdrop status={tokenMintState} />
                <Snackbar
                    anchorOrigin={{ vertical, horizontal }}
                    open={openAlert}
                    autoHideDuration={6000}
                    onClose={() => setState({ ...state, openAlert: false })}
                    key={vertical + horizontal}
                >
                    {responseStatus === "success" ?
                        <Alert onClose={() => setState({ ...state, openAlert: false })} severity="success" sx={{ width: '100%' }}>
                            {displayMsg}
                        </Alert>
                        : responseStatus === "warning" ?
                            <Alert onClose={() => setState({ ...state, openAlert: false })} severity="warning" sx={{ width: '100%' }}>
                                {displayMsg}
                            </Alert>
                            :
                            <Alert onClose={() => setState({ ...state, openAlert: false })} severity="error" sx={{ width: '100%' }}>
                                {displayMsg}
                            </Alert>
                    }
                </Snackbar>

                <Dialog
                    open={open}
                    TransitionComponent={Transition}
                    keepMounted
                    // onClose={() => setOpen(false)}
                    aria-describedby="alert-dialog-slide-description"
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>{"Add User"}</DialogTitle>
                    <StyledDialogContent dividers={true}>
                        <p>Receiver Address</p>
                        <input type="text" onChange={handleInputAddress} value={inputAddress} placeholder="receiver address (e.g: 0x...)" />
                        <p>Receiver  Name</p>
                        <input type="text" onChange={handleReceiverName} value={receiverName} placeholder="receiver name (e.g: Jack)" />
                        <p>Description</p>
                        <TextArea>
                            <textarea placeholder="Any information you want to add..." rows={5} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                            <p>{description ? description.length : 0}/300</p>
                        </TextArea>
                        <p>Role</p>
                        <SpaceBetweenDiv>
                            <StyledFormControl fullWidth style={{ width: '200px' }}>
                                <InputLabel id="demo-simple-select-label">Role</InputLabel>
                                <Select
                                    labelId="demo-simple-select-label"
                                    id="demo-simple-select"
                                    value={role}
                                    label="Age"
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    {roleList.map((role, idx) => (
                                        <MenuItem key={idx} value={`${role}`}>{role}</MenuItem>
                                    ))}
                                </Select>
                            </StyledFormControl>
                            {role === "Other" && <OtherRoleInput type="text" onChange={(e) => setOtherRole(e.target.value)} value={otherRole} placeholder="Other role... (e.g: Developer)" />}
                        </SpaceBetweenDiv>
                    </StyledDialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancel</Button>
                        {modalPurpose === "add" && <Button onClick={handleStoreAddresses} variant="contained">Add +</Button>}
                    </DialogActions>
                </Dialog>

                <Box sx={{ flexGrow: 1 }}>
                    <InputAddressArea>
                        <Button variant="contained" onClick={() => {
                            setOpen(true)
                            setModalPurpose("add")
                        }}>Add +</Button>
                        {/* <input type="text" onChange={handleInputAddress} value={inputAddress} placeholder="Input receiver address (e.g: 0x...)" />
                        <input type="text" onChange={handleReceiverName} value={receiverName} placeholder="Input receiver name (e.g: Jack)" /> */}
                        <Tooltip title={tooltipTitle} placement="top-start" arrow>
                            <StyledFormControlLabel control={<Checkbox checked={swapStatus} onChange={handleSwapStatus} />} label="Swap All" />
                        </Tooltip>
                    </InputAddressArea>
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 650 }} aria-label="simple table">
                            <TableHead>
                                <TableRow>
                                    <TableCell align="center">No</TableCell>
                                    <TableCell align="center">Receiver Name</TableCell>
                                    <TableCell align="center">Address</TableCell>
                                    <TableCell align="center">Amount</TableCell>
                                    <TableCell align="center">Token</TableCell>
                                    <TableCell align="center">Swap To USDC</TableCell>
                                    <TableCell align="center">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {addressList && addressList.map((row: any, index: number) => (
                                    <TableRow
                                        key={index}
                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                        style={{ padding: '0.5em 0 !important' }}
                                    >
                                        <TableCell component="th" scope="row" align="center">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell component="th" scope="row" align="center">
                                            {row.receiverName}
                                        </TableCell>
                                        <TableCell align="center">
                                            <AddressContainer>
                                                <a href={`https://goerli.etherscan.io/address/${row.address}`} target="_blank" rel="noreferrer">
                                                    {row.address.slice(0, 5)} ... {row.address.substr(row.address.length - 5)}
                                                </a>
                                                <CopyTextContainer>
                                                    <IconButton aria-label="delete" size="small" style={{ marginLeft: 5 }} onClick={() => callCopyFunc(row.address, index)}>
                                                        <ContentCopyIcon fontSize="small" />
                                                    </IconButton>
                                                    <CopyText display={showCopyText && clickedUser === index ? 1 : 0}>Copied!</CopyText>
                                                </CopyTextContainer>
                                            </AddressContainer>
                                        </TableCell>
                                        <TableCell align="center">
                                            <TokenAmountInput
                                                type="number"
                                                value={`${tokenAmount[index]}`}
                                                onChange={(e) => handleChangeAmount(e, index)}
                                                step={0.01}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <StyledFormControl fullWidth>
                                                <InputLabel id="demo-simple-select-label" style={{ backgroundColor: 'white', padding: "0 5px" }}>Token</InputLabel>
                                                <Select
                                                    labelId="demo-simple-select-label"
                                                    id="demo-simple-select"
                                                    value={`${token[index]}`}
                                                    label="Age"
                                                    onChange={(e) => handleChange(e, index)}
                                                >
                                                    <MenuItem value={`ETH`}>ETH</MenuItem>
                                                    <MenuItem value={`USDC`}>USDC</MenuItem>
                                                </Select>
                                            </StyledFormControl>
                                        </TableCell>
                                        <TableCell align="center" width="10%">
                                            <Checkbox checked={swapItemStatus[index]} onChange={() => handleItemSwapStatus(index)} size="small" disabled={token[index] === "USDC"} />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button variant="contained" onClick={() => handleSubmit(row.address, tokenAmount[index], token[index], index)}>Submit</Button>
                                            <IconButton aria-label="delete" color="error" style={{ marginLeft: 15 }} onClick={() => handleDelete(index)}>
                                                <DeleteIcon />
                                            </IconButton>
                                            <IconButton aria-label="view" color="primary" style={{ marginLeft: 15 }} onClick={() => handleViewUser(index)}>
                                                <VisibilityIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                </Box>
            </Container>
        </DashboardPageLayout>
    )
}

export default SendTokenPage
