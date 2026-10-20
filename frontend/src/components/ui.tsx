import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TableHTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ChevronDown, Inbox, Info, Loader2, X } from "lucide-react";

export const vizHues = [
  "var(--color-viz-1)",
  "var(--color-viz-2)",
  "var(--color-viz-3)",
  "var(--color-viz-4)",
  "var(--color-viz-5)",
  "var(--color-viz-6)",
  "var(--color-viz-7)",
  "var(--color-viz-8)",
];

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className,
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cx(
        "bg-surface border border-border rounded-2xl shadow-[var(--shadow-xs)] transition-shadow",
        hover && "hover:shadow-[var(--shadow-md)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Card with a titled header row (title, optional description and actions) and a body. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  flush,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** No body padding - for tables/lists that run edge to edge. */
  flush?: boolean;
}) {
  const hasHeader = Boolean(title || actions);
  return (
    <Card className={cx("overflow-hidden", className)}>
      {hasHeader && (
        <div className={cx("flex flex-wrap items-center justify-between gap-3 px-5 pt-4", flush ? "pb-4 border-b border-border" : "pb-3")}>
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-semibold text-ink">{title}</h3>}
            {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cx(flush ? "" : hasHeader ? "px-5 pb-5" : "p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 mb-6">
      <div className="min-w-0">
        {eyebrow && <div className="text-xs font-medium text-accent mb-1">{eyebrow}</div>}
        <h1 className="text-[22px] sm:text-2xl font-semibold text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-muted mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
      <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">{children}</h2>
      {actions}
    </div>
  );
}

export function Banner({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "warning" | "critical" | "good";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-accent-soft text-accent",
    warning: "bg-warning-soft text-warning",
    critical: "bg-critical-soft text-critical",
    good: "bg-good-soft text-good",
  };
  const Icon = tone === "info" || tone === "good" ? Info : AlertTriangle;
  return (
    <div className={cx("flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm", tones[tone], className)} role={tone === "critical" ? "alert" : "status"}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "danger-solid";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  const variants = {
    primary: "bg-accent text-white shadow-[var(--shadow-xs)] hover:bg-accent-dark disabled:opacity-50",
    secondary: "bg-surface border border-border text-ink hover:bg-page hover:border-border-strong disabled:opacity-50",
    ghost: "text-ink-secondary hover:bg-page hover:text-ink disabled:opacity-50",
    danger: "text-critical hover:bg-critical-soft disabled:opacity-50",
    "danger-solid": "bg-critical text-white hover:opacity-90 disabled:opacity-50",
  };
  const sizes = {
    sm: "h-8 px-2.5 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-11 px-5 text-sm gap-2",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center rounded-xl font-medium whitespace-nowrap transition-all active:scale-[0.98] disabled:active:scale-100 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={14} />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex items-center justify-center w-9 h-9 rounded-xl text-ink-secondary hover:bg-page hover:text-ink transition-colors disabled:opacity-40",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const fieldBase =
  "h-10 w-full border border-border bg-surface rounded-xl px-3 text-sm text-ink placeholder:text-ink-muted transition-colors hover:border-border-strong focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent disabled:opacity-60";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(fieldBase, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(fieldBase, "pr-8 cursor-pointer", className)} {...props} />;
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-ink-secondary mb-1.5">
      {children}
    </label>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("min-w-0", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-ink-muted mt-1">{hint}</p>}
    </div>
  );
}

/** Form grid: fields stack on phones, flow into columns on wider screens. */
export function FormGrid({ children, cols = 4, className }: { children: ReactNode; cols?: 2 | 3 | 4 | 5; className?: string }) {
  const map = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-5",
  };
  return <div className={cx("grid grid-cols-1 gap-3 items-end", map[cols], className)}>{children}</div>;
}

/** Pill chips for quick picks (presets, partners). */
export function Chip({
  active,
  onClick,
  children,
  dot,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex items-center h-8 px-3 rounded-full text-xs font-medium border transition-colors",
        active ? "bg-accent-soft text-accent border-accent/40" : "bg-surface text-ink-secondary border-border hover:bg-page hover:text-ink"
      )}
    >
      {dot && <span className="w-2 h-2 rounded-sm mr-1.5 shrink-0" style={{ background: dot }} />}
      {children}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: ReactNode }>;
  className?: string;
}) {
  return (
    <div role="tablist" className={cx("inline-flex items-center gap-0.5 bg-page border border-border rounded-xl p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-8 px-3 rounded-[10px] text-sm font-medium transition-colors",
            value === o.value ? "bg-surface text-ink shadow-[var(--shadow-xs)]" : "text-ink-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cx("inline-flex items-center gap-2.5", disabled ? "opacity-50" : "cursor-pointer")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx("relative w-9 h-5 rounded-full transition-colors shrink-0", checked ? "bg-accent" : "bg-border-strong")}
      >
        <span className={cx("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", checked && "translate-x-4")} />
      </button>
      {label && <span className="text-sm text-ink-secondary">{label}</span>}
    </label>
  );
}

/** Small dropdown menu (e.g. "Export"). Closes on outside click or Escape. */
export function Menu({
  label,
  icon: Icon,
  items,
  align = "right",
  variant = "secondary",
}: {
  label: string;
  icon?: LucideIcon;
  items: Array<{ label: string; icon?: LucideIcon; onClick: () => void; disabled?: boolean }>;
  align?: "left" | "right";
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <Button variant={variant} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        {Icon && <Icon size={15} />}
        {label}
        <ChevronDown size={14} className={cx("transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <div
          role="menu"
          className={cx(
            "animate-fade-in absolute z-30 mt-1.5 min-w-48 bg-surface border border-border rounded-xl shadow-[var(--shadow-lg)] p-1",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-ink hover:bg-page text-left disabled:opacity-50"
              >
                {ItemIcon && <ItemIcon size={15} className="text-ink-muted" />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Display                                                             */
/* ------------------------------------------------------------------ */

export function Badge({
  children,
  tone = "neutral",
  dot,
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warning" | "critical" | "accent";
  dot?: string;
}) {
  const tones = {
    neutral: "bg-page text-ink-secondary border-border",
    good: "bg-good-soft text-good border-transparent",
    warning: "bg-warning-soft text-warning border-transparent",
    critical: "bg-critical-soft text-critical border-transparent",
    accent: "bg-accent-soft text-accent border-transparent",
  };
  return (
    <span className={cx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap", tones[tone])}>
      {dot && <span className="w-2 h-2 rounded-sm mr-1.5 shrink-0" style={{ background: dot }} />}
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
  icon: Icon,
  hue,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  tone?: "neutral" | "good" | "critical";
  icon?: LucideIcon;
  hue?: string;
}) {
  const valueTone = tone === "good" ? "text-good" : tone === "critical" ? "text-critical" : "text-ink";
  const chip = hue ?? "var(--color-accent)";
  return (
    <Card hover className="p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="text-xs font-medium text-ink-muted leading-snug">{label}</div>
        {Icon && (
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `color-mix(in srgb, ${chip} 14%, transparent)`, color: chip }}
          >
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className={cx("text-xl sm:text-2xl font-semibold tabular tracking-tight", valueTone)}>{value}</div>
      {sub && <div className="text-xs text-ink-muted mt-1">{sub}</div>}
    </Card>
  );
}

/**
 * Horizontal bar list: sorted-descending comparison of one measure across
 * categories. Single hue throughout - color isn't encoding anything extra
 * here, bar length already carries the magnitude. Track is a faint step of
 * the same hue (meter pattern), not a neutral gray, so state reads as one bar.
 */
export function BarList({
  data,
  formatValue,
  hue = "var(--color-accent)",
}: {
  data: Array<{ label: string; value: number }>;
  formatValue: (v: number) => string;
  hue?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (!data.length) {
    return <p className="text-sm text-ink-muted py-6 text-center">No data for this month yet.</p>;
  }
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <div className="w-28 shrink-0 text-sm text-ink-secondary truncate" title={d.label}>
            {d.label}
          </div>
          <div
            className="flex-1 h-3 rounded-full overflow-hidden"
            style={{ background: `color-mix(in srgb, ${hue} 14%, transparent)` }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max((d.value / max) * 100, 2)}%`, background: hue }}
            />
          </div>
          <div className="w-24 shrink-0 text-right text-sm tabular font-medium text-ink">
            {formatValue(d.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Single-series trend line (month-over-month growth). One hue, 2px line,
 * light fill under the line in the same hue, recessive baseline, dots with
 * native-tooltip hover, selective direct labels on the first/last point only
 * (never a number on every point). No legend - a single series is named by
 * the chart title, not a color key.
 */
export function LineChart({
  data,
  formatValue,
  hue = "var(--color-accent)",
}: {
  data: Array<{ label: string; value: number }>;
  formatValue: (v: number) => string;
  hue?: string;
}) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-ink-muted py-10 text-center">
        Need at least 2 months of data to show a trend.
      </p>
    );
  }

  const width = 600;
  const height = 220;
  const padding = { top: 24, right: 16, bottom: 28, left: 16 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);

  const points = data.map((d, i) => ({
    x: padding.left + (data.length === 1 ? 0 : (i / (data.length - 1)) * plotW),
    y: padding.top + plotH - (d.value / max) * plotH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const baseline = padding.top + plotH;
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baseline} L ${points[0].x.toFixed(1)} ${baseline} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <line
        x1={padding.left}
        y1={baseline}
        x2={width - padding.right}
        y2={baseline}
        stroke="var(--color-border)"
        strokeWidth={1}
      />
      <path d={areaPath} fill={hue} fillOpacity={0.12} stroke="none" />
      <path d={linePath} fill="none" stroke={hue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={hue}>
          <title>
            {p.label}: {formatValue(p.value)}
          </title>
        </circle>
      ))}
      {[points[0], points[points.length - 1]].map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={Math.max(p.y - 10, 12)}
          textAnchor={i === 0 ? "start" : "end"}
          fontSize={12}
          fontWeight={600}
          fill="var(--color-ink)"
        >
          {formatValue(p.value)}
        </text>
      ))}
      {points.map((p, i) => (
        <text
          key={`x-${i}`}
          x={p.x}
          y={height - 8}
          textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
          fontSize={10}
          fill="var(--color-ink-muted)"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

/**
 * Month-by-month column chart. Works from a single month (unlike LineChart).
 * One hue; the latest month is solid and earlier months are a lighter step of
 * the same hue so "now" stands out. Value labels sit on top of each column
 * (dropped to latest-only when crowded), with native-tooltip hover on every bar.
 * Shows the change versus the previous month above the plot.
 */
export function BarChart({
  data,
  formatValue,
  hue = "var(--color-accent)",
}: {
  data: Array<{ label: string; value: number }>;
  formatValue: (v: number) => string;
  hue?: string;
}) {
  if (!data.length) {
    return <p className="text-sm text-ink-muted py-10 text-center">No data yet.</p>;
  }

  const width = 600;
  const height = 230;
  const padding = { top: 26, right: 8, bottom: 28, left: 8 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = plotW / data.length;
  const barW = Math.min(slot * 0.62, 56);
  const baseline = padding.top + plotH;
  const crowded = data.length > 8;

  const last = data[data.length - 1];
  const prev = data.length > 1 ? data[data.length - 2] : null;
  const delta = prev ? last.value - prev.value : null;

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xl font-semibold tabular text-ink">{formatValue(last.value)}</span>
        <span className="text-xs text-ink-muted">{last.label}</span>
        {delta !== null && (
          <span
            className={cx(
              "ml-auto text-xs font-medium tabular px-1.5 py-0.5 rounded-md",
              delta > 0 ? "bg-good-soft text-good" : delta < 0 ? "bg-critical-soft text-critical" : "bg-page text-ink-muted"
            )}
          >
            {delta > 0 ? "▲ +" : delta < 0 ? "▼ −" : ""}
            {formatValue(Math.abs(delta))} vs {prev!.label}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <line x1={padding.left} y1={baseline} x2={width - padding.right} y2={baseline} stroke="var(--color-border)" strokeWidth={1} />
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * plotH, d.value > 0 ? 2 : 0);
          const x = padding.left + slot * i + (slot - barW) / 2;
          const y = baseline - h;
          const isLast = i === data.length - 1;
          return (
            <g key={`${d.label}-${i}`}>
              <rect x={x} y={y} width={barW} height={h} rx={4} fill={hue} fillOpacity={isLast ? 1 : 0.45}>
                <title>
                  {d.label}: {formatValue(d.value)}
                </title>
              </rect>
              {(!crowded || isLast) && (
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--color-ink)">
                  {formatValue(d.value)}
                </text>
              )}
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize={10} fill="var(--color-ink-muted)">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon: Icon = Inbox,
  action,
  bare,
}: {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  bare?: boolean;
}) {
  const body = (
    <div className="text-center px-6 py-10">
      <div className="w-12 h-12 rounded-2xl bg-accent-soft flex items-center justify-center mx-auto mb-3 text-accent">
        <Icon size={22} />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="text-sm text-ink-muted mt-1 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
  return bare ? body : <Card>{body}</Card>;
}

export function Modal({
  title,
  description,
  onClose,
  children,
  size = "sm",
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md";
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cx(
          "animate-fade-in relative w-full bg-surface border border-border shadow-[var(--shadow-lg)] p-6 rounded-t-2xl sm:rounded-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          size === "sm" ? "sm:max-w-sm" : "sm:max-w-lg"
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {description && <div className="text-sm text-ink-muted mt-1">{description}</div>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Promise-based confirm dialog. Usage:
 *   const [confirmUi, confirm] = useConfirm();
 *   if (await confirm({ title: "Delete?" })) { ... }
 *   return <>{confirmUi} ...</>
 */
export function useConfirm() {
  const [state, setState] = useState<{
    title: string;
    message?: ReactNode;
    confirmLabel?: string;
    tone?: "danger" | "primary";
    resolve: (ok: boolean) => void;
  } | null>(null);

  function confirm(opts: { title: string; message?: ReactNode; confirmLabel?: string; tone?: "danger" | "primary" }) {
    return new Promise<boolean>((resolve) => setState({ ...opts, resolve }));
  }

  function close(ok: boolean) {
    state?.resolve(ok);
    setState(null);
  }

  const ui = state ? (
    <Modal title={state.title} description={state.message} onClose={() => close(false)}>
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <Button variant="secondary" onClick={() => close(false)}>
          Cancel
        </Button>
        <Button variant={state.tone === "primary" ? "primary" : "danger-solid"} onClick={() => close(true)} autoFocus>
          {state.confirmLabel ?? "Delete"}
        </Button>
      </div>
    </Modal>
  ) : null;

  return [ui, confirm] as const;
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-muted py-16 justify-center">
      <Loader2 className="animate-spin" size={16} />
      {label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cx("w-full text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-surface-2", className)} {...props} />
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-2 text-ink-muted text-[11px] uppercase tracking-wider">{children}</thead>;
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cx("text-left px-4 py-3 font-semibold whitespace-nowrap border-b border-border", className)} {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx("px-4 py-3 border-t border-border", className)} {...props} />;
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  /** Hide this column in the phone card view. */
  hideOnMobile?: boolean;
  /** Use as the card's title on phones (first such column). */
  primary?: boolean;
  className?: string;
}

/**
 * Responsive data list: a table on tablets/desktop, stacked cards on phones.
 * `footer` renders as a totals row (table) / totals card (phone).
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  actions,
  empty,
  footer,
  rowClassName,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  actions?: (row: T) => ReactNode;
  empty?: ReactNode;
  footer?: Array<{ key: string; value: ReactNode }>;
  rowClassName?: (row: T) => string | undefined;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);
  const footerFor = (key: string) => footer?.find((f) => f.key === key)?.value;
  const hasFooterValue = (key: string) => {
    const v = footerFor(key);
    return v !== undefined && v !== null && v !== "";
  };

  return (
    <>
      {/* Tablet / desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-ink-muted text-[11px] uppercase tracking-wider">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cx("px-4 py-3 font-semibold whitespace-nowrap border-b border-border", c.align === "right" ? "text-right" : "text-left")}>
                  {c.header}
                </th>
              ))}
              {actions && <th className="px-4 py-3 border-b border-border" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={rowKey(row)} className={cx("transition-colors hover:bg-surface-2", rowClassName?.(row))}>
                {columns.map((c) => (
                  <td key={c.key} className={cx("px-4 py-3", i > 0 && "border-t border-border", c.align === "right" && "text-right tabular", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
                {actions && <td className={cx("px-4 py-2 text-right whitespace-nowrap", i > 0 && "border-t border-border")}>{actions(row)}</td>}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-10 text-center text-sm text-ink-muted">
                  {empty ?? "Nothing here yet."}
                </td>
              </tr>
            )}
          </tbody>
          {footer && rows.length > 0 && (
            <tfoot>
              <tr className="bg-surface-2 font-semibold border-t border-border">
                {columns.map((c) => (
                  <td key={c.key} className={cx("px-4 py-3", c.align === "right" && "text-right tabular")}>
                    {footerFor(c.key)}
                  </td>
                ))}
                {actions && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Phone */}
      <ul className="md:hidden divide-y divide-border">
        {rows.map((row) => (
          <li key={rowKey(row)} className={cx("px-4 py-3", rowClassName?.(row))}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 font-medium text-ink">{primary.cell(row)}</div>
              {actions && <div className="shrink-0 -mr-2 -mt-1 flex items-center">{actions(row)}</div>}
            </div>
            {rest.length > 0 && (
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {rest.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{c.header}</dt>
                    <dd className={cx("text-ink truncate", c.align === "right" && "tabular")}>{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
        {!rows.length && <li className="px-4 py-10 text-center text-sm text-ink-muted">{empty ?? "Nothing here yet."}</li>}
        {footer && rows.length > 0 && (
          <li className="px-4 py-3 bg-surface-2">
            <div className="font-semibold text-ink mb-1.5">{footerFor(primary.key) ?? "Total"}</div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {rest.filter((c) => hasFooterValue(c.key)).map((c) => (
                <div key={c.key}>
                  <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{c.header}</dt>
                  <dd className="font-semibold tabular text-ink">{footerFor(c.key)}</dd>
                </div>
              ))}
            </dl>
          </li>
        )}
      </ul>
    </>
  );
}
