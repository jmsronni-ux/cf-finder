import React from "react";
import { Route, Routes } from 'react-router-dom'
import './utils/clearUserCache.js'
import HomePage from './pages/HomePage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from "./pages/Dashboard";
import UserProfile from "./pages/UserProfile";
import AdminTopupRequests from "./pages/AdminTopupRequests";
import AdminUserRewards from "./pages/AdminUserRewards";
import AdminWithdrawRequests from "./pages/AdminWithdrawRequests";
import AdminTierRequests from "./pages/AdminTierRequests";
import AdminLevelManagement from "./pages/AdminLevelManagement";
import AdminNetworkRewards from "./pages/AdminNetworkRewards";
import AdminRewardAnalytics from "./pages/AdminRewardAnalytics";
import AdminTierManagement from "./pages/AdminTierManagement";
import AdminDashboard from "./pages/AdminDashboard";
import UserTransactions from "./pages/UserTransactions";
import ProtectedRoute from "./components/helpers/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

function App() {

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<RegisterPage />} />
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
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
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
            <Route path="/admin/reward-analytics" element={
              <ProtectedRoute>
                <AdminRewardAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/admin/tier-management" element={
              <ProtectedRoute>
                <AdminTierManagement />
              </ProtectedRoute>
            } />
      </Routes>
    </AuthProvider>
  )
}

export default App
