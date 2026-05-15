import React, { useMemo, useState } from "react";
import { RunSelector } from "../components/application/RunSelector.jsx";
import { AnalysisReport } from "../components/results/AnalysisReport.jsx";
import { getRunResult, getRunStatus, getRunTitle } from "../resultUtils.js";
import { useRuns } from "../hooks/useRuns.js";

function coachSummary(run, result) {
  if (!run || !result) {
    return "Select a target job to see coach guidance.";
  }

  if (run.coachInsights?.summary) {
    return run.coachInsights.summary;
  }

  const status = getRunStatus(run);
  const missing = (result.missingRequirements || []).slice(0, 2).map((item) => item.name);

  if (status === "saved") {
    return missing.length
      ? `Before applying, patch these visible gaps: ${missing.join(", ")}.`
      : "This role is ready for resume and cover letter review before applying.";
  }

  if (status === "applied") {
    return "Prepare follow-up notes and convert matched requirements into interview stories.";
  }

  if (status === "interview") {
    return "Prioritize STAR examples and rehearse answers around the missing requirements.";
  }

  return "Record the result, summarize lessons, and compare this role with your next target.";
}

export function AnalysisModulePage({ onOpenRun }) {
  const { error, runs, selectedRun, selectedRunId, setSelectedRunId } = useRuns();
  const [showTrace, setShowTrace] = useState(false);
  const result = useMemo(() => (selectedRun ? getRunResult(selectedRun) : null), [selectedRun]);

  return (
    <main className="pageShell">
      <section className="pageHeader compactHeader">
        <div>
          <span>Analysis & Coach</span>
          <h1>Review fit, gaps, evidence, and next action.</h1>
        </div>
        <p>
          Analysis is scoped to one target job so recommendations stay tied to its current
          application stage.
        </p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="moduleGrid">
        <aside className="moduleControls">
          <h2>Target application</h2>
          <RunSelector
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={setSelectedRunId}
          />
          <div className="coachNote">
            <strong>{selectedRun ? getRunTitle(selectedRun) : "No target selected"}</strong>
            <p>{coachSummary(selectedRun, result)}</p>
            {selectedRun?.coachInsights?.nextActions?.length ? (
              <ul className="cleanList">
                {selectedRun.coachInsights.nextActions.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {selectedRun ? (
            <button className="secondaryButton" type="button" onClick={() => onOpenRun?.(selectedRun._id)}>
              Open detail view
            </button>
          ) : null}
        </aside>

        {result ? (
          <AnalysisReport
            result={result}
            showTrace={showTrace}
            onToggleTrace={() => setShowTrace((current) => !current)}
          />
        ) : (
          <section className="emptyState">
            <h2>No analysis selected</h2>
            <p>Run a match from Dashboard, then return here for the analysis and coach view.</p>
          </section>
        )}
      </section>
    </main>
  );
}
