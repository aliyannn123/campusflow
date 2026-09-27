import { Navigate, Route, Routes } from "react-router";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import AcademicPage from "./pages/AcademicPage.jsx";
import CommunityPage from "./pages/CommunityPage.jsx";
import CampusPage from "./pages/CampusPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import ProtectedRoute from "./features/auth/ProtectedRoute.jsx";
import AppLayout from "./components/AppLayout.jsx";
import SpacePage from "./pages/SpacePage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import CampusListPage from "./pages/CampusListPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import PasswordResetPage from "./pages/PasswordResetPage.jsx";
import { useAuth, landingPath } from "./features/auth/useAuth.js";
function PendingApproval() {
  const { user, logout } = useAuth();
  if (user.accountStatus === "ACTIVE") return <Navigate to={landingPath(user)} replace />;
  return <main className="auth-card"><h1>Awaiting approval</h1><p>Your email is verified. A college administrator must approve your faculty account before you can enter campus spaces.</p><button onClick={() => window.location.reload()}>Check status</button><button onClick={logout}>Log out</button></main>;
}
export default function App() {
  return <Routes>
    <Route path="/" element={<Navigate to="/home" replace />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/verify-email" element={<VerifyEmailPage />} />
    <Route path="/forgot-password" element={<PasswordResetPage />} />
    <Route path="/reset-password" element={<PasswordResetPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      <Route element={<ProtectedRoute active />}>
        <Route element={<AppLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/academic" element={<AcademicPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/campus" element={<CampusPage />} />
          <Route path="/campus/:category" element={<CampusListPage />} />
          <Route path="/admin/:section?" element={<AdminPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/spaces/:spaceId/:tab?" element={<SpacePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
