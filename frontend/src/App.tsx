import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth, type AuthUser } from "./context/AuthContext";
import { MonthProvider } from "./context/MonthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Months from "./pages/Months";
import Partners from "./pages/Partners";
import Entries from "./pages/Entries";
import Deposits from "./pages/Deposits";
import Costs from "./pages/Costs";
import Transactions from "./pages/Transactions";
import Vouchers from "./pages/Vouchers";
import Users from "./pages/Users";
import MonthlyReport from "./pages/MonthlyReport";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({
  roles,
  children,
}: {
  roles: Array<AuthUser["role"]>;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/entries" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <MonthProvider>
              <Layout />
            </MonthProvider>
          </RequireAuth>
        }
      >
        <Route
          path="/"
          element={
            <RequireRole roles={["admin"]}>
              <Dashboard />
            </RequireRole>
          }
        />
        <Route
          path="/months"
          element={
            <RequireRole roles={["admin"]}>
              <Months />
            </RequireRole>
          }
        />
        <Route
          path="/partners"
          element={
            <RequireRole roles={["admin"]}>
              <Partners />
            </RequireRole>
          }
        />
        <Route path="/entries" element={<Entries />} />
        <Route
          path="/deposits"
          element={
            <RequireRole roles={["admin"]}>
              <Deposits />
            </RequireRole>
          }
        />
        <Route
          path="/costs"
          element={
            <RequireRole roles={["admin"]}>
              <Costs />
            </RequireRole>
          }
        />
        <Route
          path="/transactions"
          element={
            <RequireRole roles={["admin"]}>
              <Transactions />
            </RequireRole>
          }
        />
        <Route path="/vouchers" element={<Vouchers />} />
        {/* Open to both roles - staff access is gated server-side by the
            admin-controlled toggle; the page shows a friendly message if
            it's off, rather than a hard route redirect. */}
        <Route path="/reports" element={<MonthlyReport />} />
        <Route
          path="/users"
          element={
            <RequireRole roles={["admin"]}>
              <Users />
            </RequireRole>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
