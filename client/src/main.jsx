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
  matchScore: 78,
  matchedSkills: ["react", "node", "express", "mongodb", "openai"],
  missingSkills: ["testing", "docker"],
  tailoredCvSuggestions: [
    "Move React, Node, Express, and MongoDB into the top skills summary so the recruiter sees the strongest overlap immediately.",
    "Add honest adjacent experience for testing and Docker or include a short learning/project note if you are building these skills.",
    "Rewrite two recent role bullets to include measurable outcomes, scope, and the tools used."
  ],
  coverLetter:
    "Dear Hiring Manager,\n\nI am excited to apply for this role. My background aligns strongly with the role through hands-on experience in React, Node, Express, MongoDB, and OpenAI integrations.\n\nIn previous work, I have translated ambiguous needs into practical implementations, collaborated across technical and non-technical stakeholders, and kept delivery focused on measurable outcomes.\n\nThank you for your time and consideration. I would welcome the chance to discuss how my experience can support your hiring goals.\n\nSincerely,",
  interviewQuestions: [
    "Tell me about a project where you used React to solve a business problem.",
    "How would you design the backend for an agent-based workflow?",
    "How do you evaluate whether generated content is reliable enough to send?",
    "What tradeoffs would you make between speed, accuracy, and explainability?"
  ],
  agentTrace: [{ tool: "ai_cv_job_analysis", status: "completed" }]
};
const defaultAgentTrace = [
  { tool: "read_cv", status: "completed" },
  { tool: "read_job_description", status: "completed" },
  { tool: "extract_role_requirements", status: "completed" },
  { tool: "compare_cv_evidence", status: "completed" },
  { tool: "score_match", status: "completed" },
  { tool: "identify_skill_gaps", status: "completed" },
  { tool: "draft_cover_letter", status: "completed" },
  { tool: "prepare_interview_questions", status: "completed" }
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
          tool: step.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
          status: "completed"
        };
      }

      return {
        tool: step?.tool || step?.name || step?.step || "ai_analysis",
        status: step?.status || "completed"
      };
    })
    .filter((step) => step.tool);

  const uniqueTools = new Set(normalized.map((step) => step.tool));
  return normalized.length && uniqueTools.size > 1 ? normalized : defaultAgentTrace;
}

function normalizeResult(nextResult) {
  return {
    ...nextResult,
    agentTrace: normalizeTrace(nextResult?.agentTrace)
  };
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
                        {run.result?.matchScore ?? "--"}% match
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
        <Panel icon={Target} title="Match Score">
          <div className="scoreLayout">
            <ScoreRing score={result.matchScore || 0} />
            <div>
              <h3>{result.roleTitle || "Role alignment"}</h3>
              <p>
                {result.companyName
                  ? `Prepared for ${result.companyName}. The score reflects the AI comparison between the selected CV and job details.`
                  : "The score reflects the AI comparison between the selected CV and job details."}
              </p>
            </div>
          </div>
        </Panel>

        <Panel icon={CheckCircle2} title="Matched Skills">
          <PillList items={result.matchedSkills || []} emptyLabel="No matched skills detected yet." />
        </Panel>

        <Panel icon={BriefcaseBusiness} title="Missing Skills">
          <PillList items={result.missingSkills || []} emptyLabel="No obvious gaps found." />
        </Panel>

        <Panel icon={FileText} title="Tailored CV Suggestions">
          <ul className="cleanList">
            {(result.tailoredCvSuggestions || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>

        <Panel icon={MessageSquareText} title="Cover Letter">
          <pre className="letter">{result.coverLetter}</pre>
        </Panel>

        <Panel icon={Sparkles} title="Interview Questions">
          <ul className="cleanList">
            {(result.interviewQuestions || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>

        <section className="tracePanel">
          <h2>Agent Trace</h2>
          <div className="traceList">
            {(result.agentTrace || []).map((step, index) => (
              <div className="traceItem" key={`${step.tool}-${step.status}-${index}`}>
                <CheckCircle2 size={16} />
                <span>{step.tool.replaceAll("_", " ")}</span>
                <small>{step.status}</small>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
