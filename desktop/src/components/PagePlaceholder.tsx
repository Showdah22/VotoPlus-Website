import { LucideIcon } from "lucide-react";
import { colors, radius } from "../theme";

export function PagePlaceholder({
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "60px auto 0",
        padding: 40,
        borderRadius: radius.xl,
        background: colors.bgGlass,
        border: `1px dashed ${colors.border}`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 22,
          margin: "0 auto 20px",
          background: "rgba(168,85,247,0.15)",
          border: `1px solid ${colors.purple}66`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={36} color={colors.purple} />
      </div>
      <h1 style={{ margin: "0 0 8px 0", fontSize: 26, fontWeight: 800, letterSpacing: -0.4 }}>
        {title}
      </h1>
      <p style={{ margin: 0, color: colors.textSub, fontSize: 14, lineHeight: 1.5 }}>
        {subtitle}
      </p>
      {badge && (
        <div
          style={{
            marginTop: 24,
            display: "inline-flex",
            padding: "6px 14px",
            borderRadius: 999,
            background: "rgba(6,182,212,0.14)",
            border: `1px solid ${colors.cyan}55`,
            color: colors.cyan,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}
