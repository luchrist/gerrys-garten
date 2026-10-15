export interface Referenz {
  id: string;
  /** Short project title, e.g. "PV-Anlage Einfamilienhaus". */
  title: string;
  /** Real place name. Never invent one. */
  ort: string;
  /** Must match one of the `label` values in lib/galabau.ts services. */
  leistung: string;
  jahr?: string;
  text: string;
  /** Finished state. Required. */
  afterImage: string;
  /**
   * Before state. OPTIONAL and only ever a genuine before shot of the SAME
   * project. Without it the card renders as a single image instead of a
   * before/after slider, which is the honest fallback.
   */
  beforeImage?: string;
  alt: string;
}

// Bewusst leer: Es liegen noch keine echten Auftragsfotos von Gerrys Garten vor.
// Sobald Vorher/Nachher-Bilder (z.B. PV-Reinigung, Pflasterreinigung,
// Heckenschnitt) vorhanden sind, hier eintragen und <Referenzen /> wieder auf
// der Startseite einbinden.
export const referenzen: Referenz[] = [];
