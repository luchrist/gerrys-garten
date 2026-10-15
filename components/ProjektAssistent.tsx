"use client";

import { useMemo, useRef, useState } from "react";

import { galabau } from "@/lib/galabau";
import {
  estimateProject,
  formatRange,
  matchBudget,
  SIZE_LABELS,
  type BudgetMatch,
  type EstimatorResult
} from "@/lib/estimator";
import {
  scoreLead,
  type Kundentyp,
  type Planungsstand,
  type ProjektAnfragePayload,
  type Zeitrahmen
} from "@/lib/lead-score";
import { checkServiceArea, type ServiceAreaResult } from "@/lib/service-area";

/**
 * Der mehrstufige Anfrage-Assistent (intern: Projekt-Assistent aus Abschnitt 4
 * des Konzepts). Acht Schritte: Leistung, Ort, Umfang, Auftrag, Zeitraum,
 * Fotos, Budget, Kontakt. Die Schrittfolge und die Auswertung (Einsatzgebiet-Check,
 * Budget-Orientierung, Lead-Score) sind deterministische Logik; die Factory
 * passt nur Texte und die Projektart-Optionen an den Betrieb an.
 */

type PhotoDraft = {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
};

type AssistantState = {
  serviceKeys: string[];
  sonstiges: string;
  plz: string;
  ort: string;
  qm: string;
  lfm: string;
  bestand: "neubau" | "bestand" | "unklar";
  zugang: "gut" | "eng" | "unklar";
  hanglage: boolean;
  planungsstand: Planungsstand | "";
  skizzen: boolean;
  zeitrahmen: Zeitrahmen | "";
  fotos: PhotoDraft[];
  budgetBand: string;
  budgetReaktion: string;
  name: string;
  telefon: string;
  email: string;
  kanal: "telefon" | "whatsapp" | "email";
  kundentyp: Kundentyp;
  nachricht: string;
  einwilligung: boolean;
};

const INITIAL_STATE: AssistantState = {
  serviceKeys: [],
  sonstiges: "",
  plz: "",
  ort: "",
  qm: "",
  lfm: "",
  bestand: "unklar",
  zugang: "unklar",
  hanglage: false,
  planungsstand: "",
  skizzen: false,
  zeitrahmen: "",
  fotos: [],
  budgetBand: "",
  budgetReaktion: "",
  name: "",
  telefon: "",
  email: "",
  kanal: "telefon",
  kundentyp: "privat",
  nachricht: "",
  einwilligung: false
};

const STEPS = [
  "Leistung",
  "Ort",
  "Umfang",
  "Auftrag",
  "Zeitraum",
  "Fotos",
  "Budget",
  "Kontakt"
] as const;

const ZEITRAHMEN_OPTIONS: Array<{ id: Zeitrahmen; label: string }> = [
  { id: "sofort", label: "So bald wie möglich" },
  { id: "1-3-monate", label: "In 1 bis 3 Monaten" },
  { id: "dieses-jahr", label: "Später in diesem Jahr / nächste Saison" },
  { id: "orientierung", label: "Erst einmal nur informieren" }
];

const PLANUNG_OPTIONS: Array<{ id: Planungsstand; label: string; hint: string }> = [
  { id: "konkret", label: "Klarer Auftrag", hint: "Ich weiß genau, was erledigt werden soll." },
  { id: "idee", label: "Grobe Vorstellung", hint: "Richtung klar, Umfang und Turnus noch offen." },
  { id: "beratung", label: "Beratung gewünscht", hint: "Ich hätte gern einen Besichtigungstermin und Vorschläge." }
];

const RECURRING_SERVICE_KEYS = [
  "gartenpflege",
  "grossflaechenmaehung",
  "photovoltaik-reinigung",
  "hausmeisterservice",
  "winterdienst"
];

const PHOTO_MAX_EDGE = 1600;

/**
 * Uploads travel as JSON, so raw 8-MB camera photos would blow the request up
 * to tens of MB. Downscale to max 1600px JPEG client-side; the office needs
 * the photo to assess the object, not the original resolution.
 */
