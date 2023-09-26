import React from 'react';
import { Box, Typography } from '@mui/material';
import ConfirmDialog, { ConfirmDialogProps } from './ConfirmDialog';
import ErrorIcon from '@mui/icons-material/Error';

export type ConfirmDeleteDialogProps = ConfirmDialogProps & {
  subtitle?: string
}

export default function ConfirmDeleteDialog(props: ConfirmDeleteDialogProps) {
  
  const {
    title = "Are you sure you want to remove this?",
    subtitle = "This cannot be undone.",
    confirmText = "Yes, delete",
    cancelText = "No",
    ...rest
  } = props;
  
  return  <ConfirmDialog 
            title={title} 
            confirmText={confirmText}
            cancelText={cancelText}
            {...rest}
            >
      <Box>
        <ErrorIcon color={'inherit'} sx={{fontSize: 40}}/>
      </Box>
      <Typography sx={{maxWidth: 250, textAlign: 'center', mx: 'auto', my: 2, fontWeight: 500, fontSize: 16}}>{title}</Typography>
      <Typography sx={{maxWidth: 250, textAlign: 'center', mx: 'auto', my: 2, fontSize: 12}}>{subtitle}</Typography>
  </ConfirmDialog>
}
