import React, { MouseEventHandler } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { ModalProps } from '@mui/material';

export type ConfirmDialogProps = { 
  open: ModalProps['open']; 
  onConfirm?:  MouseEventHandler; 
  onCancel?: MouseEventHandler; 
  title?: string; 
  text?: string; 
  children?: React.ReactNode,
  confirmText?: string | null; 
  cancelText?: string | null; 
  allowCloseOnOutsideClick?: boolean; 
  cancelAfterConfirm?: boolean;
} & ({text: string} | {children: ModalProps['children']} | {});

export default function ConfirmDialog(props: ConfirmDialogProps) {
  const {
      open,
      onConfirm,
      onCancel,
      title = 'Confirm Action',
      text = null,
      children = null,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      cancelAfterConfirm = false,
      allowCloseOnOutsideClick = true,
  } = props;

  const handleConfirm = (e: React.MouseEvent<Element, MouseEvent>) => {
    onConfirm?.(e);
    if(cancelAfterConfirm) {
        onCancel?.(e);
    }
  };
  const handleCancel = (e: React.MouseEvent<Element, MouseEvent>) => {
    onCancel?.(e);
  };

  return (
    <Dialog
      open={open}
      onClose={(e: React.MouseEvent<Element, MouseEvent>) => (allowCloseOnOutsideClick && handleCancel(e))}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
      <DialogContent>
          {(text || children) && (<DialogContentText id="alert-dialog-description">
          {text ?? children}
          </DialogContentText>)}
      </DialogContent>
      <DialogActions>
        {(cancelText !== null) && (<Button onClick={handleCancel} autoFocus>
            {cancelText}
        </Button>)}
        {(confirmText !== null) && (<Button onClick={handleConfirm} color="primary">
            {confirmText}
        </Button>)}
      </DialogActions>
    </Dialog>
  );
}