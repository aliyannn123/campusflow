import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./features/auth/AuthProvider.jsx";
import App from "./App.jsx";
import "./index.css";
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } });
createRoot(document.getElementById("root")).render(
  <StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></QueryClientProvider></StrictMode>
);

document.documentElement.dataset.theme = localStorage.getItem("campusflow-theme") || "light";
