import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { createMakeStyles } from 'tss-react';

const fallbackFonts = [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    'sans-serif'
];

const palette = {
    // mode: 'dark' as PaletteMode,
    primary: {
        main: '#673A58',
        dark: '#4B2940',
    },
    secondary: {
        main: '#F2EAE0',
        // orange: #FF9405
    },
    background: {
        default: '#E5E5E5',
        // light: '#FFFFFF',
        // dark: '#FBF9F6',
    },
    // error: {
    //     main: '#FF9405', // orange
    // },
    // info: {
    //     main: '#364F65',
    // }

};

let theme = createTheme({
    palette,
    typography: {
        fontFamily: [
            "Inter",
            ...fallbackFonts
        ].join(','),

        h4: {
            fontSize: 30,
            fontWeight: 500,
            marginBottom: 20,
        }
    },
    components: {
        MuiDrawer: {
            styleOverrides: {
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 400,
                    fontSize: 12,
                    lineHeight: 1,
                    paddingLeft: 0,
                },
                body: {
                    paddingLeft: 0,
                    fontSize: 12,
                    paddingTop: 4,
                    paddingBottom: 4,
                }
            },
        },
       
        MuiTypography: {
            defaultProps: {
              variantMapping: {
                // h1: 'h4',
                },
            },
        },

        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 400,
                    // height: 30,
                    // marginTop: 5, // (40 - 30) / 2
                    
                },
                outlined: {
                    // marginTop: 0,
                    fontSize: 14,
                    fontWeight: 500,
                },
                contained: {
                    fontSize: 14,
                    fontWeight: 500,
                    paddingLeft: 37,
                    paddingRight: 37,
                    paddingTop: 11,
                    paddingBottom: 11
                }
            }
        },
        // MuiCardHeader: {
        //     styleOverrides: {
        //         root: {
        //             fontSize: 14
        //         }
        //     }
        // }
    }
});

theme = responsiveFontSizes(theme, {factor: 1.25})  

export const { makeStyles } = createMakeStyles({useTheme: () => theme });

export default theme;