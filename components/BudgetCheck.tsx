"use client";

import { useMemo, useState } from "react";

import { galabau } from "@/lib/galabau";
import { estimateProject, formatEur, formatRange, matchBudget, SIZE_LABELS } from "@/lib/estimator";

/**
 * Budget-Check-Widget aus Abschnitt 6 des Konzepts: Orientierungslogik,
 * Budget-Match und Preisgefühl-Abfrage in kompakt. Am Ende führt es in den
 * vollständigen Anfrage-Assistenten, denn der Check qualifiziert nur, er
 * ersetzt keine Anfrage.
 */
export function BudgetCheck() {
  const [serviceKey, setServiceKey] = useState("");
  const [menge, setMenge] = useState("");
  const [budgetBand, setBudgetBand] = useState("");

  const service = galabau.services.find((entry) => entry.key === serviceKey);

  const estimate = useMemo(() => {
    if (!service) return null;
    const value = Number(menge);
    return estimateProject({
      serviceKeys: [service.key],
      qm: service.unit === "qm" && value > 0 ? value : undefined,
      lfm: service.unit === "lfm" && value > 0 ? value : undefined
    });
  }, [service, menge]);

  const match = useMemo(() => {
    if (!estimate || !budgetBand) return null;
    return matchBudget(budgetBand, estimate);
  }, [estimate, budgetBand]);

  const unitLabel = service?.unit === "lfm" ? "Heckenlänge in Metern" : service?.unit === "stk" ? "Anzahl" : "Fläche in m²";
  const showQuantity = service ? service.unit === "qm" || service.unit === "lfm" : false;

  return (
    <div className="rounded-4xl border border-ink/10 bg-white p-6 md:p-8">
      <div>
        <label htmlFor="budget-leistung" className="field-label">
          Leistung
        </label>
        <select
          id="budget-leistung"
          className="field-input"
          value={serviceKey}
          onChange={(event) => setServiceKey(event.target.value)}
        >
          <option value="">Bitte wählen …</option>
          {galabau.services.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      {service && showQuantity ? (
        <div className="mt-4">
          <label htmlFor="budget-menge" className="field-label">
            {unitLabel} (geschätzt)
          </label>
          <input
            id="budget-menge"
            inputMode="numeric"
            className="field-input"
            placeholder={service.unit === "lfm" ? "z.B. 25" : "z.B. 60"}
            value={menge}
            onChange={(event) => setMenge(event.target.value.replace(/[^\d]/g, ""))}
          />
        </div>
      ) : null}

      {estimate && service ? (
        <div className="mt-6 rounded-2xl border border-sonne-300 bg-sonne-50 px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-sonne-700">
            Grobe Orientierung ({SIZE_LABELS[estimate.size]})
          </span>
          <p className="mt-1 font-display text-[24px] tracking-tight text-ink">{formatRange(estimate)}</p>
          {estimate.roughOnly ? (
            <p className="mt-2 text-[12px] leading-relaxed text-ink/60">
              Ohne Mengenangabe ist das nur die typische Einstiegsspanne für diese Leistung.
            </p>
          ) : null}
          <p className="mt-2 text-[12px] leading-relaxed text-ink/60">{estimate.disclaimer}</p>
        </div>
      ) : null}

      {estimate ? (
        <div className="mt-6">
          <span className="field-label">Welcher Rahmen wäre für Sie realistisch?</span>
          <div className="grid gap-2">
            {galabau.estimator.budgetBands.map((band) => (
              <button
                key={band.id}
                type="button"
                className="choice"
                data-selected={budgetBand === band.id}
                onClick={() => setBudgetBand(band.id)}
              >
                {band.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {match ? (
        <div
          className={`mt-6 rounded-2xl border px-5 py-4 text-[14px] leading-relaxed ${
            match === "passend" || match === "darueber"
              ? "border-petrol-300 bg-petrol-50 text-petrol-800"
              : match === "unter"
                ? "border-schiefer-300 bg-schiefer-50 text-schiefer-800"
                : "border-sonne-300 bg-sonne-50 text-sonne-800"
          }`}
        >
          {match === "passend" ? (
            <span>Das passt gut zusammen. Der nächste Schritt ist eine kostenlose Anfrage mit ein paar Fotos.</span>
          ) : match === "darueber" ? (
            <span>Ihr Rahmen liegt über der Orientierung, da ist Spielraum für zusätzliche Leistungen oder einen festen Turnus.</span>
          ) : match === "unter" ? (
            <span>
              Ehrliche Antwort: Unter {formatEur(estimate?.low ?? galabau.estimator.minProjectEur)} wird dieses
              Auftrag schwer umsetzbar. Ein kleinerer Umfang lässt sich aber oft finden, fragen Sie gern an.
            </span>
          ) : (
            <span>Auch mit unklarem Budget lohnt sich die Anfrage, das Angebot ist kostenlos.</span>
          )}
        </div>
      ) : null}

      <a
        href="/projekt-anfragen"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-petrol-500 px-7 py-3.5 text-[13px] font-medium text-bone transition-colors hover:bg-petrol-600"
      >
        Kostenloses Angebot anfordern
        <span>&rarr;</span>
      </a>
    </div>
  );
}
