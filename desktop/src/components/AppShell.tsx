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
  // Container esterno: su monitor ultrawide viene centrato con maxWidth 1600px
  // così che sidebar + main + right panel restino visivamente connessi.
  // Le fasce ai lati usano lo stesso bg dell'app per fondersi con la UI.
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        height: "100%",
        background: colors.bg,
      }}
    >
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          maxWidth: 1600,
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
    </div>
  );
}
