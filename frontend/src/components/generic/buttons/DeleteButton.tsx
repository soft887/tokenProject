import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export default function DeleteButton(props: ButtonProps) {
    const {
        children = 'Remove',
        ...rest
    } = props;

    return <Button startIcon={<DeleteIcon />} color={'error'} {...rest}>{children}</Button>
}