import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Leistungen } from "@/components/Leistungen";
import { Arbeitsweise } from "@/components/Arbeitsweise";
import { Reviews } from "@/components/Reviews";
import { Einsatzgebiet } from "@/components/Einsatzgebiet";
import { WhatsappFloat } from "@/components/WhatsappFloat";
import { Footer } from "@/components/Footer";

/**
 * Lead-Pfad: Hero (Angebot anfordern) → Leistungen → Ablauf mit
 * Besichtigungstermin und kostenlosem Angebot → Bewertungen → Einsatzgebiet
 * mit PLZ-Check. Referenzen und Galerie entfallen, bis echte Fotos vorliegen.
 */
export default function Page() {
  return (
    <main style={{ overflowX: "clip" }}>
      <Navbar />
      <Hero />
      <Leistungen />
      <Arbeitsweise />
      <Reviews />
      <Einsatzgebiet />
      <Footer />
      <WhatsappFloat />
    </main>
  );
}
