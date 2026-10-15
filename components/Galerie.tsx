import { galleryItems } from "@/lib/gallery-data";
import { galabau } from "@/lib/galabau";
import { referenzen } from "@/lib/referenzen-data";

// Jedes Foto darf auf der Startseite nur einmal vorkommen. Leistungen und
// Referenzen stehen weiter oben, die Galerie bekommt deshalb nur, was uebrig
// bleibt. Bleiben weniger als drei Bilder, entfaellt die Sektion ganz.
const MIN_GALLERY_IMAGES = 3;
const MAX_GALLERY_IMAGES = 5;

const usedElsewhere = new Set(
  [
    ...galabau.services.map((service) => service.image),
    ...referenzen.flatMap((projekt) => [projekt.afterImage, projekt.beforeImage])
  ].filter(Boolean) as string[]
);

const seen = new Set<string>();
const images = galleryItems
  .filter((item) => {
    if (usedElsewhere.has(item.src) || seen.has(item.src)) return false;
    seen.add(item.src);
    return true;
  })
  .slice(0, MAX_GALLERY_IMAGES);

export function Galerie() {
  if (images.length < MIN_GALLERY_IMAGES) return null;

  return (
    <section className="bg-creme py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
              <span className="marker" />
              <span>Einblicke</span>
            </div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 className="break-words font-display text-[32px] leading-[1.05] tracking-tight text-ink sm:text-[40px] md:text-[64px] lg:text-[78px]">
              Aus dem
              <br />
              <span className="italic text-petrol-500">Arbeitsalltag.</span>
            </h2>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-12 gap-4 md:gap-6">
          {/* Large image: 7 cols, stretches to match right stack */}
          <div className="col-span-12 md:col-span-7">
            <div className="group relative aspect-[4/3] overflow-hidden rounded-sm bg-ink/5 md:aspect-auto md:h-full">
              <img
                src={images[0].src}
                alt={images[0].alt}
                className="h-full w-full object-cover transition-transform duration-700 ease-out md:group-hover:scale-[1.03]"
              />
            </div>
          </div>

          {/* Right stack: 2 images */}
          <div className="col-span-12 flex flex-col gap-4 md:col-span-5 md:gap-6">
            {images.slice(1, 3).map((img) => (
              <div key={img.src} className="group relative aspect-[3/2] overflow-hidden rounded-sm bg-ink/5">
                <img
                  src={img.src}
                  alt={img.alt}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out md:group-hover:scale-[1.03]"
                />
              </div>
            ))}
          </div>

          {/* Bottom row: 1 full-width or 2 equal images */}
          {images.slice(3).map((img) => (
            <div key={img.src} className={images.length > 4 ? "col-span-6" : "col-span-12"}>
              <div className="group relative aspect-[3/2] overflow-hidden rounded-sm bg-ink/5">
                <img
                  src={img.src}
                  alt={img.alt}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out md:group-hover:scale-[1.03]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
