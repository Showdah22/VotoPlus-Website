import { Calendar } from "lucide-react";
import { PagePlaceholder } from "../components/PagePlaceholder";

export function CalendarioPage() {
  return (
    <PagePlaceholder
      icon={Calendar}
      title="Calendario verifiche"
      subtitle="Pianifica verifiche, interrogazioni ed esami con reminder automatici."
      badge="In arrivo nella prossima release"
    />
  );
}