async function downscaleToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = objectUrl;
    });

    const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function ChoiceButton({
  selected,
  onClick,
  children
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="choice" data-selected={selected} onClick={onClick}>
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected ? "border-petrol-500 bg-petrol-500" : "border-ink/25 bg-white"
        }`}
      >
        {selected ? <span className="h-2 w-2 rounded-full bg-bone" /> : null}
      </span>
      <span>{children}</span>
    </button>
  );
}

export function ProjektAssistent({ variant = "page" }: { variant?: "page" | "widget" }) {
  const [state, setState] = useState<AssistantState>(INITIAL_STATE);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patch = (partial: Partial<AssistantState>) => {
    setState((current) => ({ ...current, ...partial }));
    setStepError("");
  };

  const areaResult: ServiceAreaResult | null = useMemo(
    () => (state.plz.trim().length === 5 ? checkServiceArea(state.plz) : null),
    [state.plz]
  );

  const needsQm = useMemo(
    () => galabau.services.some((service) => state.serviceKeys.includes(service.key) && service.unit === "qm"),
    [state.serviceKeys]
  );
  const needsLfm = useMemo(
    () => galabau.services.some((service) => state.serviceKeys.includes(service.key) && service.unit === "lfm"),
    [state.serviceKeys]
  );

  const estimate: EstimatorResult | null = useMemo(() => {
    if (!state.serviceKeys.length) return null;
    return estimateProject({
      serviceKeys: state.serviceKeys,
      qm: Number(state.qm) > 0 ? Number(state.qm) : undefined,
      lfm: Number(state.lfm) > 0 ? Number(state.lfm) : undefined,
      hanglage: state.hanglage,
      schwererZugang: state.zugang === "eng",
      rueckbauBestand: state.bestand === "bestand"
    });
  }, [state.serviceKeys, state.qm, state.lfm, state.hanglage, state.zugang, state.bestand]);

  const budgetMatch: BudgetMatch = useMemo(() => {
    if (!estimate || !state.budgetBand) return "unbekannt";
    return matchBudget(state.budgetBand, estimate);
  }, [estimate, state.budgetBand]);

  function toggleService(key: string) {
    setState((current) => ({
      ...current,
      serviceKeys: current.serviceKeys.includes(key)
        ? current.serviceKeys.filter((existing) => existing !== key)
        : [...current.serviceKeys, key]
    }));
    setStepError("");
  }

  function validateStep(index: number): string {
    switch (index) {
      case 0:
        return state.serviceKeys.length || state.sonstiges.trim()
          ? ""
          : "Bitte mindestens eine Leistung auswählen.";
      case 1:
        return state.plz.trim().length === 5 ? "" : "Bitte eine fünfstellige Postleitzahl eingeben.";
      case 4:
        return state.zeitrahmen ? "" : "Bitte einen Zeitrahmen auswählen.";
      case 6:
        return state.budgetBand ? "" : "Bitte einen Budgetrahmen auswählen (auch „Noch unklar“ ist eine Antwort).";
      case 7: {
        if (!state.name.trim()) return "Bitte Ihren Namen eintragen.";
        if (!state.telefon.trim() && !state.email.trim()) {
          return "Bitte Telefonnummer oder E-Mail angeben, sonst können wir uns nicht melden.";
        }
        if (!state.einwilligung) return "Bitte der Kontaktaufnahme zustimmen.";
        return "";
      }
      default:
        return "";
    }
  }

  function goNext() {
    const error = validateStep(step);
    if (error) {
      setStepError(error);
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    const maxFiles = galabau.assistant.photoUploadMaxFiles;
    const maxBytes = galabau.assistant.photoUploadMaxMb * 1024 * 1024;
    const accepted: PhotoDraft[] = [...state.fotos];

    for (const file of Array.from(fileList)) {
      if (accepted.length >= maxFiles) break;
      if (!file.type.startsWith("image/")) continue;
      if (file.size > maxBytes) {
        setStepError(`„${file.name}“ ist größer als ${galabau.assistant.photoUploadMaxMb} MB und wurde übersprungen.`);
        continue;
      }
      try {
        const dataUrl = await downscaleToDataUrl(file);
        accepted.push({ name: file.name, size: file.size, type: "image/jpeg", dataUrl });
      } catch {
        setStepError(`„${file.name}“ konnte nicht gelesen werden und wurde übersprungen.`);
      }
    }

    patch({ fotos: accepted.slice(0, maxFiles) });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit() {
    const error = validateStep(7);
    if (error) {
      setStepError(error);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const selectedLabels = galabau.services
      .filter((service) => state.serviceKeys.includes(service.key))
      .map((service) => service.label);
    if (state.sonstiges.trim()) selectedLabels.push(`Sonstiges: ${state.sonstiges.trim()}`);

    const score = scoreLead({
      serviceArea: areaResult?.verdict ?? "unknown",
      servicesMatch: state.serviceKeys.length > 0,
      size: estimate?.size ?? "klein",
      budgetMatch,
      photoCount: state.fotos.length,
      zeitrahmen: state.zeitrahmen || undefined,
      planungsstand: state.planungsstand || undefined,
      kundentyp: state.kundentyp,
      wiederkehrend: state.serviceKeys.some((key) => RECURRING_SERVICE_KEYS.includes(key))
    });

    const payload: ProjektAnfragePayload = {
      quelle: variant === "widget" ? "widget" : "website",
      stage: "neue_anfrage",
      projektarten: selectedLabels,
      ort: { plz: state.plz.trim(), ort: state.ort.trim(), einsatzgebiet: areaResult?.verdict ?? "unknown" },
      umfang: {
        qm: Number(state.qm) > 0 ? Number(state.qm) : undefined,
        lfm: Number(state.lfm) > 0 ? Number(state.lfm) : undefined,
        bestand: state.bestand,
        zugang: state.zugang,
        hanglage: state.hanglage
      },
      planung: { stand: state.planungsstand || "idee", skizzen: state.skizzen },
      zeitrahmen: state.zeitrahmen || "orientierung",
      fotos: state.fotos,
      budget: {
        band: state.budgetBand,
        reaktion: state.budgetReaktion,
        orientierung: estimate ? { low: estimate.low, high: estimate.high } : null,
        match: budgetMatch
      },
      kontakt: {
        name: state.name.trim(),
        telefon: state.telefon.trim(),
        email: state.email.trim(),
        kanal: state.kanal,
        kundentyp: state.kundentyp,
        nachricht: state.nachricht.trim(),
        einwilligung: state.einwilligung
      },
      score,
      eingegangenAm: new Date().toISOString()
    };

    try {
      const response = await fetch("/api/projekt-anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setSubmitted(true);
    } catch {
      setSubmitError("Die Anfrage konnte gerade nicht übertragen werden. Bitte rufen Sie uns an oder versuchen Sie es gleich noch einmal.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-4xl border border-petrol-300 bg-petrol-50 p-8 md:p-12">
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-petrol-700">
          <span className="marker" />
          <span>Anfrage eingegangen</span>
        </div>
        <h3 className="mt-5 font-display text-[28px] leading-tight tracking-tight text-ink md:text-[36px]">
          Danke, {state.name.split(" ")[0] || "Ihre Anfrage ist da"}.
        </h3>
        <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-ink/75">
          {galabau.assistant.responsePromise} Sie erhalten außerdem eine kurze Bestätigung mit der Zusammenfassung
          Ihrer Angaben{state.email.trim() ? " per E-Mail" : ""}.
        </p>
        {estimate && !estimate.roughOnly ? (
          <p className="mt-4 max-w-[56ch] text-[13px] leading-relaxed text-ink/55">
            Zur Erinnerung: Der genannte Rahmen von {formatRange(estimate)} ist eine unverbindliche Orientierung.
            Ihr verbindliches Angebot erstellen wir kostenlos, auf Wunsch nach einer Besichtigung vor Ort.
          </p>
        ) : null}
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="rounded-4xl border border-ink/10 bg-white p-6 shadow-[0_20px_60px_rgba(20,24,26,0.06)] md:p-10">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
            Schritt {step + 1} von {STEPS.length}
          </span>
          <span className="font-display text-[18px] tracking-tight text-ink md:text-[20px]">{STEPS[step]}</span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink/8">
          <div className="h-full rounded-full bg-petrol-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Step 1: Leistung */}
      {step === 0 ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">
            Welche Leistung brauchen Sie? Mehrfachauswahl ist möglich.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {galabau.services.map((service) => (
              <ChoiceButton
                key={service.key}
                selected={state.serviceKeys.includes(service.key)}
                onClick={() => toggleService(service.key)}
              >
                {service.label}
              </ChoiceButton>
            ))}
          </div>
          <div className="mt-4">
            <label htmlFor="assistent-sonstiges" className="field-label">
              Sonstiges (optional)
            </label>
            <input
              id="assistent-sonstiges"
              className="field-input"
              placeholder="z.B. Hochbeete, Gartenbeleuchtung, Laubentfernung"
              value={state.sonstiges}
              onChange={(event) => patch({ sonstiges: event.target.value })}
            />
          </div>
        </div>
      ) : null}

      {/* Step 2: Ort & Einsatzgebiet */}
      {step === 1 ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">
            Wo liegt Ihr Grundstück oder Objekt? Wir prüfen sofort, ob es in unserem Einsatzgebiet liegt.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-[140px_1fr]">
            <div>
              <label htmlFor="assistent-plz" className="field-label">
                PLZ
              </label>
              <input
                id="assistent-plz"
                inputMode="numeric"
                maxLength={5}
                className="field-input"
                placeholder="64625"
                value={state.plz}
                onChange={(event) => patch({ plz: event.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div>
              <label htmlFor="assistent-ort" className="field-label">
                Ort
              </label>
              <input
                id="assistent-ort"
                className="field-input"
                placeholder={galabau.serviceArea.centerCity}
                value={state.ort}
                onChange={(event) => patch({ ort: event.target.value })}
              />
            </div>
          </div>
          {areaResult ? (
            <div
              className={`mt-5 rounded-2xl border px-5 py-4 text-[14px] leading-relaxed ${
                areaResult.verdict === "inside"
                  ? "border-petrol-300 bg-petrol-50 text-petrol-800"
                  : areaResult.verdict === "border"
                    ? "border-sonne-300 bg-sonne-50 text-sonne-800"
                    : "border-schiefer-300 bg-schiefer-50 text-schiefer-800"
              }`}
            >
              <strong className="block font-medium">{areaResult.headline}</strong>
              <span>{areaResult.detail}</span>
              {areaResult.verdict === "outside" ? (
                <span className="mt-1 block">Sie können die Anfrage trotzdem abschicken, wir melden uns ehrlich zurück.</span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Step 3: Fläche & Umfang */}
      {step === 2 ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">
            Grobe Zahlen reichen völlig. Sie helfen uns, den Aufwand richtig einzuschätzen.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {needsQm || !needsLfm ? (
              <div>
                <label htmlFor="assistent-qm" className="field-label">
                  Fläche bzw. Modulfläche (m², geschätzt)
                </label>
                <input
                  id="assistent-qm"
                  inputMode="numeric"
                  className="field-input"
                  placeholder="z.B. 120"
                  value={state.qm}
                  onChange={(event) => patch({ qm: event.target.value.replace(/[^\d]/g, "") })}
                />
              </div>
            ) : null}
            {needsLfm ? (
              <div>
                <label htmlFor="assistent-lfm" className="field-label">
                  Heckenlänge (laufende Meter)
                </label>
                <input
                  id="assistent-lfm"
                  inputMode="numeric"
                  className="field-input"
                  placeholder="z.B. 25"
                  value={state.lfm}
                  onChange={(event) => patch({ lfm: event.target.value.replace(/[^\d]/g, "") })}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <span className="field-label">Aktueller Zustand</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <ChoiceButton selected={state.bestand === "neubau"} onClick={() => patch({ bestand: "neubau" })}>
                Regelmäßig gepflegt
              </ChoiceButton>
              <ChoiceButton selected={state.bestand === "bestand"} onClick={() => patch({ bestand: "bestand" })}>
                Länger nicht gepflegt / stark verschmutzt
              </ChoiceButton>
              <ChoiceButton selected={state.bestand === "unklar"} onClick={() => patch({ bestand: "unklar" })}>
                Noch unklar
              </ChoiceButton>
            </div>
          </div>

          <div className="mt-6">
            <span className="field-label">Zugang für Geräte</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <ChoiceButton selected={state.zugang === "gut"} onClick={() => patch({ zugang: "gut" })}>
                Gut erreichbar (Geräte kommen hin)
              </ChoiceButton>
              <ChoiceButton selected={state.zugang === "eng"} onClick={() => patch({ zugang: "eng" })}>
                Eng / nur durchs Haus oder übers Dach
              </ChoiceButton>
              <ChoiceButton selected={state.zugang === "unklar"} onClick={() => patch({ zugang: "unklar" })}>
                Weiß ich nicht
              </ChoiceButton>
            </div>
          </div>

          <div className="mt-6">
            <ChoiceButton selected={state.hanglage} onClick={() => patch({ hanglage: !state.hanglage })}>
              Hanglage oder steiles Dach (erschwerter Einsatz)
            </ChoiceButton>
          </div>
        </div>
      ) : null}

      {/* Step 4: Auftrag */}
      {step === 3 ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">Wie konkret ist Ihr Auftrag?</p>
          <div className="mt-6 grid gap-3">
            {PLANUNG_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.id}
                selected={state.planungsstand === option.id}
                onClick={() => patch({ planungsstand: option.id })}
              >
                <span className="block font-medium">{option.label}</span>
                <span className="block text-[13px] text-ink/55">{option.hint}</span>
              </ChoiceButton>
            ))}
          </div>
          <div className="mt-6">
            <ChoiceButton selected={state.skizzen} onClick={() => patch({ skizzen: !state.skizzen })}>
              Es gibt Unterlagen wie Lageplan oder Leistungsverzeichnis (können im Foto-Schritt hochgeladen werden)
            </ChoiceButton>
          </div>
        </div>
      ) : null}

      {/* Step 5: Zeitraum */}
      {step === 4 ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">Wann sollen wir starten?</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {ZEITRAHMEN_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.id}
                selected={state.zeitrahmen === option.id}
                onClick={() => patch({ zeitrahmen: option.id })}
              >
                {option.label}
              </ChoiceButton>
            ))}
          </div>
        </div>
      ) : null}

      {/* Step 6: Foto-Upload */}
      {step === 5 ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">
            Fotos vom Garten, von der Photovoltaikanlage, dem Objekt oder dem aktuellen Zustand.
            Optional, aber sie sparen meist eine ganze Runde Rückfragen.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => void onFilesSelected(event.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/25 bg-bone px-6 py-10 text-center transition-colors hover:border-petrol-400"
          >
            <span className="font-display text-[20px] tracking-tight text-ink">Fotos auswählen</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/50">
              Bis zu {galabau.assistant.photoUploadMaxFiles} Bilder, je max. {galabau.assistant.photoUploadMaxMb} MB
            </span>
          </button>
          {state.fotos.length > 0 ? (
            <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {state.fotos.map((foto, index) => (
                <li key={`${foto.name}-${index}`} className="relative">
                  <img src={foto.dataUrl} alt={foto.name} className="aspect-square w-full rounded-xl object-cover" />
                  <button
                    type="button"
                    aria-label={`${foto.name} entfernen`}
                    onClick={() => patch({ fotos: state.fotos.filter((_, i) => i !== index) })}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[12px] text-bone"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* Step 7: Budget & Preisgefühl */}
      {step === 6 ? (
        <div>
          {estimate && !estimate.roughOnly ? (
            <div className="rounded-2xl border border-sonne-300 bg-sonne-50 px-5 py-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-sonne-700">
                Grobe Orientierung ({SIZE_LABELS[estimate.size]})
              </span>
              <p className="mt-1 font-display text-[24px] tracking-tight text-ink md:text-[28px]">
                {formatRange(estimate)}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink/60">{estimate.disclaimer}</p>
            </div>
          ) : (
            <p className="text-[15px] leading-relaxed text-ink/70">
              Für eine Orientierungsspanne fehlen uns noch Mengenangaben, das ist aber kein Problem.
              Wählen Sie einfach den Rahmen, der für Sie realistisch wäre.
            </p>
          )}

          <div className="mt-6">
            <span className="field-label">Welcher Rahmen passt für Sie (pro Auftrag)?</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {galabau.estimator.budgetBands.map((band) => (
                <ChoiceButton
                  key={band.id}
                  selected={state.budgetBand === band.id}
                  onClick={() => patch({ budgetBand: band.id })}
                >
                  {band.label}
                </ChoiceButton>
              ))}
            </div>
          </div>

          {estimate && !estimate.roughOnly ? (
            <div className="mt-6">
              <span className="field-label">{galabau.estimator.realismQuestion}</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {galabau.estimator.realismOptions.map((option) => (
                  <ChoiceButton
                    key={option.id}
                    selected={state.budgetReaktion === option.id}
                    onClick={() => patch({ budgetReaktion: option.id })}
                  >
                    {option.label}
                  </ChoiceButton>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Step 8: Kontakt */}
      {step === 7 ? (
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="assistent-name" className="field-label">
                Name
              </label>
              <input
                id="assistent-name"
                className="field-input"
                autoComplete="name"
                value={state.name}
                onChange={(event) => patch({ name: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="assistent-telefon" className="field-label">
                Telefon
              </label>
              <input
                id="assistent-telefon"
                className="field-input"
                inputMode="tel"
                autoComplete="tel"
                value={state.telefon}
                onChange={(event) => patch({ telefon: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="assistent-email" className="field-label">
                E-Mail
              </label>
              <input
                id="assistent-email"
                className="field-input"
                inputMode="email"
                autoComplete="email"
                value={state.email}
                onChange={(event) => patch({ email: event.target.value })}
              />
            </div>
          </div>

          <div className="mt-6">
            <span className="field-label">Wie dürfen wir uns melden?</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <ChoiceButton selected={state.kanal === "telefon"} onClick={() => patch({ kanal: "telefon" })}>
                Anruf
              </ChoiceButton>
              <ChoiceButton selected={state.kanal === "whatsapp"} onClick={() => patch({ kanal: "whatsapp" })}>
                WhatsApp
              </ChoiceButton>
              <ChoiceButton selected={state.kanal === "email"} onClick={() => patch({ kanal: "email" })}>
                E-Mail
              </ChoiceButton>
            </div>
          </div>

          <div className="mt-6">
            <span className="field-label">Privat oder gewerblich?</span>
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceButton selected={state.kundentyp === "privat"} onClick={() => patch({ kundentyp: "privat" })}>
                Privat
              </ChoiceButton>
              <ChoiceButton selected={state.kundentyp === "gewerblich"} onClick={() => patch({ kundentyp: "gewerblich" })}>
                Gewerblich / Hausverwaltung
              </ChoiceButton>
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="assistent-nachricht" className="field-label">
              Noch etwas, das wir wissen sollten? (optional)
            </label>
            <textarea
              id="assistent-nachricht"
              rows={3}
              className="field-input resize-y"
              value={state.nachricht}
              onChange={(event) => patch({ nachricht: event.target.value })}
            />
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-ink/70">
            <input
              type="checkbox"
              checked={state.einwilligung}
              onChange={(event) => patch({ einwilligung: event.target.checked })}
              className="mt-1 h-4 w-4 accent-petrol-600"
            />
            <span>{galabau.assistant.consentText}</span>
          </label>
        </div>
      ) : null}

      {stepError ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {stepError}
        </p>
      ) : null}
      {submitError ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {submitError}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-ink/10 pt-6">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0 || submitting}
          className="rounded-full border border-ink/20 px-6 py-3 text-[13px] font-medium text-ink transition-opacity disabled:opacity-0"
        >
          Zurück
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-2 rounded-full bg-petrol-500 px-7 py-3 text-[13px] font-medium text-bone transition-colors hover:bg-petrol-600"
          >
            Weiter
            <span>&rarr;</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-petrol-500 px-7 py-3 text-[13px] font-medium text-bone transition-colors hover:bg-petrol-600 disabled:opacity-60"
          >
            {submitting ? "Wird gesendet …" : "Kostenloses Angebot anfordern"}
          </button>
        )}
      </div>
    </div>
  );
}
