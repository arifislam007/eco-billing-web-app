import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
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
  X,
  UserCog,
  KeyRound,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useAuth, type AuthUser } from "../context/AuthContext";
import { useMonth } from "../context/MonthContext";
import { useTheme, type ThemePref } from "../lib/theme";
import { Banner, cx, IconButton } from "./ui";
import ChangePasswordModal from "./ChangePasswordModal";
import logo from "../assets/eco-logo.jpg";

type NavItem = {
  to: string;
  label: string;
  short?: string;
  icon: typeof LayoutDashboard;
  roles?: Array<AuthUser["role"]>;
};

const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Overview",
    items: [
      { to: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard, roles: ["admin"] },
      // Shown to both roles - staff access is gated server-side by an
      // admin-controlled toggle, not by role; the page explains it if it's off.
      { to: "/reports", label: "Monthly Report", short: "Report", icon: ClipboardList },
    ],
  },
  {
    title: "Daily work",
    items: [
      { to: "/entries", label: "Monthly Entry", short: "Entry", icon: Table2 },
      { to: "/deposits", label: "Deposits", icon: PiggyBank, roles: ["admin"] },
      { to: "/costs", label: "Costs", icon: Receipt, roles: ["admin"] },
      { to: "/transactions", label: "Transactions", icon: ArrowLeftRight, roles: ["admin"] },
      { to: "/vouchers", label: "Vouchers", icon: FileText },
    ],
  },
  {
    title: "Setup",
    items: [
      { to: "/months", label: "Months", icon: CalendarRange, roles: ["admin"] },
      { to: "/partners", label: "Partners", icon: Users, roles: ["admin"] },
      { to: "/users", label: "Users", icon: UserCog, roles: ["admin"] },
    ],
  },
];

// Bottom tab bar on phones: the most-used screens per role, everything else under "More".
const mobileTabs: Record<AuthUser["role"], string[]> = {
  admin: ["/", "/entries", "/deposits", "/vouchers"],
  staff: ["/entries", "/vouchers", "/reports"],
};

function allowed(item: NavItem, user: AuthUser | null) {
  return !item.roles || (user != null && item.roles.includes(user.role));
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { selectedMonth } = useMonth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const groups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => allowed(i, user)) }))
    .filter((g) => g.items.length);
  const flat = groups.flatMap((g) => g.items);
  const tabs = (user ? mobileTabs[user.role] : [])
    .map((to) => flat.find((i) => i.to === to))
    .filter((i): i is NavItem => Boolean(i));

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 h-16 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 p-0.5 ring-1 ring-border">
          <img src={logo} alt="" className="w-full h-full object-contain" />
        </div>
        <div className="leading-tight">
          <div className="text-ink font-semibold tracking-tight">Econet</div>
          <div className="text-[11px] text-ink-muted">ISP Accounting</div>
        </div>
        <IconButton label="Close menu" className="ml-auto lg:hidden" onClick={() => setDrawerOpen(false)}>
          <X size={18} />
        </IconButton>
      </div>

      <nav className="flex-1 px-3 pb-4 overflow-y-auto" aria-label="Main">
        {groups.map((g) => (
          <div key={g.title} className="mt-4 first:mt-1">
            <div className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{g.title}</div>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      cx(
                        "group flex items-center gap-3 h-9 px-3 rounded-xl text-sm font-medium transition-colors",
                        isActive ? "bg-accent-soft text-accent" : "text-ink-secondary hover:text-ink hover:bg-page"
                      )
                    }
                  >
                    <Icon size={17} className="shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border shrink-0">
        <AccountMenu user={user} onChangePassword={() => setChangePasswordOpen(true)} onLogout={logout} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-page">
      {/* Desktop sidebar */}
      <aside className="no-print hidden lg:block fixed inset-y-0 left-0 z-30 w-64 bg-surface border-r border-border">{sidebar}</aside>

      {/* Phone / tablet drawer */}
      {drawerOpen && (
        <div className="no-print lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="animate-fade-in absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-[var(--shadow-lg)]">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="no-print sticky top-0 z-20 bg-surface/85 backdrop-blur-md border-b border-border">
          <div className="h-14 lg:h-16 flex items-center gap-2 px-3 sm:px-4 lg:px-8">
            <div className="lg:hidden flex items-center gap-2 mr-1">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden p-0.5 ring-1 ring-border">
                <img src={logo} alt="Econet" className="w-full h-full object-contain" />
              </div>
            </div>
            <MonthSwitcher />
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-8 pb-28 lg:pb-10">
          {selectedMonth?.status === "closed" && (
            <Banner tone="warning" className="no-print mb-5">
              <span className="font-medium">{selectedMonth.label} is closed.</span> Double-check before changing anything — you can
              reopen it from Months.
            </Banner>
          )}
          <Outlet />
        </main>
      </div>

      {/* Phone bottom tab bar */}
      <nav
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]"
        aria-label="Quick"
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cx("flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-medium", isActive ? "text-accent" : "text-ink-muted")
                }
              >
                <Icon size={20} />
                {item.short ?? item.label}
              </NavLink>
            );
          })}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-medium text-ink-muted"
          >
            <MoreHorizontal size={20} />
            More
          </button>
        </div>
      </nav>

      {changePasswordOpen && <ChangePasswordModal onClose={() => setChangePasswordOpen(false)} />}
    </div>
  );
}

