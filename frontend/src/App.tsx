import React from "react";
import { Route, Routes } from 'react-router-dom'
import './utils/clearUserCache.js'
import HomePage from './pages/HomePage'
import RegisterPage from './pages/RegisterPage'
import SignupPage from './pages/SignupPage'
import Dashboard from "./pages/Dashboard";
import UserProfile from "./pages/UserProfile";
import AdminTopupRequests from "./pages/AdminTopupRequests";
import AdminUserRewards from "./pages/AdminUserRewards";
import AdminWithdrawRequests from "./pages/AdminWithdrawRequests";
import AdminTierRequests from "./pages/AdminTierRequests";
import AdminRegistrationRequests from "./pages/AdminRegistrationRequests";
import AdminLevelManagement from "./pages/AdminLevelManagement";
import AdminNetworkRewards from "./pages/AdminNetworkRewards";
import AdminTierManagement from "./pages/AdminTierManagement";
import AdminConversionRates from "./pages/AdminConversionRates";
import AdminGlobalSettings from "./pages/AdminGlobalSettings";
import AdminWalletVerifications from "./pages/AdminWalletVerifications";
import AdminUserImpersonation from "./pages/AdminUserImpersonation";
import AdditionalVerification from "./pages/AdditionalVerification";
import AdminAdditionalVerification from "./pages/AdminAdditionalVerification";
import { SHOW_ADDITIONAL_VERIFICATION_UI } from "./config/featureFlags";
import UserTransactions from "./pages/UserTransactions";
import ProtectedRoute from "./components/helpers/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "sonner";

function App() {

  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<RegisterPage />} />
        <Route path="/register" element={<SignupPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        } />
        <Route path="/transactions" element={
          <ProtectedRoute>
            <UserTransactions />
          </ProtectedRoute>
        } />
        {SHOW_ADDITIONAL_VERIFICATION_UI && (
          <Route path="/additional-verification" element={
            <ProtectedRoute>
              <AdditionalVerification />
            </ProtectedRoute>
          } />
        )}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminUserRewards />
          </ProtectedRoute>
        } />
        <Route path="/admin/topup-requests" element={
          <ProtectedRoute>
            <AdminTopupRequests />
          </ProtectedRoute>
        } />
        <Route path="/admin/user-rewards" element={
          <ProtectedRoute>
            <AdminUserRewards />
          </ProtectedRoute>
        } />
        <Route path="/admin/withdraw-requests" element={
          <ProtectedRoute>
            <AdminWithdrawRequests />
          </ProtectedRoute>
        } />
        <Route path="/admin/tier-requests" element={
          <ProtectedRoute>
            <AdminTierRequests />
          </ProtectedRoute>
        } />
        <Route path="/admin/registration-requests" element={
          <ProtectedRoute>
            <AdminRegistrationRequests />
          </ProtectedRoute>
        } />
        <Route path="/admin/wallet-verifications" element={
          <ProtectedRoute>
            <AdminWalletVerifications />
          </ProtectedRoute>
        } />
        <Route path="/admin/level-management" element={
          <ProtectedRoute>
            <AdminLevelManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/network-rewards" element={
          <ProtectedRoute>
            <AdminNetworkRewards />
          </ProtectedRoute>
        } />
            <Route path="/admin/tier-management" element={
              <ProtectedRoute>
                <AdminTierManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/conversion-rates" element={
              <ProtectedRoute>
                <AdminConversionRates />
              </ProtectedRoute>
            } />
            <Route path="/admin/global-settings" element={
              <ProtectedRoute>
                <AdminGlobalSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/user-impersonation" element={
              <ProtectedRoute>
                <AdminUserImpersonation />
              </ProtectedRoute>
            } />
            {SHOW_ADDITIONAL_VERIFICATION_UI && (
              <Route path="/admin/additional-verification" element={
                <ProtectedRoute>
                  <AdminAdditionalVerification />
                </ProtectedRoute>
              } />
            )}
      </Routes>
    </AuthProvider>
  )
}

export default App
