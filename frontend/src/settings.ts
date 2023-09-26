// export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL as string;
// export const WS_BASE_URL =  API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/game_ws/';
export const isDebug =  process.env?.NODE_ENV === 'development';
export const MORALIS_APP_ID = process.env?.REACT_APP_MORALIS_APP_ID ??'';
export const MORALIS_SERVER_URL = process.env?.REACT_APP_MORALIS_SERVER_URL ??'';
export const ACCESS_PASSWORD = process.env?.REACT_APP_ACCESS_PASSWORD ?? null; // No password by default

let envType: 'dev' | 'testnet' | 'mainnet';
switch(process.env?.REACT_APP_NODE_TYPE) {
    case 'dev':
    case 'development':
        envType = 'dev';
        break;

    case 'test':
    case 'testnet':
        envType = 'testnet';
        break;

    case 'mainnet':
    case 'production':
    default:
        envType = 'mainnet';
        break
}

export const NODE_TYPE = envType;
export const DATE_FORMAT = 'yyyy-MM-dd';
export const TIME_FORMAT = 'HH:mm';
export const TIME_S_FORMAT = 'HH:mm:ss';
export const DATETIME_FORMAT = `${DATE_FORMAT} ${TIME_FORMAT}`;
export const DATETIME_S_FORMAT = `${DATE_FORMAT} ${TIME_FORMAT}:ss`;