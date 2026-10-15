"use client";

import { motion } from "framer-motion";

import { galabau } from "@/lib/galabau";

/**
 * Ablauf von der Anfrage bis zur laufenden Betreuung, endet auf dem
 * Angebots-CTA. Was Besucher vor der Anfrage wissen wollen: wie es abläuft,
 * ob das Angebot etwas kostet und ob jemand vorbeikommt.
 */
const SCHRITTE = [
  {
    title: "Anfrage",
    text: "Sie schildern kurz, worum es geht: Garten, Photovoltaikanlage oder Objekt. Ein paar Fotos sparen die erste Runde Rückfragen."
  },
  {
    title: "Besichtigungstermin",
    text: "Auf Wunsch kommen wir zu einem gemeinsamen Termin vor Ort und sehen uns Flächen, Anlage und Zugang an."
  },
  {
    title: "Kostenloses Angebot",
    text: "Sie bekommen ein klares, unverbindliches Angebot. Einmaliger Einsatz oder regelmäßige Betreuung, ganz nach Bedarf."
  },
  {
    title: "Ausführung",
    text: "Wir arbeiten mit professionellem Equipment und regelmäßig gewarteten Maschinen. Grünschnitt nehmen wir auf Wunsch gleich mit."
  },
  {
    title: "Laufende Betreuung",
    text: "Auf Wunsch übernehmen wir dauerhaft: Pflege im festen Turnus, Hausmeisterservice und Winterdienst aus einer Hand."
  }
];

export function Arbeitsweise() {
  const facts = [
    galabau.company.foundedYear ? { label: "Gegründet", value: galabau.company.foundedYear } : null,
    galabau.company.teamSize ? { label: "Team", value: galabau.company.teamSize } : null,
    galabau.company.machines ? { label: "Maschinen", value: galabau.company.machines } : null
  ].filter((fact): fact is { label: string; value: string } => fact !== null);

  return (
    <section id="ablauf" className="relative bg-ink py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-x-10 gap-y-14">
          <div className="col-span-12 lg:col-span-5">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bone/55">
              <span className="inline-block h-[0.4rem] w-[0.4rem] rounded-full bg-sonne-400" />
              <span>Ablauf</span>
            </div>
            <h2 className="mt-6 font-display text-[32px] leading-[1.05] tracking-tight text-bone sm:text-[40px] md:text-[54px]">
              So läuft es <span className="italic text-petrol-300">ab.</span>
            </h2>
            <p className="mt-6 max-w-[50ch] text-[15px] leading-relaxed text-bone/75">
              Ob Gartenpflege, PV-Reinigung oder Hausmeisterservice: Sie wissen an jedem Punkt, was als Nächstes
              passiert. Das Angebot ist für Sie kostenlos und unverbindlich.
            </p>

            {facts.length > 0 ? (
              <dl className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-bone/45">{fact.label}</dt>
                    <dd className="mt-2 font-display text-[22px] tracking-tight text-bone">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {galabau.trust.seals.length > 0 ? (
              <ul className="mt-10 flex flex-wrap gap-2">
                {galabau.trust.seals.map((seal) => (
                  <li
                    key={seal.label}
                    title={seal.note}
                    className="rounded-full border border-sonne-400/40 bg-sonne-400/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-sonne-200"
                  >
                    {seal.label}
                  </li>
                ))}
              </ul>
            ) : null}

            <a
              href="/projekt-anfragen"
              className="mt-10 inline-flex items-center gap-3 rounded-full bg-petrol-500 px-8 py-4 text-[14px] font-medium text-bone transition-colors hover:bg-petrol-400"
            >
              Kostenloses Angebot anfordern
              <span>&rarr;</span>
            </a>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-bone/50">
              {galabau.assistant.responsePromise}
            </p>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <ol className="relative border-l border-bone/15 pl-8 md:pl-10">
              {SCHRITTE.map((schritt, index) => (
                <motion.li
                  key={schritt.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ type: "spring", stiffness: 110, damping: 22, delay: index * 0.05 }}
                  className="relative pb-10 last:pb-0"
                >
                  <span className="absolute -left-[calc(2rem+1px)] flex h-[1.9rem] w-[1.9rem] -translate-x-1/2 items-center justify-center rounded-full bg-petrol-500 font-mono text-[11px] text-bone md:-left-[calc(2.5rem+1px)]">
                    {index + 1}
                  </span>
                  <h3 className="font-display text-[21px] tracking-tight text-bone md:text-[24px]">{schritt.title}</h3>
                  <p className="mt-2 max-w-[54ch] text-[14px] leading-relaxed text-bone/65">{schritt.text}</p>
                </motion.li>
              ))}
            </ol>

            {galabau.trust.usps.length > 0 ? (
              <ul className="mt-4 grid gap-4 sm:grid-cols-3">
                {galabau.trust.usps.map((usp) => (
                  <li key={usp.label} className="rounded-4xl border border-bone/12 bg-bone/[0.04] p-6">
                    <h3 className="font-display text-[17px] tracking-tight text-bone">{usp.label}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-bone/60">{usp.text}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
