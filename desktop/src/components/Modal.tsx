import { X } from "lucide-react";
import React from "react";
import { colors, radius } from "../theme";

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 460,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          background: colors.bgElevated,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: radius.xl,
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          padding: 24,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: colors.bgGlass,
              border: `1px solid ${colors.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.textSub,
            }}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 11.5,
  fontWeight: 700,
  color: colors.textSub,
  textTransform: "uppercase",
  letterSpacing: 0.6,
};

export const inputStyle: React.CSSProperties = {
  height: 42,
  padding: "0 14px",
  borderRadius: radius.md,
  background: colors.bgGlass,
  border: `1px solid ${colors.border}`,
  color: colors.textPrimary,
  fontSize: 14,
  outline: "none",
};

export const primaryBtn: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: radius.md,
  background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
  color: colors.textPrimary,
  fontWeight: 800,
  fontSize: 14,
  boxShadow: "0 6px 20px rgba(168,85,247,0.32)",
};
