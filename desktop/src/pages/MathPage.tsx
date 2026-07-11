import { Calculator } from "lucide-react";
import { PagePlaceholder } from "../components/PagePlaceholder";

export function MathPage() {
  return (
    <PagePlaceholder
      icon={Calculator}
      title="Matematica"
      subtitle="Esercizi step-by-step, formulari, verifica soluzioni."
      badge="In arrivo nella prossima release"
    />
  );
}
