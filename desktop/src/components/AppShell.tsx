import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { RightPanel } from "./RightPanel";
import { colors } from "../theme";

/**
 * Shell principale delle route autenticate:
 *  ┌────────┬────────────────┐
 *  │Sidebar │  <Outlet/>       │  RightPanel
 *  │ 220px  │   (route corrente)│   360px
 *  └────────┴────────────────┘
 */
export function AppShell() {
  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: colors.bg,
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          padding: 24,
        }}
      >
        <Outlet />
      </main>
      <RightPanel />
    </div>
  );
}
