import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import LoginPage from "./pages/LoginPage";
import LobbyPage from "./pages/LobbyPage";
import RoomPage from "./pages/RoomPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/lobby" replace /> : <LoginPage />} />
      <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
      <Route path="/room/:id" element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Bridges AuthContext → SocketProvider so the socket token stays in sync
function AppWithSocket() {
  const { user } = useAuth();
  return (
    <SocketProvider token={user?.token ?? null}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SocketProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppWithSocket />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
