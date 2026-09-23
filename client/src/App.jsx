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

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/register"
        element={<RegisterPage />}
      />

      <Route
        path="/verify-email"
        element={<VerifyEmailPage />}
      />

      <Route
        path="/onboarding"
        element={<OnboardingPage />}
      />

      <Route
        path="/home"
        element={<HomePage />}
      />

      <Route
        path="/academic"
        element={<AcademicPage />}
      />

      <Route
        path="/community"
        element={<CommunityPage />}
      />

      <Route
        path="/campus"
        element={<CampusPage />}
      />

      <Route
        path="/calendar"
        element={<CalendarPage />}
      />

      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  );
}

export default App;