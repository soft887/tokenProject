import React from 'react';
import ConfirmDialog, { ConfirmDialogProps } from './ConfirmDialog';

export type AlertDialogProps = Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel' | 'confirmText' | 'cancelText'> & { 
  onClose?:  ConfirmDialogProps['onCancel']; 
  closeText?: string | null; 
}

export default function AlertDialog(props: AlertDialogProps) {
  const {
      onClose = ()=>{},
      title = 'Alert',
      closeText = 'Close',
      ...confirmProps
  } = props;

  return (
      <ConfirmDialog {...confirmProps} confirmText={null} onCancel={onClose} title={title} cancelText={closeText} />
  );
}