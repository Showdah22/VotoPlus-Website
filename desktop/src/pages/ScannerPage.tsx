import { ScanLine } from "lucide-react";
import { PagePlaceholder } from "../components/PagePlaceholder";

export function ScannerPage() {
  return (
    <PagePlaceholder
      icon={ScanLine}
      title="Scannerizza & Riassumi"
      subtitle="Trascina un PDF, un&apos;immagine o incolla del testo per generare un riassunto AI."
      badge="In arrivo nella prossima release"
    />
  );
}
