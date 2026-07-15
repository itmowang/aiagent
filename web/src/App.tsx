import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./store/AuthContext";
import LoginPage from "./pages/Login";
import ChatPage from "./pages/Chat";
import AdminLayout from "./components/AdminLayout";
import DashboardPage from "./pages/admin/Dashboard";
import UsersPage from "./pages/admin/Users";
import UserDetailPage from "./pages/admin/UserDetail";
import ChatDefaultsPage from "./pages/admin/ChatDefaults";
import AgentMemoryPage from "./pages/admin/AgentMemory";
import RagPage from "./pages/admin/Rag";
import SkillsPage from "./pages/admin/Skills";
import ModelsPage from "./pages/admin/Models";
import McpPage from "./pages/admin/Mcp";
import type { JSX } from "react";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/chat" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/chat"
        element={
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="agent-memory" element={<AgentMemoryPage />} />
        <Route path="rag" element={<RagPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="mcp" element={<McpPage />} />
        <Route path="chat-defaults" element={<ChatDefaultsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:userId" element={<UserDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
