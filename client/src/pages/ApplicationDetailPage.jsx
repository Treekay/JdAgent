import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, ExternalLink } from "lucide-react";
import { fetchInitialData, updateRunStage, updateRunStageData } from "../api.js";
import { applicationStatuses, resumeAccents } from "../data.js";
import {
  formatRunDate,
  getRunResult,
  getRunStatus,
  getRunStatusLabel,
  getRunTitle
} from "../resultUtils.js";
import { AnalysisReport } from "../components/results/AnalysisReport.jsx";
import { ResumeTemplatePanel } from "../components/results/ResumeTemplatePanel.jsx";
import { TracePanel } from "../components/results/TracePanel.jsx";
import {
  createStageDraft,
  StageContent
} from "../components/application/ApplicationStageDetails.jsx";

function currentAction(run) {
  const status = getRunStatus(run);

  if (status === "saved") return "Review the match gaps, then finalize resume and cover letter.";
  if (status === "applied") return "Prepare follow-up notes and rehearse likely screening questions.";
  if (status === "interview") return "Focus on interview prep and STAR examples for missing requirements.";
  return "Record the outcome and turn lessons into the next application plan.";
}

export function ApplicationDetailPage({ runId, onBack, onOpenModule }) {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(runId || "");
  const [activeTab, setActiveTab] = useState("stage");
  const [resumeTemplate, setResumeTemplate] = useState("compact");
  const [resumeAccent, setResumeAccent] = useState(resumeAccents[0]);
  const [stageDraft, setStageDraft] = useState(createStageDraft(null));
  const [savingStageData, setSavingStageData] = useState(false);
  const [stageMessage, setStageMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRuns() {
    try {
      const [, runPayload] = await fetchInitialData();
      const nextRuns = runPayload.runs || [];
      setRuns(nextRuns);
      setSelectedRunId((currentId) => currentId || runId || nextRuns[0]?._id || "");
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadRuns();
  }, [runId]);

  const selectedRun = useMemo(
    () => runs.find((run) => run._id === selectedRunId) || runs[0],
    [runs, selectedRunId]
  );
  const result = selectedRun ? getRunResult(selectedRun) : null;

  useEffect(() => {
    setStageDraft(createStageDraft(selectedRun));
    setStageMessage("");
  }, [selectedRun?._id]);

  function updateRunInState(nextRun) {
    setRuns((current) =>
      current.map((run) => (run._id === nextRun._id ? { ...run, ...nextRun } : run))
    );
  }

  function updateStageDraft(field, value) {
    setStageDraft((current) => ({ ...current, [field]: value }));
    setStageMessage("");
  }

  async function updateStatus(status) {
    if (!selectedRun) return;

    try {
      const payload = await updateRunStage(selectedRun._id, status);
      updateRunInState(payload.run);
    } catch (statusError) {
      setError(statusError.message);
    }
  }

  async function saveStageData() {
    if (!selectedRun) return;

    try {
      setSavingStageData(true);
      const payload = await updateRunStageData(selectedRun._id, stageDraft);
      updateRunInState(payload.run);
      setStageMessage("Saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingStageData(false);
    }
  }

  return (
    <main className="appShell pageShell">
      <button className="backButton" type="button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to Apply
      </button>

      {error ? <p className="error">{error}</p> : null}

      {selectedRun && result ? (
        <>
          <section className="detailHero">
            <div>
              <span>{getRunStatusLabel(selectedRun)}</span>
              <h1>{result.roleTitle || getRunTitle(selectedRun)}</h1>
              <p>
                {result.companyName || "Unknown company"}
                {selectedRun.createdAt ? ` - ${formatRunDate(selectedRun.createdAt)}` : ""}
              </p>
              {selectedRun.jobUrl ? (
                <a href={selectedRun.jobUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} />
                  Source job
                </a>
              ) : null}
            </div>
            <div className="detailScore">
              <strong>{result.fitScore || result.matchScore || 0}%</strong>
              <span>Fit score</span>
            </div>
          </section>

          <section className="detailStatus">
            {applicationStatuses.map((status) => (
              <button
                className={getRunStatus(selectedRun) === status.id ? "active" : ""}
                key={status.id}
                type="button"
                onClick={() => updateStatus(status.id)}
              >
                {status.label}
              </button>
            ))}
          </section>

          <section className="detailAction">
            <BriefcaseBusiness size={18} />
            <p>{currentAction(selectedRun)}</p>
            {stageMessage ? <span>{stageMessage}</span> : null}
          </section>

          <section className="detailTabs">
            {[
              { id: "stage", label: getRunStatusLabel(selectedRun) },
              { id: "analysis", label: "Full Analysis" },
              { id: "resume", label: "Resume" },
              { id: "cover", label: "Cover Letter" },
              { id: "trace", label: "Trace" }
            ].map((tab) => (
              <button
                className={activeTab === tab.id ? "active" : ""}
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </section>

          {activeTab === "stage" ? (
            <StageContent
              result={result}
              run={selectedRun}
              saving={savingStageData}
              stageDraft={stageDraft}
              onDraftChange={updateStageDraft}
              onOpenModule={onOpenModule}
              onSaveStageData={saveStageData}
            />
          ) : null}

          {activeTab === "analysis" ? (
            <AnalysisReport
              result={result}
              showTrace={false}
              onToggleTrace={() => setActiveTab("trace")}
            />
          ) : null}

          {activeTab === "resume" ? (
            <ResumeTemplatePanel
              result={result}
              resumeAccent={resumeAccent}
              resumeTemplate={resumeTemplate}
              onAccentChange={setResumeAccent}
              onTemplateChange={setResumeTemplate}
            />
          ) : null}

          {activeTab === "cover" ? (
            <section className="panel detailSinglePanel">
              <h2>Cover Letter</h2>
              <pre className="letter">{result.coverLetter}</pre>
            </section>
          ) : null}

          {activeTab === "trace" ? <TracePanel trace={result.agentTrace} /> : null}
        </>
      ) : (
        <section className="emptyState">
          <h2>No application selected</h2>
          <p>Run or select an application from the Apply page first.</p>
        </section>
      )}
    </main>
  );
}
