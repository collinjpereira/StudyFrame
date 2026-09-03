import type { CSSProperties, ReactNode } from "react";

export function Kicker({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="kicker" style={style}>
      {children}
    </div>
  );
}

export function Spacer({ h }: { h: number }) {
  return <div style={{ height: h, flex: "none" }} />;
}

export function ProgressBar({
  pct,
  height = 2,
  fill = "var(--color-accent)",
}: {
  pct: number;
  height?: number;
  fill?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        height,
        background: "rgba(233,233,237,0.12)",
        borderRadius: height,
        overflow: "hidden",
      }}
    >
      <div style={{ height: "100%", background: fill, width: `${pct}%` }} />
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  size,
  danger,
  title,
  disabled,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  size?: "sm";
  danger?: boolean;
  title?: string;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const classes = ["btn", `btn-${variant}`];
  if (size === "sm") classes.push("btn-sm");
  if (danger) classes.push("btn-danger");
  return (
    <button
      type="button"
      className={classes.join(" ")}
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  size = 28,
  title,
  color,
  danger,
  ring,
  fontSize,
}: {
  children: ReactNode;
  onClick?: () => void;
  size?: number;
  title?: string;
  color?: string;
  danger?: boolean;
  ring?: boolean;
  fontSize?: number;
}) {
  const classes = ["icon-btn"];
  if (danger) classes.push("icon-btn-danger");
  if (ring) classes.push("icon-btn-ring");
  return (
    <button
      type="button"
      className={classes.join(" ")}
      onClick={onClick}
      title={title}
      style={{ width: size, height: size, color, fontSize: fontSize ?? Math.round(size * 0.5) }}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  fill,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  fill?: boolean;
}) {
  return (
    <div className="seg" style={fill ? { width: "100%" } : undefined}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`seg-opt${fill ? " seg-fill" : ""}`}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Hairlines are box-shadows, not borders, so they never take part in layout. */
export function Card({
  children,
  style,
  inset,
  padding = "16px 18px",
  radius = 11,
}: {
  children: ReactNode;
  style?: CSSProperties;
  inset?: boolean;
  padding?: string;
  radius?: number;
}) {
  return (
    <div
      style={{
        borderRadius: radius,
        padding,
        background: inset ? "var(--surface-inset)" : "var(--surface-card)",
        boxShadow: "var(--hairline)",
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Modal({
  width,
  onClose,
  children,
}: {
  width: number;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(9,10,16,0.68)",
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr)",
        placeItems: "center",
        zIndex: 60,
        padding: 24,
      }}
    >
      <div
        className="scroll"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `min(${width}px, 100%)`,
          minWidth: 0,
          maxHeight: "100%",
          overflowY: "auto",
          borderRadius: 14,
          padding: "26px 28px 22px",
          background: "var(--surface-card)",
          boxShadow: "var(--shadow-modal)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <h3 style={{ fontSize: 21, letterSpacing: "-0.015em" }}>{children}</h3>;
}

export function DialogIntro({ children }: { children: ReactNode }) {
  return (
    <p
      className="pretty"
      style={{
        margin: "9px 0 0",
        fontSize: 13,
        color: "rgba(233,233,237,0.55)",
        lineHeight: 1.6,
      }}
    >
      {children}
    </p>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        color: "var(--text-muted)",
        marginBottom: 7,
      }}
    >
      {children}
    </div>
  );
}

/** A screen heading: 28px, with an optional subline beneath. */
export function ScreenTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="min0">
      <h1 style={{ fontSize: 28, letterSpacing: "-0.02em" }}>{title}</h1>
      {sub ? (
        <div style={{ fontSize: 13, color: "rgba(233,233,237,0.48)", marginTop: 4 }}>{sub}</div>
      ) : null}
    </div>
  );
}

export function StatBlock({
  value,
  label,
  color,
  onClick,
}: {
  value: ReactNode;
  label: string;
  color?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="tnum" style={{ fontSize: 25, fontWeight: 500, color }}>
        {value}
      </div>
      <Kicker style={{ marginTop: 2 }}>{label}</Kicker>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} style={{ cursor: "pointer" }}>
      {body}
    </button>
  ) : (
    <div>{body}</div>
  );
}
