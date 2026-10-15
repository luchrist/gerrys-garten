export interface GalleryItem {
  src: string;
  alt: string;
}

// Nur echte Fotos des Betriebs, die weder als Leistungsbild (lib/galabau.ts)
// noch als Referenz (lib/referenzen-data.ts) laufen. Aktuell liegen keine
// eigenen Einsatzfotos vor, deshalb bleibt die Galerie leer und ausgeblendet.
export const galleryItems: GalleryItem[] = [];
