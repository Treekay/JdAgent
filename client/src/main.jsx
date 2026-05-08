import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  History,
  Link,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  Target,
  Trash2,
  Upload
} from "lucide-react";
import "./styles.css";

const sampleResult = {
  companyName: "",
  roleTitle: "this role",
  fitScore: 78,
  matchScore: 78,
  matchedRequirements: [
    {
      id: "demo_1",
      name: "React application experience",
      priority: "high",
      status: "matched",
      rationale: "The CV includes React project work.",
      evidence: ["Built user-facing React interfaces."]
    },
    {
      id: "demo_2",
      name: "Node API experience",
      priority: "medium",
      status: "matched",
      rationale: "The CV includes Node and Express experience.",
      evidence: ["Implemented API workflows with Node and Express."]
    }
  ],
  missingRequirements: [
    {
      id: "demo_3",
      name: "Docker production experience",
      priority: "medium",
      status: "missing",
      rationale: "No Docker evidence was found in the demo CV.",
      evidence: []
    }
  ],
  evidence: [
    {
      requirementId: "demo_1",
      requirementName: "React application experience",
      evidence: "Built user-facing React interfaces."
    }
  ],
  recommendations: [
    "Move React, Node, Express, and MongoDB into the top skills summary so the recruiter sees the strongest overlap immediately.",
    "Add honest adjacent experience for testing and Docker or include a short learning/project note if you are building these skills.",
    "Rewrite two recent role bullets to include measurable outcomes, scope, and the tools used."
  ],
  finalReport:
    "## Demo Fit Report\n\nThe candidate shows strong alignment with the React and Node portions of the role. The main improvement area is adding concrete Docker or deployment evidence before applying.",
  agentTrace: []
};
const defaultAgentTrace = [
  { id: "parse_resume", name: "Parse Resume", status: "completed", summary: "Demo resume parsed" },
  { id: "parse_job_description", name: "Parse Job Description", status: "completed", summary: "Demo JD parsed" },
  { id: "extract_candidate_profile", name: "Extract Candidate Profile", status: "completed", summary: "Candidate profile extracted" },
  { id: "extract_job_requirements", name: "Extract Job Requirements", status: "completed", summary: "Requirements extracted" },
  { id: "match_requirements", name: "Match Requirements", status: "completed", summary: "Requirements matched" },
  { id: "calculate_fit_score", name: "Calculate Fit Score", status: "completed", summary: "Weighted score calculated" },
  { id: "generate_recommendations", name: "Generate Recommendations", status: "completed", summary: "Recommendations generated" },
  { id: "generate_final_report", name: "Generate Final Report", status: "completed", summary: "Final report generated" }
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function apiJson(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

function ScoreRing({ score }) {
  const angle = Math.max(0, Math.min(score, 100)) * 3.6;
  return (
    <div
      className="scoreRing"
      style={{
        background: `conic-gradient(#13a881 ${angle}deg, #dde7e3 ${angle}deg)`
      }}
      aria-label={`Match score ${score}%`}
    >
      <div>
        <strong>{score}</strong>
        <span>%</span>
      </div>
    </div>
  );
}

function PillList({ items, emptyLabel }) {
  if (!items?.length) {
    return <p className="muted">{emptyLabel}</p>;
  }

  return (
    <div className="pillList">
      {items.map((item) => (
        <span className="pill" key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}

function Panel({ icon: Icon, title, children }) {
  return (
    <section className="panel">
      <div className="panelTitle">
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function formatRunDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getRunResult(run) {
  return normalizeResult({
    id: run._id,
    ...(run.result || {}),
    companyName: run.companyName || run.result?.companyName || "",
    roleTitle: run.roleTitle || run.result?.roleTitle || ""
  });
}

function getRunTitle(run) {
  if (run.displayTitle) return run.displayTitle;

  const companyName = run.companyName || run.result?.companyName;
  const roleTitle = run.roleTitle || run.result?.roleTitle;

  if (companyName && roleTitle) return `${companyName} - ${roleTitle}`;
  return companyName || roleTitle || "Saved match";
}

function normalizeTrace(trace) {
  if (!Array.isArray(trace)) {
    return defaultAgentTrace;
  }

  const normalized = trace
    .map((step) => {
      if (typeof step === "string") {
        return {
          id: step.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
          name: step,
          status: "completed",
          summary: ""
        };
      }

      return {
        id: step?.id || step?.tool || step?.name || step?.step || "agent_step",
        name: step?.name || step?.tool || step?.step || "Agent Step",
        status: step?.status || "completed",
        summary: step?.summary || "",
        startedAt: step?.startedAt || null,
        completedAt: step?.completedAt || null
      };
    })
    .filter((step) => step.name);

  const uniqueNames = new Set(normalized.map((step) => step.name));
  return normalized.length && uniqueNames.size > 1 ? normalized : defaultAgentTrace;
}

function requirementFromName(name, index, status) {
  return {
    id: `${status}_${index + 1}`,
    name,
    priority: "medium",
    status,
    rationale: "",
    evidence: []
  };
}

function normalizeResult(nextResult) {
  const matchedRequirements =
    nextResult?.matchedRequirements ||
    (nextResult?.matchedSkills || []).map((name, index) =>
      requirementFromName(name, index, "matched")
    );
  const missingRequirements =
    nextResult?.missingRequirements ||
    (nextResult?.missingSkills || []).map((name, index) =>
      requirementFromName(name, index, "missing")
    );

  return {
    ...nextResult,
    fitScore: nextResult?.fitScore ?? nextResult?.matchScore ?? 0,
    matchScore: nextResult?.matchScore ?? nextResult?.fitScore ?? 0,
    matchedRequirements,
    missingRequirements,
    evidence: nextResult?.evidence || [],
    recommendations: nextResult?.recommendations || nextResult?.tailoredCvSuggestions || [],
    finalReport: nextResult?.finalReport || nextResult?.coverLetter || "",
    agentTrace: normalizeTrace(nextResult?.agentTrace)
  };
}

function RequirementList({ items, emptyLabel }) {
  if (!items?.length) {
    return <p className="muted">{emptyLabel}</p>;
  }

  return (
    <div className="requirementList">
      {items.map((item) => (
        <article className="requirementItem" key={item.id || item.name}>
          <div>
            <strong>{item.name}</strong>
            <small>{item.priority || "medium"} priority</small>
          </div>
          {item.rationale ? <p>{item.rationale}</p> : null}
          {item.evidence?.length ? (
            <ul>
              {item.evidence.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function EvidenceList({ items }) {
  if (!items?.length) {
    return <p className="muted">No evidence items yet.</p>;
  }

  return (
    <ul className="cleanList">
      {items.map((item, index) => (
        <li key={`${item.requirementId || item.requirementName || "evidence"}-${index}`}>
          <strong>{item.requirementName || "Evidence"}:</strong> {item.evidence || item}
        </li>
      ))}
    </ul>
  );
}

function App() {
  const [cvFile, setCvFile] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [result, setResult] = useState(() => normalizeResult(sampleResult));
  const [runs, setRuns] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Demo output loaded");

  const canRun = Boolean(selectedCvId && (jobDescription.trim() || jobUrl.trim()) && !isRunning);

  const selectedCv = useMemo(
    () => cvs.find((cv) => cv._id === selectedCvId),
    [cvs, selectedCvId]
  );

  async function loadData() {
    setIsLoadingData(true);
    setError("");

    try {
      const [cvPayload, runPayload] = await Promise.all([
        apiJson("/api/cvs"),
        apiJson("/api/applications/runs")
      ]);
      const nextCvs = cvPayload.cvs || [];
      setCvs(nextCvs);
      setRuns(runPayload.runs || []);
      setSelectedCvId((currentId) => currentId || nextCvs[0]?._id || "");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoadingData(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function uploadCv() {
    if (!cvFile) return;

    setIsUploadingCv(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("cv", cvFile);
      const payload = await apiJson("/api/cvs", {
        method: "POST",
        body: formData
      });

      setCvs((current) => [payload.cv, ...current]);
      setSelectedCvId(payload.cv._id);
      setCvFile(null);
      setStatus("CV uploaded and selected");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploadingCv(false);
    }
  }

  async function deleteSelectedCv(id) {
    setError("");

    try {
      await apiJson(`/api/cvs/${id}`, { method: "DELETE" });
      setCvs((current) => {
        const next = current.filter((cv) => cv._id !== id);
        if (selectedCvId === id) {
          setSelectedCvId(next[0]?._id || "");
        }
        return next;
      });
      setStatus("CV deleted");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function deleteRun(id) {
    setError("");

    try {
      await apiJson(`/api/applications/runs/${id}`, { method: "DELETE" });
      setRuns((current) => current.filter((run) => run._id !== id));
      setStatus("Match record deleted");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function runAgent(event) {
    event.preventDefault();
    setError("");
    setStatus("AI is reading the CV and job details");
    setIsRunning(true);

    try {
      const payload = await apiJson("/api/applications/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cvId: selectedCvId,
          jobDescription,
          jobUrl
        })
      });

      setResult(normalizeResult(payload));
      setStatus("Latest run saved");
      await loadData();
    } catch (runError) {
      setError(runError.message);
      setStatus("");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="appShell">
      <section className="workspace">
        <div className="intro">
          <div className="brand">
            <span className="brandMark">
              <Sparkles size={20} />
            </span>
            <span>ApplyAgent</span>
          </div>
          <h1>Turn a saved CV and job description into a focused application pack.</h1>
          <p>
            Select an uploaded CV, paste a job description or link, and let the AI read
            both documents directly before drafting the application material.
          </p>
        </div>

        <form className="inputPanel" onSubmit={runAgent}>
          <section className="cvBlock">
            <div className="historyHeader">
              <div>
                <FileText size={18} />
                <span>Saved CVs</span>
              </div>
              <button type="button" onClick={loadData} disabled={isLoadingData}>
                {isLoadingData ? "Loading" : "Refresh"}
              </button>
            </div>

            <label className="uploadBox">
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={(event) => setCvFile(event.target.files?.[0] || null)}
              />
              <Upload size={24} />
              <strong>{cvFile ? cvFile.name : "Upload a new CV"}</strong>
              <span>TXT, PDF, or DOCX</span>
            </label>
            <button
              className="secondaryButton"
              type="button"
              disabled={!cvFile || isUploadingCv}
              onClick={uploadCv}
            >
              {isUploadingCv ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
              Save CV
            </button>

            {cvs.length ? (
              <div className="recordList">
                {cvs.map((cv) => (
                  <div className={`recordItem ${selectedCvId === cv._id ? "selected" : ""}`} key={cv._id}>
                    <button type="button" onClick={() => setSelectedCvId(cv._id)}>
                      <span>{cv.fileName}</span>
                      <small>{cv.createdAt ? formatRunDate(cv.createdAt) : ""}</small>
                    </button>
                    <button
                      className="iconButton"
                      type="button"
                      aria-label={`Delete ${cv.fileName}`}
                      onClick={() => deleteSelectedCv(cv._id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Upload a CV before running the agent.</p>
            )}
          </section>

          <label className="jdBox">
            <span>Job link</span>
            <div className="urlInput">
              <Link size={17} />
              <input
                value={jobUrl}
                onChange={(event) => setJobUrl(event.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
          </label>

          <label className="jdBox">
            <span>Job description</span>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the job description here if you are not using a link..."
            />
          </label>

          <button className="runButton" type="submit" disabled={!canRun}>
            {isRunning ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            Run AI Match
          </button>
          {error ? <p className="error">{error}</p> : <p className="status">{status}</p>}
          {selectedCv ? <p className="status">Selected CV: {selectedCv.fileName}</p> : null}

          <section className="historyBlock">
            <div className="historyHeader">
              <div>
                <History size={18} />
                <span>Previous matches</span>
              </div>
            </div>
            {runs.length ? (
              <div className="recordList">
                {runs.map((run) => (
                  <div className="recordItem" key={run._id}>
                    <button type="button" onClick={() => setResult(getRunResult(run))}>
                      <span>{getRunTitle(run)}</span>
                      <small>
                        {run.result?.fitScore ?? run.result?.matchScore ?? "--"}% fit
                        {run.createdAt ? ` - ${formatRunDate(run.createdAt)}` : ""}
                      </small>
                    </button>
                    <button
                      className="iconButton"
                      type="button"
                      aria-label={`Delete ${getRunTitle(run)}`}
                      onClick={() => deleteRun(run._id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No saved runs yet.</p>
            )}
          </section>
        </form>
      </section>

      <section className="resultsGrid">
        <Panel icon={Target} title="Fit Score">
          <div className="scoreLayout">
            <ScoreRing score={result.fitScore || result.matchScore || 0} />
            <div>
              <h3>{result.roleTitle || "Role alignment"}</h3>
              <p>
                {result.companyName
                  ? `Prepared for ${result.companyName}. The score is calculated from weighted requirement coverage.`
                  : "The score is calculated from weighted requirement coverage."}
              </p>
            </div>
          </div>
        </Panel>

        <Panel icon={CheckCircle2} title="Matched Requirements">
          <RequirementList
            items={result.matchedRequirements || []}
            emptyLabel="No matched requirements yet."
          />
        </Panel>

        <Panel icon={BriefcaseBusiness} title="Missing Requirements">
          <RequirementList
            items={result.missingRequirements || []}
            emptyLabel="No missing requirements found."
          />
        </Panel>

        <Panel icon={FileText} title="Evidence">
          <EvidenceList items={result.evidence || []} />
        </Panel>

        <Panel icon={Sparkles} title="Recommendations">
          <ul className="cleanList">
            {(result.recommendations || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>

        <Panel icon={MessageSquareText} title="Final Report">
          <pre className="letter">{result.finalReport}</pre>
        </Panel>

        <section className="tracePanel">
          <h2>Agent Trace</h2>
          <div className="traceList">
            {(result.agentTrace || []).map((step, index) => (
              <div className={`traceItem ${step.status}`} key={`${step.id}-${step.status}-${index}`}>
                <CheckCircle2 size={16} />
                <span>{step.name}</span>
                <small>{step.status}</small>
                {step.summary ? <p>{step.summary}</p> : null}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
