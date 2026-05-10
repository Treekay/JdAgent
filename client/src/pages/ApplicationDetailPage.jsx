import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, ExternalLink } from "lucide-react";
import { fetchInitialData, updateRunStage } from "../api.js";
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
import { RequirementList } from "../components/results/RequirementList.jsx";
import { TracePanel } from "../components/results/TracePanel.jsx";

function currentAction(run) {
  const status = getRunStatus(run);

  if (status === "saved") return "Review the match gaps, then finalize resume and cover letter.";
  if (status === "applied") return "Prepare follow-up notes and rehearse likely screening questions.";
  if (status === "interview") return "Focus on interview prep and STAR examples for missing requirements.";
  return "Record the outcome and turn lessons into the next application plan.";
}

function coachChecklist(run, result) {
  const status = getRunStatus(run);
  const missingItems = (result.missingRequirements || []).slice(0, 2).map((item) => item.name);

  if (status === "saved") {
    return [
      "Decide whether this role is worth applying to.",
      "Use the Resume tab to review the tailored draft.",
      missingItems.length
        ? `Patch visible gaps first: ${missingItems.join(", ")}.`
        : "Keep evidence specific and measurable before applying."
    ];
  }

  if (status === "applied") {
    return [
      "Prepare a short follow-up note for this company.",
      "Turn top matched requirements into two interview stories.",
      "Review missing requirements so you can address them honestly if asked."
    ];
  }

  if (status === "interview") {
    return [
      "Rehearse one STAR story for each high-priority requirement.",
      "Prepare a concise answer for the largest missing requirement.",
      "Write three questions to ask the interviewer about this role."
    ];
  }

  return [
    "Record whether the outcome was offer, rejection, or pending.",
    "Save one lesson from this application for future tailoring.",
    "Compare this role's fit score with your next target role."
  ];
}

function daysSince(value) {
  if (!value) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
}

function uniqueRequirementNames(items) {
  return [...new Set((items || []).map((item) => item.name).filter(Boolean))].slice(0, 8);
}

function resultAdvice(result) {
  const missing = (result.missingRequirements || []).length;
  const score = result.fitScore || result.matchScore || 0;

  return [
    score < 70
      ? "Resume targeting likely needs more evidence against the core requirements."
      : "Resume targeting is reasonably strong; focus on sharper examples and outcomes.",
    missing
      ? "Skill gaps are visible. Build one small project or portfolio proof for the highest-priority gap."
      : "Skill coverage looks healthy. Keep improving measurable achievement bullets.",
    "For interview performance, record which questions felt weak and turn them into rehearsal prompts.",
    "For writing quality, compare the cover letter against the JD wording and remove generic claims."
  ];
}

function PreparingDetail({ onOpenModule, result, run }) {
  return (
    <section className="detailStageGrid">
      <section className="panel detailSinglePanel">
        <h2>Match Summary</h2>
        <div className="detailMetricRow">
          <strong>{result.fitScore || result.matchScore || 0}%</strong>
          <span>Fit score based on weighted requirement coverage</span>
        </div>
      </section>

      <section className="panel detailSinglePanel">
        <h2>Keywords & Key Skills</h2>
        <div className="keywordList">
          {uniqueRequirementNames(result.matchedRequirements).map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </section>

      <section className="panel detailSinglePanel">
        <h2>Missing Requirements</h2>
        <RequirementList
          items={(result.missingRequirements || []).slice(0, 4)}
          emptyLabel="No missing requirements found."
        />
      </section>

      <section className="panel detailSinglePanel">
        <h2>Resume Suggestions</h2>
        <ul className="cleanList">
          {(result.recommendations || []).slice(0, 5).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="detailEntryCards">
        <button type="button" onClick={() => onOpenModule?.("resume", run._id)}>
          Generate targeted resume
        </button>
        <button type="button" onClick={() => onOpenModule?.("cover", run._id)}>
          Generate cover letter & email
        </button>
      </section>
    </section>
  );
}

function AppliedDetail({ result, run }) {
  return (
    <section className="detailStageGrid">
      <section className="panel detailSinglePanel">
        <h2>Application Timing</h2>
        <div className="detailMetricRow">
          <strong>{daysSince(run.createdAt)}</strong>
          <span>days since this application was created</span>
        </div>
      </section>
      <section className="panel detailSinglePanel">
        <h2>Interview Preparation</h2>
        <ul className="cleanList">
          {(result.interviewPrep || []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="panel detailSinglePanel">
        <h2>Follow-up Focus</h2>
        <ul className="cleanList">
          <li>Prepare a concise follow-up note if there is no reply after a reasonable window.</li>
          <li>Convert matched requirements into two concrete project stories.</li>
          <li>Prepare an honest explanation for the highest-priority missing requirement.</li>
        </ul>
      </section>
    </section>
  );
}

function InterviewDetail({ result }) {
  return (
    <section className="detailStageGrid">
      <section className="panel detailSinglePanel">
        <h2>Interview Notes</h2>
        <textarea
          className="detailTextarea"
          placeholder="Record interview date, interviewer, questions asked, your answers, and follow-up items..."
        />
      </section>
      <section className="panel detailSinglePanel">
        <h2>Feedback Focus</h2>
        <ul className="cleanList">
          {(result.interviewPrep || []).slice(0, 4).map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>After the interview, mark which answers were strong, weak, or incomplete.</li>
        </ul>
      </section>
      <section className="panel detailSinglePanel">
        <h2>Coach Feedback</h2>
        <p className="detailMuted">
          Use your notes to identify whether the gap is technical knowledge, communication,
          behavioral examples, or role understanding.
        </p>
      </section>
    </section>
  );
}

function ResultDetail({ result }) {
  return (
    <section className="detailStageGrid">
      <section className="panel detailSinglePanel">
        <h2>Application Retrospective</h2>
        <ul className="cleanList">
          {resultAdvice(result).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="panel detailSinglePanel">
        <h2>Likely Improvement Area</h2>
        <div className="keywordList">
          <span>Resume evidence</span>
          <span>Skill proof</span>
          <span>Interview performance</span>
          <span>Cover letter clarity</span>
        </div>
      </section>
      <section className="panel detailSinglePanel">
        <h2>Next Iteration</h2>
        <p className="detailMuted">
          Update one resume bullet, one portfolio proof, and one interview story before the next
          similar application.
        </p>
      </section>
    </section>
  );
}

function StageContent({ onOpenModule, result, run }) {
  const status = getRunStatus(run);

  if (status === "applied") return <AppliedDetail result={result} run={run} />;
  if (status === "interview") return <InterviewDetail result={result} run={run} />;
  if (status === "result") return <ResultDetail result={result} run={run} />;
  return <PreparingDetail result={result} run={run} onOpenModule={onOpenModule} />;
}

export function ApplicationDetailPage({ runId, onBack, onOpenModule }) {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(runId || "");
  const [activeTab, setActiveTab] = useState("stage");
  const [resumeTemplate, setResumeTemplate] = useState("compact");
  const [resumeAccent, setResumeAccent] = useState(resumeAccents[0]);
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

  async function updateStatus(status) {
    if (!selectedRun) return;

    try {
      const payload = await updateRunStage(selectedRun._id, status);
      setRuns((current) =>
        current.map((run) => (run._id === selectedRun._id ? { ...run, ...payload.run } : run))
      );
    } catch (statusError) {
      setError(statusError.message);
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
            <StageContent result={result} run={selectedRun} onOpenModule={onOpenModule} />
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
