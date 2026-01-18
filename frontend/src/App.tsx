import React from "react";
import { Route, Routes, Navigate } from 'react-router-dom'
import './utils/clearUserCache.js'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import Dashboard from "./pages/Dashboard";
import UserProfile from "./pages/UserProfile";
import AdminTopupRequests from "./pages/admin/AdminTopupRequests";
import AdminWithdrawRequests from "./pages/admin/AdminWithdrawRequests";
import AdminTierRequests from "./pages/admin/AdminTierRequests";
import AdminRegistrationRequests from "./pages/admin/AdminRegistrationRequests";
import AdminLevelManagement from "./pages/admin/AdminLevelManagement";
import AdminNetworkRewards from "./pages/admin/AdminNetworkRewards";
import AdminConversionRates from "./pages/admin/AdminConversionRates";
import AdminGlobalSettings from "./pages/admin/AdminGlobalSettings";
import AdminWalletVerifications from "./pages/admin/AdminWalletVerifications";
import AdditionalVerification from "./pages/AdditionalVerification";
import AdminAdditionalVerification from "./pages/admin/AdminAdditionalVerification";
import { SHOW_ADDITIONAL_VERIFICATION_UI } from "./config/featureFlags";
import UserTransactions from "./pages/UserTransactions";
import ProtectedRoute from "./components/helpers/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "sonner";
import AdminUserPasswords from "./pages/admin/AdminUserPasswords";

function App() {

  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
          <Route path="/verification" element={
            <ProtectedRoute>
              <AdditionalVerification />
            </ProtectedRoute>
          } />
        )}
        <Route path="/admin/topup-requests" element={
          <ProtectedRoute>
            <AdminTopupRequests />
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
        {SHOW_ADDITIONAL_VERIFICATION_UI && (
          <Route path="/admin/additional-verification" element={
            <ProtectedRoute>
              <AdminAdditionalVerification />
            </ProtectedRoute>
          } />
        )}
        <Route path="/admin/user-passwords" element={
          <ProtectedRoute>
            <AdminUserPasswords />
          </ProtectedRoute>
        } />
        {/* Redirect old /admin/users route to /admin/user-passwords */}
        <Route path="/admin/users" element={
          <ProtectedRoute>
            <Navigate to="/admin/user-passwords" replace />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  )
}

export default App
