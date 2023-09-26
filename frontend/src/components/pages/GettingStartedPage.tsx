import { FC } from "react";
import { Box, Button, Grid, Card, CardContent, CardHeader, Stack, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar } from "@mui/material";
import DashboardPageLayout from "../layout/DashboardPageLayout";
import { NavLink } from 'react-router-dom'
import { useMoralis } from "react-moralis";
import AddressDisplay from "../address/AddressDisplay";
import setupImg from '../../assets/setup.png';
import whyCaptableImg from '../../assets/why_captable.png';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoins } from '@fortawesome/free-solid-svg-icons'

export type GettingStartedPageProps = {
    
}

const GettingStartedPage: FC<GettingStartedPageProps> = () => {

    const {user} = useMoralis();

    const steps = [
        {
            icon: <FontAwesomeIcon icon={faCoins} />,
            text: 'Start a project by minting a new token'
        },
        {
            icon: <FontAwesomeIcon icon={faCoins} />,
            text: 'Create a vesting contract'
        },
        {
            icon: <FontAwesomeIcon icon={faCoins} />,
            text: 'Fund the vesting contract',
        },
        {
            icon: <FontAwesomeIcon icon={faCoins} />,
            text: 'Create a vesting schedule and add users in it'
        },
    ]

    return <DashboardPageLayout>
        <Typography variant={'h4'}>Hello, {user?.attributes?.username ?? <AddressDisplay value={user?.attributes?.ethAddress} maxDisplayChars={10} />}</Typography>
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <Card sx={{boxShadow: 0, borderRadius: '8px', py: '40px', px: '32px' }}>
                    <Stack direction={'row'}>
                        <Stack>
                            <CardHeader 
                                sx={{pb: 0}}
                                title={
                                <Typography sx={{fontWeight: 'bold', fontSize: '20px'}}>
                                    Setup token vesting in minutes. No code required.
                                </Typography>
                                } 
                            />
                            <CardContent>
                                <Box>
                                    <Typography
                                        sx={{fontSize: '14px', pb: '12px'}}
                                    >
                                        Our platform makes it seamless for you to design and customise your vesting schedules for your fellow team members and investors. Then sit back and track your token holders as they claim their vested tokens!
                                    </Typography>
                                    <NavLink to={'/founder/tokens/'}>
                                        <Button variant={'contained'}>Create a project</Button>
                                    </NavLink>
                                </Box>
                            </CardContent>
                        </Stack>
                        <Box sx={{
                            width: 600, 
                        }}>
                            <img 
                                src={setupImg} 
                                alt="vtvl.co setupImg" 
                                style={{
                                    objectFit: 'contain', 
                                    width: '100%',
                                    height: '100%'
                                }}
                            />
                        </Box>
                    </Stack>
                </Card>
            </Grid>
        
            <Grid item xs={12} md={6}>
                <Card sx={{boxShadow: 0, borderRadius: '8px', p: '16px'}}>
                    <CardHeader title={
                        <Typography
                            sx={{fontSize: 16, fontWeight: 500}}
                        >
                            How it works
                        </Typography>
                    } />
                    <CardContent>
                        <List>
                            {steps.map((item, i) => <ListItem key={i}>
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: '#375B5F'}}>
                                        {item.icon}
                                    </Avatar>
                                </ListItemAvatar>
                                {/* <ListItemIcon 
                                    // sx={listItemIconSx}
                                >{item.icon}
                                </ListItemIcon> */}
                                <ListItemText>
                                    {i+1}. {item.text}
                                </ListItemText>
                            </ListItem>)}
                        </List>
                    </CardContent>
                </Card>
            </Grid>

            {/* <Grid item xs={12} md={6}>
                <Card sx={{boxShadow: 0, borderRadius: '8px', p: '16px'}}>
                    <CardHeader 
                        title={
                            <Typography
                                sx={{fontSize: 16, fontWeight: 500}}
                            >
                                Latest articles about products
                            </Typography>
                        } 
                        // titleTypographyProps={{fontSize:'16px'}}
                        // sx={{fontSize: '16px'}}
                    />
                    <CardContent>
                        <Box sx={{width: 300}}>
                            <img 
                                src={whyCaptableImg} 
                                alt="vtvl.co whyCaptableImg" 
                                style={{
                                    objectFit: 'contain', 
                                    width: '100%',
                                    height: '100%'
                                }}
                            />
                        </Box>
                        <Typography sx={{fontSize: 20, fontWeight: 600}}>Why are Cap tables important for a startup?</Typography>
                    </CardContent>
                </Card>
            </Grid> */}
        </Grid>
    </DashboardPageLayout>
}

export default GettingStartedPage;