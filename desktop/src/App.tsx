import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { TitleBar } from "./components/TitleBar";
import { AppShell } from "./components/AppShell";
import { UpdateToast } from "./components/UpdateToast";
import { CommandPalette } from "./components/CommandPalette";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { ScannerPage } from "./pages/ScannerPage";
import { MathPage } from "./pages/MathPage";
import { VotiPage } from "./pages/VotiPage";
import { CalendarioPage } from "./pages/CalendarioPage";
import { CronologiaPage } from "./pages/CronologiaPage";
import { MateriaDetailPage } from "./pages/MateriaDetailPage";
import { ImpostazioniPage } from "./pages/ImpostazioniPage";
import { FlashcardsPage } from "./pages/FlashcardsPage";
import { VocabolarioPage } from "./pages/VocabolarioPage";
import { AchievementsPage } from "./pages/AchievementsPage";
import { NovitaPage } from "./pages/NovitaPage";
import { OralePage } from "./pages/OralePage";
import { TemaPage } from "./pages/TemaPage";
import { CompitoPage } from "./pages/CompitoPage";
import { MindmapPage } from "./pages/MindmapPage";
import { useAuth } from "./store/auth";
import { subscribeUpdaterEvents } from "./store/updater";
import { colors } from "./theme";

function Protected({ children }: { children: JSX.Element }) {
  const token = useAuth((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const token = useAuth((s) => s.token);
  const refreshUser = useAuth((s) => s.refreshUser);

  useEffect(() => {
    subscribeUpdaterEvents();
  }, []);

  // All'avvio, se abbiamo un token persistito, revalidiamo l'utente lato server.
  useEffect(() => {
    if (token) refreshUser();
  }, [token, refreshUser]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: colors.bg,
        color: colors.textPrimary,
      }}
    >
      <TitleBar />
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <HashRouter>
          <CommandPalette />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <Protected>
                  <AppShell />
                </Protected>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="scanner" element={<ScannerPage />} />
              <Route path="math" element={<MathPage />} />
              <Route path="voti" element={<VotiPage />} />
              <Route path="calendario" element={<CalendarioPage />} />
              <Route path="cronologia" element={<CronologiaPage />} />
              <Route path="materia/:name" element={<MateriaDetailPage />} />
              <Route path="impostazioni" element={<ImpostazioniPage />} />
              <Route path="flashcards" element={<FlashcardsPage />} />
              <Route path="vocabolario" element={<VocabolarioPage />} />
              <Route path="traguardi" element={<AchievementsPage />} />
              <Route path="novita" element={<NovitaPage />} />
              <Route path="orale" element={<OralePage />} />
              <Route path="tema" element={<TemaPage />} />
              <Route path="compito" element={<CompitoPage />} />
              <Route path="mindmap" element={<MindmapPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
        <UpdateToast />
      </div>
    </div>
  );
}
