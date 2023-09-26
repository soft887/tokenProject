import { ButtonProps } from '@mui/material';
import { useState } from 'react';
import DeleteButton from './DeleteButton';
import ConfirmDeleteDialog from '../dialogs/ConfirmDeleteDialog';

// Deletion with confirmaiton
export default function DeleteAfterConfirmButton(props: ButtonProps & {onDelete: () => void}) {
    const {
        onDelete,
        ...rest
    } = props;

    const [open, setOpen] = useState(false);

    const handleClick = () => {
        setOpen(true);
    }
    
    const handleConfirm = () => {
        setOpen(false);
        onDelete?.();
    }

    return <>
        <ConfirmDeleteDialog open={open} onCancel={() => setOpen(false)} onConfirm={handleConfirm} />
        <DeleteButton onClick={handleClick} {...rest} />
    </>
}