/** Month picker with older/newer arrows; the list comes back newest first. */
function MonthSwitcher() {
  const { months, selectedMonth, setSelectedMonthId } = useMonth();
  if (!months.length) return <span className="text-sm text-ink-muted">No months yet</span>;
  const idx = months.findIndex((m) => m.id === selectedMonth?.id);
  const older = idx >= 0 ? months[idx + 1] : undefined;
  const newer = idx > 0 ? months[idx - 1] : undefined;

  return (
    <div className="flex items-center gap-0.5 bg-page border border-border rounded-xl p-0.5">
      <IconButton label={older ? `Previous month (${older.label})` : "No older month"} disabled={!older} onClick={() => older && setSelectedMonthId(older.id)} className="w-8 h-8">
        <ChevronLeft size={16} />
      </IconButton>
      <div className="relative">
        <span
          className={cx(
            "absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none",
            selectedMonth?.status === "open" ? "bg-good" : "bg-ink-muted"
          )}
        />
        <select
          aria-label="Select month"
          value={selectedMonth?.id ?? ""}
          onChange={(e) => setSelectedMonthId(e.target.value)}
          className="appearance-none h-8 pl-6 pr-7 rounded-lg bg-surface text-sm font-semibold text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/30 shadow-[var(--shadow-xs)]"
        >
          {months.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} {m.status === "closed" ? "(closed)" : ""}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
      </div>
      <IconButton label={newer ? `Next month (${newer.label})` : "No newer month"} disabled={!newer} onClick={() => newer && setSelectedMonthId(newer.id)} className="w-8 h-8">
        <ChevronRight size={16} />
      </IconButton>
    </div>
  );
}

function ThemeToggle() {
  const [pref, setPref] = useTheme();
  const order: ThemePref[] = ["light", "dark", "system"];
  const next = order[(order.indexOf(pref) + 1) % order.length];
  const Icon = pref === "light" ? Sun : pref === "dark" ? Moon : Monitor;
  const name = { light: "Light", dark: "Dark", system: "Device" }[pref];
  return (
    <IconButton label={`Theme: ${name} (switch to ${next})`} onClick={() => setPref(next)}>
      <Icon size={18} />
    </IconButton>
  );
}

function AccountMenu({
  user,
  onChangePassword,
  onLogout,
}: {
  user: AuthUser | null;
  onChangePassword: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {open && (
        <div className="animate-fade-in absolute bottom-full mb-2 inset-x-0 bg-surface border border-border rounded-xl shadow-[var(--shadow-lg)] p-1">
          <button
            onClick={() => {
              setOpen(false);
              onChangePassword();
            }}
            className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-ink hover:bg-page"
          >
            <KeyRound size={15} className="text-ink-muted" />
            Change password
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-critical hover:bg-critical-soft">
            <LogOut size={15} />
            Log out
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-page transition-colors text-left"
      >
        <span className="w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center text-sm font-semibold shrink-0">
          {user?.email?.[0]?.toUpperCase() ?? "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink truncate">{user?.email}</span>
          <span className="block text-[11px] text-ink-muted capitalize">{user?.role}</span>
        </span>
        <ChevronDown size={15} className={cx("text-ink-muted transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}
