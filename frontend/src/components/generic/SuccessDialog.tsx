import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { Box, ModalProps, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export type SuccessDialogProps = Omit<ModalProps, 'children'> & { 
    message: string,
    primaryButtonText: string,
    secondaryButtonText?: string,
    primaryAction: () => void,
    secondaryAction?: () => void,
    closeAction?: () => void,
}

export default function SuccessDialog(props: SuccessDialogProps) {
  const {
      open,      
      primaryAction,
      secondaryAction,
      closeAction,
      message,
      primaryButtonText,
      secondaryButtonText = 'Maybe later',
      ...dialogProps
  } = props;

  return <Dialog {...dialogProps} open={open} onClose={closeAction ?? secondaryAction}>
        <DialogContent sx={{textAlign: 'center'}}>
            <Box>
                <CheckCircleIcon color={'success'} sx={{fontSize: 40}}/>
            </Box>
            <Typography sx={{maxWidth: 250, textAlign: 'center', mx: 'auto', my: 2, fontWeight: 500, fontSize: 16}}>{message}</Typography>
            <Stack spacing={1} sx={{mt: 1}}>
                <Button variant="contained" onClick={primaryAction} color="primary">{primaryButtonText}</Button>
                {secondaryAction && <Button onClick={secondaryAction}>{secondaryButtonText}</Button>}
            </Stack>
        </DialogContent>
    </Dialog>;
}