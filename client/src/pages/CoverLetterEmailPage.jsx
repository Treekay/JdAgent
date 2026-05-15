import React, { useMemo } from "react";
import { RunSelector } from "../components/application/RunSelector.jsx";
import { getRunResult, getRunTitle } from "../resultUtils.js";
import { useRuns } from "../hooks/useRuns.js";

function emailDraft(run, result) {
  if (!run || !result) {
    return "";
  }

  const roleTitle = result.roleTitle || getRunTitle(run);
  const company = result.companyName ? ` at ${result.companyName}` : "";

  return [
    `Subject: Application for ${roleTitle}`,
    "",
    "Hi Hiring Team,",
    "",
    "I hope you are well.",
    "",
    `I am writing to apply for the ${roleTitle}${company}. I have attached my resume and cover letter for your review.`,
    "",
    "The role looks closely aligned with the kind of work I am preparing for, and I would appreciate the opportunity to be considered.",
    "",
    "Thank you for your time and consideration.",
    "",
    "Best regards,"
  ].join("\n");
}

export function CoverLetterEmailPage({ initialRunId = "" }) {
  const { error, runs, selectedRun, selectedRunId, setSelectedRunId } = useRuns(initialRunId);
  const result = useMemo(() => (selectedRun ? getRunResult(selectedRun) : null), [selectedRun]);

  return (
    <main className="pageShell">
      <section className="pageHeader compactHeader">
        <div>
          <span>Cover letter & email</span>
          <h1>Prepare role-specific outreach material.</h1>
        </div>
        <p>
          Select a target job to review the generated cover letter and a lightweight email draft.
        </p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="moduleGrid">
        <aside className="moduleControls">
          <h2>Target setup</h2>
          <RunSelector
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={setSelectedRunId}
          />
          <p>
            Future versions can add tone, length, and recruiter name controls here without changing
            the generated application record.
          </p>
        </aside>

        <section className="moduleStack">
          <article className="panel detailSinglePanel">
            <h2>Cover Letter</h2>
            <pre className="letter">{result?.coverLetter || "Select a target job first."}</pre>
          </article>
          <article className="panel detailSinglePanel">
            <h2>Email Draft</h2>
            <pre className="letter">{emailDraft(selectedRun, result) || "Select a target job first."}</pre>
          </article>
        </section>
      </section>
    </main>
  );
}
