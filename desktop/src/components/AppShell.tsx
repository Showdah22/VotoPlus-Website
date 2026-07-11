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
  // Layout full-width responsive: sidebar (280px fissa) + main (flex:1) +
  // right panel (340px fissa). Su ultrawide il main cresce riempiendo tutto
  // lo spazio, la griglia interna (auto-fill/minmax) fa crescere il numero
  // di colonne. Le card NON vengono stirate: hanno minmax con maxima ragionevoli.
  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
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
