import React, {FC, useState} from "react";
import { Dialog, DialogContent, DialogTitle, TextField, Button, MenuItem, DialogActions } from "@mui/material";
import { DialogProps } from "@mui/material/Dialog";
import { ClaimTemplate } from "../../utils/types";
import { useSelector } from "react-redux";
import { myClaimTemplatesSelectors } from "../../store/vestingSlice";

export type ClaimTemplateSelectDialogProps = {
    onClaimTemplateSelect: (claimTemplate: ClaimTemplate) => void;
    onClose: () => void;
} & DialogProps;



const ClaimTemplateSelectDialog: FC<ClaimTemplateSelectDialogProps> = (props) => {
    const { 
        onClaimTemplateSelect, 
        onClose,
        ...dialogProps
    } = props;
    const myClaimTemplates = useSelector(myClaimTemplatesSelectors.selectAll);

    const [selectedClaimTemplateId, setSelectedClaimTemplateId] = useState<ClaimTemplate['objectId']>("");
    const selectedClaimTemplate = myClaimTemplates.find(ct => ct.objectId === selectedClaimTemplateId) ?? null;

    return <Dialog {...dialogProps}>
        <DialogTitle>Select a Claim Template</DialogTitle>
        <DialogContent>
            <TextField select value={selectedClaimTemplateId} onChange={(e) => setSelectedClaimTemplateId(e.target.value)}>
                {/* <MenuItem value="">Please select...</MenuItem> */}
                {myClaimTemplates.map((claimTemplate, i) => <MenuItem key={i} value={claimTemplate.objectId}>{claimTemplate.label}</MenuItem>) }
            </TextField>
        </DialogContent>
        <DialogActions>
            <Button variant={'contained'} color={'primary'}   onClick={() => selectedClaimTemplate && onClaimTemplateSelect?.(selectedClaimTemplate)} disabled={selectedClaimTemplate === null}>Select Template</Button>
            <Button variant={'contained'} color={'secondary'} onClick={onClose}>Cancel</Button>
        </DialogActions>
    </Dialog>
}

export default ClaimTemplateSelectDialog;