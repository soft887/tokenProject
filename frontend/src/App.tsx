import React from 'react';
import './App.css';
import theme from './theme';
import { MORALIS_APP_ID, MORALIS_SERVER_URL, ACCESS_PASSWORD } from './settings';
import { ThemeProvider, StyledEngineProvider } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import SelectAccountPage from './components/pages/SelectAccountPage';
import VestingContractPage from './components/pages/founder/vesting-contract/VestingContractOverviewPage';
import MyTokensPage from './components/pages/founder/token/TokenOverviewPage';
import LogoutPage from './components/pages/LogoutPage';
import NotFoundPage from './components/pages/NotFoundPage';
import TermsAndConditionsPage from './components/pages/TermsAndConditionsPage';
import { MoralisProvider } from 'react-moralis';
import { Provider as ReduxStoreProvider } from "react-redux";
import MoralisAuthenticationOverlay from './components/generic/MoralisAuthenticationOverlay';
import store from './store/store';
import LoginPage from './components/pages/LoginPage';
import FounderOverlay from './components/overlays/FounderOverlay';
import MyVestingContractPage from './components/pages/employee/MyVestingContractsPage';
import EmployeeOverlay from './components/overlays/EmployeeOverlay';
import TokenMintPage from './components/pages/founder/token/TokenMintPage';
import TokenImportPage from './components/pages/founder/token/TokenImportPage';
import VestingScheduleCreatePage from './components/pages/founder/vesting-schedule/VestingScheduleCreatePage';
import VestingContractCapTablePage from './components/vesting-contract/VestingContractCapTable';
import FounderAdminPage from './components/pages/founder/FounderAdminPage';
import SendTokenPage from './components/pages/founder/SendTokenPage';
import GettingStartedPage from './components/pages/GettingStartedPage';
import OwnProfilePage from './components/pages/user/OwnProfilePage';
import PasswordAuthLayout from './components/layout/PasswordAuthLayout';
import UserDashboardPage from './components/pages/user/UserDashboardPage';

function App() {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <MoralisProvider appId={MORALIS_APP_ID} serverUrl={MORALIS_SERVER_URL}>
          <ReduxStoreProvider store={store}>
            <BrowserRouter>
              <PasswordAuthLayout password={ACCESS_PASSWORD}>
                <Routes>
                  <Route path="founder" element={<FounderOverlay />}>
                    <Route path="tokens" element={<MyTokensPage />} />
                    <Route path="tokens/mint" element={<TokenMintPage />} />
                    <Route path="tokens/import" element={<TokenImportPage />} />

                    <Route path="tokens/:tokenAddress/vesting-contracts/" element={<VestingContractPage />} />
                    <Route path="vesting-contracts/:vestingContractAddress/cap-table" element={<VestingContractCapTablePage />} />
                    <Route path="vesting-contracts/:vestingContractAddress/schedule/create" element={<VestingScheduleCreatePage />} />

                    <Route path="admin" element={<FounderAdminPage />} />
                    <Route path="send-token" element={<SendTokenPage />} />
                  </Route>
                  <Route path="employee" element={<EmployeeOverlay />}>
                    <Route path="my-vesting-contracts/overview" element={<MyVestingContractPage variant="pie" />} />
                    <Route path="my-vesting-contracts/allocation-table" element={<MyVestingContractPage variant="table" />} />
                  </Route>

                  <Route path="/getting-started/" element={<MoralisAuthenticationOverlay element={<GettingStartedPage />} />} />
                  <Route path="/account-select/" element={<MoralisAuthenticationOverlay element={<SelectAccountPage />} />} />
                  <Route path="/profile/" element={<MoralisAuthenticationOverlay element={<OwnProfilePage />} />} />

                  {/* <Route path="biconomy" element={<EmployeeOverlay />}>
                      <Route path="vesting-contracts/" element={<MoralisAuthenticationOverlay element={<BiconomyVestingContractsPage />} />} />
                      <Route path="token-cap-table/" element={<MoralisAuthenticationOverlay element={<BiconomyTokenCapTable />} />} />
                    </Route> */}
                  <Route path="/terms/" element={<TermsAndConditionsPage />} />
                  <Route path="/" element={<UserDashboardPage />} />
                  <Route path="/login/" element={<LoginPage />} />
                  <Route path="/logout/" element={<LogoutPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </PasswordAuthLayout>
            </BrowserRouter>
          </ReduxStoreProvider>
        </MoralisProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;