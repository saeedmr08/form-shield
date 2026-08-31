"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Issue = { field: string; message: string };

type Submission = {
  id: string;
  encryptedFields: Record<string, string>;
  createdAt: number;
  retainUntil: number;
};

const VALID = {
  name: "Ada Northwind",
  email: "ada@northwind.example",
  message: "Please schedule a follow-up on the Northwind invoice this week.",
};

function trunc(value: string, n = 28): string {
  return value.length > n ? `${value.slice(0, n)}…` : value;
}

export default function HomePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const loadInbox = useCallback(async () => {
    const res = await fetch("/api/submissions");
    const data = (await res.json()) as { submissions?: Submission[] };
    const rows = data.submissions ?? [];
    rows.sort((a, b) => b.createdAt - a.createdAt);
    setSubmissions(rows);
  }, []);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  async function submitFields(fields: {
    name: string;
    email: string;
    message: string;
    companyHoneypot: string;
  }) {
    setBusy(true);
    setIssues([]);
    setResult("");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        id?: string;
        remaining?: number;
        retainUntil?: number;
        error?: string;
        issues?: Issue[];
      };
      if (res.status === 429) {
        setResult("Rate limited — try again shortly.");
        return;
      }
      if (data.issues) {
        setIssues(data.issues);
        return;
      }
      if (!res.ok) {
        setResult(data.error ?? "Submit failed");
        return;
      }
      if (data.id === "dropped") {
        setResult("Accepted dropped.");
      } else {
        setResult(
          `Accepted ${data.id}. Remaining this window: ${data.remaining}. Retained until ${new Date(data.retainUntil ?? 0).toLocaleString()}.`,
        );
        setName("");
        setEmail("");
        setMessage("");
        setCompanyUrl("");
      }
      await loadInbox();
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submitFields({
      name,
      email,
      message,
      companyHoneypot: companyUrl,
    });
  }

  function fillValid() {
    setName(VALID.name);
    setEmail(VALID.email);
    setMessage(VALID.message);
    setCompanyUrl("");
    setIssues([]);
    setResult("");
  }

  async function showValidation() {
    const fields = {
      name: VALID.name,
      email: "ada-at-northwind",
      message: "hi",
      companyHoneypot: "",
    };
    setName(fields.name);
    setEmail(fields.email);
    setMessage(fields.message);
    setCompanyUrl("");
    await submitFields(fields);
  }

  async function honeypotBot() {
    const fields = {
      name: VALID.name,
      email: VALID.email,
      message: VALID.message,
      companyHoneypot: "http://spam.example",
    };
    setName(fields.name);
    setEmail(fields.email);
    setMessage(fields.message);
    setCompanyUrl(fields.companyHoneypot);
    await submitFields(fields);
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="brand">FormShield</p>
        <h1>Hard edges for soft inputs.</h1>
        <p className="lede">
          Validate, trap bots, throttle bursts, encrypt fields at rest (simulated), then forget on schedule.
        </p>
      </section>

      <div className="demos">
        <button type="button" disabled={busy} onClick={fillValid}>
          Fill valid
        </button>
        <button type="button" disabled={busy} onClick={() => void showValidation()}>
          Show validation
        </button>
        <button type="button" disabled={busy} onClick={() => void honeypotBot()}>
          Honeypot bot
        </button>
      </div>

      <div className="split">
        <div className="left">
          <form className="form" onSubmit={onSubmit} noValidate>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              Message
              <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <label className="hp" aria-hidden="true">
              Company URL
              <input
                tabIndex={-1}
                autoComplete="off"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
              />
            </label>
            {issues.length > 0 && (
              <ul className="issues">
                {issues.map((i) => (
                  <li key={i.field}>
                    {i.field}: {i.message}
                  </li>
                ))}
              </ul>
            )}
            <button type="submit" disabled={busy}>
              {busy ? "Shielding…" : "Submit behind the shield"}
            </button>
          </form>

          {result && <p className="result">{result}</p>}
        </div>

        <aside className="inbox">
          <h2>Inbox</h2>
          {submissions.length === 0 ? (
            <p className="empty">
              No submissions yet — the inbox stays empty until a human form passes validation.
            </p>
          ) : (
            <ul className="inbox-list">
              {submissions.map((row) => (
                <li key={row.id}>
                  <code>{row.id}</code>
                  <p>Created {new Date(row.createdAt).toLocaleString()}</p>
                  <p>Retain until {new Date(row.retainUntil).toLocaleString()}</p>
                  <dl>
                    {Object.entries(row.encryptedFields).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{trunc(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <style jsx>{`
        .page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 3.25rem 1.25rem 4rem;
        }
        .hero {
          margin-bottom: 1.35rem;
          animation: slide 0.65s ease both;
        }
        .brand {
          font-family: var(--font-syne), var(--font-display);
          font-size: clamp(2.6rem, 9vw, 3.8rem);
          font-weight: 700;
          letter-spacing: -0.04em;
          margin: 0;
          color: var(--copper-bright);
          line-height: 0.95;
        }
        h1 {
          font-family: var(--font-syne), var(--font-display);
          font-size: clamp(1.2rem, 3vw, 1.55rem);
          font-weight: 600;
          max-width: 16ch;
          margin: 0.85rem 0 0.65rem;
        }
        .lede {
          margin: 0;
          color: var(--steel);
          max-width: 38ch;
        }
        .demos {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .demos button {
          justify-self: start;
          margin-top: 0;
          background: transparent;
          color: var(--copper-bright);
          border: 1px solid #3d444c;
          font: inherit;
          font-weight: 600;
          padding: 0.55rem 0.85rem;
          cursor: pointer;
          clip-path: none;
          transition: background 0.15s, border-color 0.15s;
        }
        .demos button:hover:not(:disabled) {
          background: color-mix(in srgb, var(--copper) 18%, transparent);
          border-color: var(--copper);
          transform: none;
        }
        .split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.75rem;
          align-items: start;
        }
        .form {
          display: grid;
          gap: 1rem;
          animation: slide 0.8s ease both;
        }
        label {
          display: grid;
          gap: 0.35rem;
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--steel);
        }
        input,
        textarea {
          font: inherit;
          text-transform: none;
          letter-spacing: normal;
          background: var(--plate);
          border: 1px solid #3d444c;
          color: var(--spark);
          padding: 0.75rem 0.85rem;
        }
        input:focus,
        textarea:focus {
          outline: 2px solid color-mix(in srgb, var(--copper) 70%, white);
          border-color: var(--copper);
        }
        .hp {
          position: absolute;
          left: -10000px;
          opacity: 0;
          height: 0;
          overflow: hidden;
        }
        button {
          justify-self: start;
          margin-top: 0.35rem;
          background: var(--copper);
          color: #1a120c;
          border: none;
          font: inherit;
          font-weight: 700;
          padding: 0.85rem 1.25rem;
          cursor: pointer;
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
          transition: background 0.15s, transform 0.15s;
        }
        button:hover:not(:disabled) {
          background: var(--copper-bright);
          transform: translateX(2px);
        }
        button:disabled {
          opacity: 0.65;
          cursor: wait;
        }
        .issues {
          margin: 0;
          padding-left: 1.1rem;
          color: #f0a090;
        }
        .result {
          margin-top: 1.25rem;
          padding: 0.9rem 0;
          border-top: 1px solid #3d444c;
          color: var(--steel);
          animation: slide 0.4s ease both;
        }
        .inbox {
          background: var(--plate);
          border: 1px solid #3d444c;
          padding: 1.15rem 1.2rem 1.3rem;
          animation: slide 0.8s ease both;
        }
        .inbox h2 {
          font-family: var(--font-syne), var(--font-display);
          font-size: 1.05rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin: 0 0 0.85rem;
          color: var(--copper-bright);
        }
        .empty {
          margin: 0;
          color: var(--steel);
          font-size: 0.92rem;
          line-height: 1.45;
        }
        .inbox-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 1rem;
        }
        .inbox-list li {
          border-top: 1px solid #3d444c;
          padding-top: 0.85rem;
        }
        .inbox-list li:first-child {
          border-top: none;
          padding-top: 0;
        }
        .inbox-list code {
          font-size: 0.78rem;
          color: var(--spark);
        }
        .inbox-list p {
          margin: 0.25rem 0 0;
          font-size: 0.78rem;
          color: var(--steel);
        }
        .inbox-list dl {
          margin: 0.55rem 0 0;
          display: grid;
          gap: 0.25rem;
        }
        .inbox-list dl div {
          display: grid;
          grid-template-columns: 6.5rem 1fr;
          gap: 0.4rem;
          font-size: 0.78rem;
        }
        .inbox-list dt {
          color: var(--steel);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .inbox-list dd {
          margin: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: var(--spark);
          word-break: break-all;
        }
        @keyframes slide {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @media (max-width: 800px) {
          .split {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
