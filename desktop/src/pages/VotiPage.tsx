import { BarChart3 } from "lucide-react";
import { PagePlaceholder } from "../components/PagePlaceholder";

export function VotiPage() {
  return (
    <PagePlaceholder
      icon={BarChart3}
      title="Voti & medie"
      subtitle="Andamento per materia, medie mensili e obiettivi personalizzati."
      badge="In arrivo nella prossima release"
    />
  );
}
