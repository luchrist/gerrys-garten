import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { galabau } from "@/lib/galabau";
import { restaurant } from "@/lib/restaurant";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"]
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap"
});

const SEO_TITLE = `Gartenpflege und Photovoltaik-Reinigung und Hausmeisterservice in ${restaurant.address.city} | ${restaurant.name}`;
const SEO_DESCRIPTION = `${restaurant.name} in ${restaurant.address.city}: Gartenpflege und Photovoltaik-Reinigung und Hausmeisterservice für private und gewerbliche Kunden an der Bergstraße. Kostenloses Angebot anfordern.`;

export const metadata: Metadata = {
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  keywords: [
    restaurant.name,
    `Gartenpflege und Photovoltaik-Reinigung und Hausmeisterservice ${restaurant.address.city}`,
    `Gartenpflege ${restaurant.address.city}`,
    `Photovoltaik-Reinigung ${restaurant.address.city}`,
    "PV-Reinigung Bergstraße",
    `Hausmeisterservice ${restaurant.address.city}`,
    `Objektbetreuung ${restaurant.address.city}`,
    `Winterdienst ${restaurant.address.city}`,
    "Großflächenmähung Bergstraße"
  ],
  openGraph: {
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    locale: restaurant.seo.locale
  }
};

// Schema.org: HomeAndConstructionBusiness passt zu Hausmeister-, Garten- und
// Reinigungsdienstleistungen am Objekt besser als ein generisches LocalBusiness.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HomeAndConstructionBusiness",
  name: restaurant.name,
  description: SEO_DESCRIPTION,
  telephone: restaurant.phone,
  email: galabau.contact.email || undefined,
  address: {
    "@type": "PostalAddress",
    streetAddress: restaurant.address.street,
    postalCode: restaurant.address.cityLine.split(" ")[0],
    addressLocality: restaurant.address.city,
    addressCountry: "DE"
  },
  geo: galabau.serviceArea.center
    ? { "@type": "GeoCoordinates", latitude: galabau.serviceArea.center.lat, longitude: galabau.serviceArea.center.lng }
    : undefined,
  areaServed: galabau.serviceArea.places.map((place) => ({ "@type": "City", name: place })),
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"], opens: "09:00", closes: "17:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Friday"], opens: "09:00", closes: "12:00" }
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Leistungen",
    itemListElement: galabau.services.map((service) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: service.label, description: service.teaser }
    }))
  },
  sameAs: (["instagram", "facebook", "tiktok"] as const)
    .filter((key) => !restaurant.socialMedia.hidden[key] && restaurant.socialMedia[key])
    .map((key) => restaurant.socialMedia[key]),
  founder: restaurant.legal.ownerName ? { "@type": "Person", name: restaurant.legal.ownerName } : undefined,
  foundingDate: galabau.company.foundedYear || undefined
};

export const viewport: Viewport = {
  themeColor: "#F5F8F9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}>
      <body className="grain overflow-x-hidden bg-bone text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
      </body>
    </html>
  );
}
