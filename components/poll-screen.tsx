"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import posthog from "posthog-js";
import { ApiError, postJson, readStorage, writeStorage } from "@/lib/client";
import type { Poll, VoteInput } from "@/lib/types";
import { isUuid } from "@/lib/validation";
import { useLivePoll } from "@/lib/use-live-poll";
import { Icon } from "./icons";

type VoteRecord = VoteInput & { status: "pending" | "saved" };

function validRecord(value: unknown, poll: Poll): value is VoteRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as VoteRecord;
  return isUuid(record.operationId) && poll.options.some((item) => item.id === record.optionId)
    && (record.status === "saved" || record.status === "pending");
}

const percent = (votes: number, total: number) => total ? Math.round(votes / total * 100) : 0;
const voteCount = (count: number) => `${count} ${count === 1 ? "głos" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? "głosy" : "głosów"}`;
const posthogConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST);

export function PollScreen({ initialPoll }: { initialPoll: Poll }) {
  const [ready, setReady] = useState(false);
  const [record, setRecord] = useState<VoteRecord | null>(null);
  const voted = record?.status === "saved";
  const { poll, updatePoll, connection } = useLivePoll(initialPoll, ready && voted);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const [link, setLink] = useState("");
  const inFlight = useRef(false);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const storageKey = `co-zamawiamy:vote:${poll.id}`;

  useEffect(() => {
    const saved = readStorage("localStorage", storageKey);
    if (validRecord(saved, initialPoll)) {
      setRecord(saved); setSelected(saved.optionId);
      if (saved.status === "pending") setError("Poprzednia próba nie ma potwierdzenia. Ponów zapis wybranej odpowiedzi.");
    }
    setLink(new URL(`/p/${initialPoll.id}`, window.location.origin).href);
    setReady(true);
  }, [storageKey, initialPoll]);

  async function vote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || record?.status === "saved") return;
    if (!selected) { setError("Wybierz jedną propozycję, zanim oddasz głos."); return; }
    inFlight.current = true; setSaving(true); setError("");
    const attempt: VoteRecord = record ?? { operationId: crypto.randomUUID(), optionId: selected, status: "pending" };
    setRecord(attempt);
    setStorageWarning(!writeStorage("localStorage", storageKey, attempt));
    try {
      const data = await postJson<{ poll: Poll; optionId: string }>(`/api/polls/${poll.id}/votes`, { operationId: attempt.operationId, optionId: attempt.optionId });
      const saved: VoteRecord = { ...attempt, status: "saved" };
      if (posthogConfigured) {
        posthog.capture("vote_submitted", {
          option_count: poll.options.length,
          selected_option_position: poll.options.findIndex((option) => option.id === attempt.optionId) + 1,
          was_retry: record !== null,
        });
      }
      updatePoll(data.poll); setRecord(saved);
      setStorageWarning(!writeStorage("localStorage", storageKey, saved));
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (caught) {
      const issue = caught instanceof ApiError ? caught : new ApiError("Nie udało się zapisać głosu. Spróbuj ponownie.");
      setError(issue.message);
      if (issue.status >= 400 && issue.status < 500) { setRecord(null); writeStorage("localStorage", storageKey, null); }
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { setSaving(false); inFlight.current = false; }
  }

  async function copyLink() {
    setCopyState("copying");
    try {
      await navigator.clipboard.writeText(link);
      if (posthogConfigured) posthog.capture("poll_link_copied");
      setCopyState("copied");
    } catch { setCopyState("failed"); }
  }

  return <>
    <div className="poll-intro"><h1>{poll.question}</h1><p>{voted ? "Decyzja należy do ekipy. Oto aktualne wyniki." : "Jeden głos. Mniej ustalania, więcej jedzenia."}</p></div>
    <section className="form-sheet poll-sheet" aria-label={voted ? "Wyniki głosowania" : "Oddaj głos"}>
      {!ready ? <div className="loading-state" role="status">Wczytuję głosowanie...</div> : voted ? <>
        <div className="saved-message" role="status"><Icon name="check" /><p>Twój głos został zapisany</p></div>
        <div className="results-heading"><h2 ref={resultRef} tabIndex={-1}>Tak głosuje ekipa</h2><span className="total-votes" aria-live="polite" aria-atomic="true">{voteCount(poll.totalVotes)}</span></div>
        {poll.totalVotes === 0 && <p className="notice">Nie ma jeszcze głosów. Udostępnij link ekipie.</p>}
        <ul className="results-list">
          {poll.options.map((option) => <li key={option.id} className="result-row">
            <div className="result-top"><div className="result-label">{option.label}{record.optionId === option.id && <span className="your-vote">Twój wybór</span>}</div><strong>{percent(option.votes, poll.totalVotes)}%</strong></div>
            <div className="result-track" aria-hidden="true"><div className="result-fill" style={{ transform: `scaleX(${poll.totalVotes ? option.votes / poll.totalVotes : 0})` }} /></div>
            <p className="result-count">{voteCount(option.votes)}</p>
          </li>)}
        </ul>
        <p className={`results-note live-status ${connection === "live" ? "is-live" : ""}`} role="status">
          <span className="live-dot" aria-hidden="true" />
          {connection === "live" ? "Wyniki na żywo" : connection === "reconnecting" ? "Brak aktualizacji. Ponawiam połączenie..." : connection === "paused" ? "Aktualizacje wrócą po otwarciu karty." : "Łączę z wynikami na żywo..."}
        </p>
      </> : <form onSubmit={vote} aria-busy={saving} noValidate>
        <fieldset className="vote-fieldset" disabled={saving}>
          <legend>Na co masz ochotę?</legend>
          <p className="field-help" id="vote-help">Wybierz jedną propozycję. Po głosowaniu zobaczysz wyniki.</p>
          <div className="vote-options">
            {poll.options.map((option) => <label className={`vote-option ${selected === option.id ? "selected" : ""}`} key={option.id}>
              <input type="radio" name="lunch" value={option.id} checked={selected === option.id} disabled={!!record && selected !== option.id}
                aria-describedby="vote-help" onChange={() => { setSelected(option.id); setError(""); }} />
              <span>{option.label}</span>
            </label>)}
          </div>
        </fieldset>
        {error && <p role="alert" className="error-message" tabIndex={-1} ref={errorRef}>{error}</p>}
        <button className="button primary submit-button" disabled={saving} type="submit">{saving ? "Zapisuję głos..." : record ? "Ponów zapis głosu" : "Głosuję"}<Icon name="arrow" /></button>
        <p className="form-footnote">Głosujesz bez podawania swoich danych.</p>
      </form>}
      {storageWarning && <p className="notice" role="status">Przeglądarka blokuje zapamiętanie głosu. {voted ? "Głos jest zapisany, ale po odświeżeniu możesz ponownie zobaczyć formularz." : "Przy błędzie ponów zapis bez opuszczania strony."}</p>}
      <div className="share-section"><div><h2>Zbierz całą ekipę</h2><p>Wyślij link lub pokaż ekipie kod QR.</p></div>
        <button type="button" className="button secondary" disabled={!link || copyState === "copying"} onClick={copyLink}><Icon name={copyState === "copied" ? "check" : "copy"} />{copyState === "copied" ? "Link skopiowany" : copyState === "copying" ? "Kopiuję..." : "Kopiuj link"}</button>
        <span className="sr-only" role="status">{copyState === "copied" ? "Link został skopiowany do schowka." : ""}</span>
        {copyState === "failed" && <div className="copy-fallback"><label htmlFor="poll-link">Nie udało się skopiować. Zaznacz i skopiuj link:</label><input id="poll-link" readOnly value={link} onFocus={(event) => event.target.select()} /></div>}
        {link && <figure className="share-qr">
          <QRCodeSVG value={link} size={192} level="M" marginSize={4} role="img" title="Kod QR z linkiem do głosowania" />
          <figcaption><strong>Zeskanuj i zagłosuj</strong><p>Otwórz aparat w telefonie i skieruj go na kod.</p><a href={link}>Otwórz głosowanie</a></figcaption>
        </figure>}
      </div>
    </section>
    <Link href="/" className="new-poll-link">Utwórz własne głosowanie <Icon name="arrow" /></Link>
  </>;
}
