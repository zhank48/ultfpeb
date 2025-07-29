import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { VisitorProvider } from './contexts/VisitorContext.jsx';

import { SweetAlertProvider } from './components/SweetAlertProvider.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { LayoutCoreUILight } from './components/LayoutCoreUILight.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

import { LoginPage } from './pages/LoginPageStyled.jsx';
import { DashboardPageCoreUILight } from './pages/DashboardPageCoreUILight.jsx';
import { CheckInPageCoreUIModern } from './pages/CheckInPageCoreUIModern.jsx';
import { VisitorsPageCoreUILight } from './pages/VisitorsPageCoreUILight.jsx';
import { VisitorDetailPageCoreUILight } from './pages/VisitorDetailPageCoreUILight.jsx';
import { UserManagementPageFixed } from './pages/UserManagementPageFixed.jsx';
import { ExportReportsPageCoreUILight } from './pages/ExportReportsPageCoreUILight.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';

import { ConfigurationManagementPage } from './pages/ConfigurationManagementPage.jsx';
import { FeedbackManagementPage } from './pages/FeedbackManagementPage.jsx';
import { ComplaintManagementPageImproved } from './pages/ComplaintManagementPageImproved.jsx';
import { ComplaintFormPageImproved } from './pages/ComplaintFormPageImproved.jsx';
import { ComplaintStatisticsPage } from './pages/ComplaintStatisticsPage.jsx';
import { ComplaintFieldsConfigurationPage } from './pages/ComplaintFieldsConfigurationPage.jsx';
import { LostItemsManagementPage } from './pages/LostItemsManagementPage.jsx';
import { LostItemDataPage } from './pages/LostItemDataPage.jsx';
import { LostItemDetailPage } from './pages/LostItemDetailPage.jsx';
import VisitorDataManagementPage from './pages/VisitorDataManagementPage.jsx';
import VisitorDeletionRequestPage from './pages/VisitorDeletionRequestPage.jsx';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <VisitorProvider>
        <SweetAlertProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/complaint-form" element={<ComplaintFormPageImproved />} />
              
              {/* Protected routes */}
              <Route path="/app/*" element={
                <ProtectedRoute>
                  <LayoutCoreUILight>
                    <Routes>
                      <Route index element={<Navigate to="dashboard" replace />} />
                      <Route path="dashboard" element={
                        <ErrorBoundary>
                          <DashboardPageCoreUILight />
                        </ErrorBoundary>
                      } />
                      <Route path="check-in" element={<CheckInPageCoreUIModern />} />
                      <Route path="visitors" element={<VisitorsPageCoreUILight />} />
                      <Route path="visitors/:id" element={<VisitorDetailPageCoreUILight />} />
                      <Route path="user-management" element={
                        <ProtectedRoute requireAdmin={true}>
                          <UserManagementPageFixed />
                        </ProtectedRoute>
                      } />

                      {/* Individual management routes - Admin only */}
                      <Route path="configuration-management" element={
                        <ProtectedRoute requireAdmin={true}>
                          <ConfigurationManagementPage />
                        </ProtectedRoute>
                      } />
                      <Route path="feedback-management" element={
                        <FeedbackManagementPage />
                      } />
                      <Route path="complaint-management" element={
                        <ComplaintManagementPageImproved />
                      } />
                      <Route path="complaint-statistics" element={
                        <ProtectedRoute requireAdmin={true}>
                          <ComplaintStatisticsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="complaint-fields-config" element={
                        <ProtectedRoute requireAdmin={true}>
                          <ComplaintFieldsConfigurationPage />
                        </ProtectedRoute>
                      } />
                      <Route path="visitor-data-management" element={
                        <ProtectedRoute requireAdmin={true}>
                          <VisitorDataManagementPage />
                        </ProtectedRoute>
                      } />
                      <Route path="visitor-management" element={
                        <ProtectedRoute requiredRoles={['Admin', 'Manager']}>
                          <VisitorDeletionRequestPage />
                        </ProtectedRoute>
                      } />
                      {/* Backward compatibility routes - removed as no longer needed */}
                      <Route path="reports" element={<ExportReportsPageCoreUILight />} />
                      <Route path="lost-items" element={<LostItemsManagementPage />} />
                      <Route path="lost-items/data" element={<LostItemDataPage />} />
                      <Route path="lost-items/detail/:id" element={<LostItemDetailPage />} />
                      <Route path="profile" element={<ProfilePage />} />
                      <Route path="visitor-detail" element={
                        <ErrorBoundary>
                          <VisitorDetailPageCoreUILight />
                        </ErrorBoundary>
                      } />
                    </Routes>
                  </LayoutCoreUILight>
                </ProtectedRoute>
              } />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </SweetAlertProvider>
    </VisitorProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
