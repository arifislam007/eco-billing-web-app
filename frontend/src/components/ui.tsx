import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

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

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("bg-surface border border-border rounded-xl shadow-sm", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
}) {
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-dark disabled:opacity-50",
    secondary: "bg-surface border border-border text-ink hover:bg-page disabled:opacity-50",
    ghost: "text-ink-secondary hover:bg-page disabled:opacity-50",
    danger: "text-critical hover:bg-critical-soft disabled:opacity-50",
  };
  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-4 py-2 text-sm",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors",
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

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "border border-border bg-surface rounded-lg px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "border border-border bg-surface rounded-lg px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent",
        className
      )}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-medium text-ink-secondary mb-1">{children}</label>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
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
        className={cx(
          "relative w-9 h-5 rounded-full transition-colors shrink-0",
          checked ? "bg-accent" : "bg-border"
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-4"
          )}
        />
      </button>
      {label && <span className="text-sm text-ink-secondary">{label}</span>}
    </label>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warning" | "critical" | "accent";
}) {
  const tones = {
    neutral: "bg-page text-ink-secondary border-border",
    good: "bg-good-soft text-good border-transparent",
    warning: "bg-warning-soft text-warning border-transparent",
    critical: "bg-critical-soft text-critical border-transparent",
    accent: "bg-accent-soft text-accent border-transparent",
  };
  return (
    <span className={cx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", tones[tone])}>
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
  sub?: string;
  tone?: "neutral" | "good" | "critical";
  icon?: LucideIcon;
  hue?: string;
}) {
  const valueTone = tone === "good" ? "text-good" : tone === "critical" ? "text-critical" : "text-ink";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && (
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `color-mix(in srgb, ${hue} 16%, transparent)`, color: hue }}
          >
            <Icon size={15} />
          </span>
        )}
        <div className="text-xs font-medium text-ink-muted uppercase tracking-wide">{label}</div>
      </div>
      <div className={cx("text-2xl font-semibold tabular", valueTone)}>{value}</div>
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

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="p-10 text-center">
      <p className="text-sm font-medium text-ink-secondary">{title}</p>
      {hint && <p className="text-xs text-ink-muted mt-1">{hint}</p>}
    </Card>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">{title}</h2>
        {children}
      </Card>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-muted py-10 justify-center">
      <Loader2 className="animate-spin" size={16} />
      Loading...
    </div>
  );
}

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cx("w-full text-sm", className)} {...props} />;
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="bg-page text-ink-muted text-xs uppercase tracking-wide">{children}</thead>;
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cx("text-left px-4 py-2.5 font-medium", className)} {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx("px-4 py-2.5 border-t border-border", className)} {...props} />;
}
