import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarRange,
  Users,
  Table2,
  PiggyBank,
  Receipt,
  ArrowLeftRight,
  FileText,
  LogOut,
  Menu,
  X,
  UserCog,
  KeyRound,
  ClipboardList,
} from "lucide-react";
import { useAuth, type AuthUser } from "../context/AuthContext";
import { useMonth } from "../context/MonthContext";
import { Select } from "./ui";
import ChangePasswordModal from "./ChangePasswordModal";
import logo from "../assets/eco-logo.jpg";

const navItems: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Array<AuthUser["role"]>;
}> = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/months", label: "Months", icon: CalendarRange, roles: ["admin"] },
  { to: "/partners", label: "Partners", icon: Users, roles: ["admin"] },
  { to: "/entries", label: "Monthly Entry", icon: Table2 },
  { to: "/deposits", label: "Deposits", icon: PiggyBank, roles: ["admin"] },
  { to: "/costs", label: "Costs", icon: Receipt, roles: ["admin"] },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight, roles: ["admin"] },
  { to: "/vouchers", label: "Vouchers", icon: FileText },
  { to: "/reports", label: "Monthly Report", icon: ClipboardList, roles: ["admin"] },
  { to: "/users", label: "Users", icon: UserCog, roles: ["admin"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { months, selectedMonth, setSelectedMonthId } = useMonth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  return (
    <div className="min-h-screen bg-page flex">
      {/* Sidebar */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-30 w-60 bg-gradient-to-b from-sidebar to-sidebar-to text-violet-200 flex flex-col transform transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-5 h-16 border-b border-white/15">
          <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0 p-0.5">
            <img src={logo} alt="Econet" className="w-full h-full object-contain" />
          </div>
          <span className="text-white font-semibold text-lg">Econet</span>
          <button className="ml-auto lg:hidden text-violet-200" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => !item.roles || (user && item.roles.includes(user.role)))
            .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-violet-200 hover:text-white hover:bg-white/10"
                  }`
                }
              >
                <Icon size={17} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-white/15">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-violet-200 hover:text-white hover:bg-white/10"
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        <header className="no-print sticky top-0 z-10 h-16 bg-surface border-b border-border flex items-center gap-4 px-4 lg:px-8">
          <button className="lg:hidden text-ink-secondary" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted hidden sm:inline">Month</span>
            <Select
              value={selectedMonth?.id ?? ""}
              onChange={(e) => setSelectedMonthId(e.target.value)}
            >
              {months.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.status})
                </option>
              ))}
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-3 relative">
            <span className="text-sm text-ink-secondary hidden sm:inline">{user?.email}</span>
            <button
              onClick={() => setAccountMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold"
            >
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </button>
            {accountMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAccountMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-20 w-48 bg-surface border border-border rounded-lg shadow-lg py-1">
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setChangePasswordOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-page text-left"
                  >
                    <KeyRound size={15} />
                    Change password
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {changePasswordOpen && (
        <ChangePasswordModal onClose={() => setChangePasswordOpen(false)} />
      )}
    </div>
  );
}
