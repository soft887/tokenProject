import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import { To, useNavigate } from 'react-router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export type BackButtonProps = ButtonProps & {
    url?: To
}

export default function BackButton(props: BackButtonProps) {
    const {
        children = 'Back',
        url = null
    } = props;

    const navigate = useNavigate();

    const handleClick = (e: any) => {
        url ? navigate(url) : navigate(-1);
    };

    return <Button startIcon={<ArrowBackIcon />} onClick={handleClick} sx={{ml:-1}}>{children}</Button>
}