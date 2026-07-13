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
        {/* Wrapper centrato: su schermi ultra-wide (>1400px utili tra le due
            sidebar) il contenuto delle route resta al centro invece di essere
            spinto tutto a sinistra. Le pagine con maxWidth interno più piccolo
            (es. 900px) restano comunque centrate perché sono nested. */}
        <div style={{ width: "100%", maxWidth: 1400, margin: "0 auto" }}>
          <Outlet />
        </div>
      </main>
      <RightPanel />
    </div>
  );
}
