"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import posthog from "posthog-js";
import { ApiError, postJson, readStorage, writeStorage } from "@/lib/client";
import type { CreatePollInput, FieldErrors } from "@/lib/types";
import { AppError, validateCreatePoll } from "@/lib/validation";
import { Icon } from "./icons";

const draftKey = "co-zamawiamy:pending-poll";
const examples = ["Pizza", "Sushi", "Kebab", "Burgery", "Sałatka"];
const posthogConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST);

export function NewPoll() {
  const [question, setQuestion] = useState("Co dziś zamawiamy?");
  const [options, setOptions] = useState([{ id: "a", value: "" }, { id: "b", value: "" }, { id: "c", value: "" }]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<CreatePollInput | null>(null);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const inFlight = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const focusAdded = useRef(false);

  useEffect(() => {
    const saved = readStorage("sessionStorage", draftKey);
    if (saved) {
      try {
        const input = validateCreatePoll(saved);
        setPending(input);
        setQuestion(input.question);
        setOptions(input.options.map((value, index) => ({ id: `restored-${index}`, value })));
        setError("Poprzednia próba nie ma potwierdzenia. Ponów zapis tego głosowania.");
      } catch { writeStorage("sessionStorage", draftKey, null); }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (focusAdded.current) { newInputRef.current?.focus(); focusAdded.current = false; }
  }, [options.length]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError(""); setErrors({});
    let input: CreatePollInput;
    try {
      input = pending ?? validateCreatePoll({ operationId: crypto.randomUUID(), question, options: options.map((item) => item.value) });
    } catch (caught) {
      if (caught instanceof AppError) { setErrors(caught.fields); setError(caught.message); }
      else setError("Nie udało się przygotować formularza. Odśwież stronę.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    inFlight.current = true; setSaving(true); setPending(input);
    setStorageWarning(!writeStorage("sessionStorage", draftKey, input));
    try {
      const { pollId } = await postJson<{ pollId: string }>("/api/polls", input);
      if (posthogConfigured) {
        posthog.capture("poll_created", {
          option_count: input.options.length,
          was_retry: pending !== null,
        });
      }
      writeStorage("sessionStorage", draftKey, null);
      window.location.assign(`/p/${pollId}`);
    } catch (caught) {
      const issue = caught instanceof ApiError ? caught : new ApiError("Nie udało się zapisać. Spróbuj ponownie.");
      setError(issue.message); setErrors(issue.fields);
      if (issue.status >= 400 && issue.status < 500) {
        setPending(null); writeStorage("sessionStorage", draftKey, null);
      }
      requestAnimationFrame(() => errorRef.current?.focus());
      setSaving(false); inFlight.current = false;
    }
  }

  return <section className="form-sheet" aria-labelledby="new-poll-title">
    <div className="sheet-heading"><h2 id="new-poll-title">Nowe głosowanie</h2><span className="quiet">Bez logowania</span></div>
    <form onSubmit={submit} noValidate aria-busy={saving}>
      <div className="question-field">
        <div className="label-row"><label htmlFor="question">O co pytasz ekipę?</label><span className="counter">{question.length}/120</span></div>
        <input id="question" name="question" value={question} maxLength={120} required readOnly={!!pending}
          aria-invalid={!!errors.question} aria-describedby="question-help" onChange={(event) => setQuestion(event.target.value)} />
        <p className={`field-help ${errors.question ? "field-error" : ""}`} id="question-help">{errors.question || "Krótko i na temat. Resztę ustalicie przy lunchu."}</p>
      </div>
      <fieldset className="proposal-fields">
        <legend>Co bierzemy pod uwagę?</legend>
        <p className="field-help" id="options-help">Dodaj od 2 do 5 różnych propozycji.</p>
        <div className="proposal-list">
          {options.map((option, index) => <div key={option.id} className="proposal-field">
            <div className="input-row">
              <span className="option-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <input id={`option-${option.id}`} name={`option-${index}`} ref={index === options.length - 1 ? newInputRef : undefined}
                placeholder={examples[index]} value={option.value} maxLength={60} required readOnly={!!pending}
                aria-label={`Propozycja ${index + 1}`} aria-invalid={!!errors[`option-${index}`]} aria-describedby={`help-${option.id}`}
                onChange={(event) => setOptions(options.map((item) => item.id === option.id ? { ...item, value: event.target.value } : item))} />
              <button className="icon-button" type="button" tabIndex={-1} aria-label={`Usuń propozycję ${index + 1}`} disabled={options.length <= 2 || !!pending}
                onClick={() => { setOptions(options.filter((item) => item.id !== option.id)); setErrors({}); }}><Icon name="close" /></button>
            </div>
            <p id={`help-${option.id}`} className="field-help field-error option-help">{errors[`option-${index}`] || ""}</p>
          </div>)}
        </div>
        <button type="button" className="add-button" disabled={options.length >= 4 || !!pending}
          onClick={() => { focusAdded.current = true; setOptions([...options, { id: crypto.randomUUID(), value: "" }]); }}>
          <Icon name="plus" />{options.length >= 5 ? "Maksymalnie 5 propozycji" : "Dodaj propozycję"}
        </button>
      </fieldset>
      {error && <p role="alert" ref={errorRef} tabIndex={-1} className="error-message">{error}</p>}
      {storageWarning && <p className="notice">Przeglądarka nie zapamięta tej próby po odświeżeniu. Przy błędzie ponów zapis bez opuszczania strony.</p>}
      <button className="button primary submit-button" type="submit" disabled={saving || !ready}>
        {saving ? "Tworzę głosowanie..." : pending ? "Ponów zapis" : "Utwórz głosowanie"}<Icon name="arrow" />
      </button>
      <p className="form-footnote">Potem udostępnisz ekipie link lub kod QR.</p>
    </form>
  </section>;
}
