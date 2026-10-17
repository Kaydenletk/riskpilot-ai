"use client";
import { useEffect, useRef, useState } from "react";
import type { ResearchCompany, EvidenceNote } from "@/lib/research/corpus";
import { Icon } from "./Icon";
import styles from "./research.module.css";
interface SearchResult {
  mode: string;
  interpretation: string;
  evidenceIds: string[];
  unknowns: string[];
  notice?: string;
  retrieval?: {
    engine: string;
    strategy: string;
    fallbackReason: string | null;
  };
}

export function SourceSearch({
  company,
  explore,
  liveAiAvailable,
}: {
  company: ResearchCompany;
  explore: (note: EvidenceNote) => void;
  liveAiAvailable: boolean;
}) {
  const symbol = company.symbol;
  const [query, setQuery] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState("");
  const [pending, setPending] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  useEffect(
    () => () => {
      epoch.current++;
      requestRef.current?.abort();
    },
    [],
  );
  async function findEvidence(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 3) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const id = ++epoch.current;
    setPending(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ symbol, query: query.trim(), useAi }),
      });
      const result = await response.json();
      if (id !== epoch.current) return;
      if (!response.ok)
        throw new Error(
          result.error || "Source search is unavailable. Try again.",
        );
      setSearchResult(result);
    } catch (error) {
      if (id === epoch.current && !controller.signal.aborted)
        setSearchError(
          error instanceof Error
            ? error.message
            : "Could not search sources. Try again.",
        );
    } finally {
      if (id === epoch.current) setPending(false);
    }
  }

  return (
    <section className={styles.researchPrompt}>
      <span className={styles.promptIcon}>
        <Icon name="search" size={21} />
      </span>
      <div>
        <h3>Have a specific question?</h3>
        <p>Search this company’s selected source summaries.</p>
      </div>
      <form onSubmit={findEvidence} className={styles.questionForm}>
        <label className={styles.srOnly} htmlFor="research-question">
          Question or claim to research
        </label>
        <input
          id="research-question"
          value={query}
          maxLength={500}
          minLength={3}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`e.g. What could affect ${company.name}’s growth?`}
          required
        />
        <button type="submit" disabled={pending || query.trim().length < 3}>
          {pending ? "Searching…" : "Search sources"}
          <Icon name="arrow" size={16} />
        </button>
        {liveAiAvailable && (
          <label className={styles.aiConsent}>
            <input
              type="checkbox"
              checked={useAi}
              onChange={(event) => setUseAi(event.target.checked)}
            />
            Use AI to search and explain sources. Sends this question and public
            source notes to OpenAI; your notebook stays out.
          </label>
        )}
      </form>
      <div className={styles.suggestions}>
        {[
          "How does it make money?",
          "What are the risks?",
          "What supports growth?",
        ].map((suggestion) => (
          <button key={suggestion} onClick={() => setQuery(suggestion)}>
            {suggestion}
            <Icon name="arrow" size={12} />
          </button>
        ))}
      </div>
      <small>
        Searches selected FY2025 source notes. No live prices or forecasts.
      </small>
      {searchError && (
        <p className={styles.error} role="alert">
          {searchError}
        </p>
      )}
      {searchResult && (
        <section className={styles.searchResults} aria-label="Research results">
          <span className={styles.eyebrow}>
            {searchResult.mode === "ai"
              ? "AI INTERPRETATION · CHECK THE SOURCES"
              : "SOURCE SEARCH · CURATED NOTES"}
          </span>
          {searchResult.retrieval && (
            <p role="status">
              {searchResult.retrieval.engine === "offline"
                ? "Searching the bundled library. The research service is unavailable or disabled."
                : searchResult.retrieval.strategy === "hybrid"
                  ? "Searched by keywords and meaning."
                  : searchResult.retrieval.strategy === "lexical_fallback"
                    ? "Meaning-based search is unavailable. Showing keyword matches."
                    : "Searched by keywords."}
            </p>
          )}
          {!searchResult.evidenceIds.length ? (
            <>
              <h4>These notes cannot answer that question</h4>
              <p>
                Try a question about the business, growth drivers or disclosed
                risks. This limited library cannot establish current prices or
                future returns.
              </p>
            </>
          ) : (
            <>
              {searchResult.interpretation && (
                <p>{searchResult.interpretation}</p>
              )}
              {searchResult.notice && <p>{searchResult.notice}</p>}
              {searchResult.evidenceIds
                .map((id) => company.evidence.find((note) => note.id === id))
                .filter((note): note is EvidenceNote => Boolean(note))
                .map((note) => (
                  <button key={note.id} onClick={() => explore(note)}>
                    <Icon name="book" size={16} />
                    <span>
                      <strong>{note.title}</strong>
                      <small>{note.summary}</small>
                    </span>
                    <Icon name="chevron" size={15} />
                  </button>
                ))}
              {searchResult.unknowns.length > 0 && (
                <div className={styles.resultLimits}>
                  <strong>Keep in mind</strong>
                  <ul>
                    {searchResult.unknowns.map((unknown, index) => (
                      <li key={index}>{unknown}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </section>
  );
}
