import { createContext, useContext } from "react";
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function landingPath(user) {
  if (!user.onboardingCompleted) return "/onboarding";
  if (user.accountStatus === "PENDING_APPROVAL") return "/pending-approval";
  return "/home";
}
