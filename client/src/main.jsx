import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  History,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  Target,
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
  agentTrace: [
    { tool: "extract_cv_profile", status: "completed" },
    { tool: "compare_job_requirements", status: "completed" },
    { tool: "identify_skill_gaps", status: "completed" },
    { tool: "draft_cover_letter", status: "completed" }
  ]
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

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
  return {
    id: run._id,
    companyName: run.companyName || run.result?.companyName || "",
    roleTitle: run.roleTitle || run.result?.roleTitle || "",
    ...(run.result || {})
  };
}

function getRunTitle(run) {
  const companyName = run.companyName || run.result?.companyName;
  const roleTitle = run.roleTitle || run.result?.roleTitle;

  if (companyName && roleTitle) return `${roleTitle} at ${companyName}`;
  return roleTitle || companyName || run.cvFileName || "Saved run";
}

function App() {
  const [cvFile, setCvFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(sampleResult);
  const [runs, setRuns] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  const canRun = Boolean(cvFile && jobDescription.trim() && !isRunning);

  const statusCopy = useMemo(() => {
    if (isRunning) return "Agent is comparing evidence, gaps, and application material";
    if (result?.id) return "Latest run saved";
    return "Demo output loaded";
  }, [isRunning, result]);

  async function loadRuns() {
    setIsLoadingRuns(true);
    setHistoryError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/applications/runs`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || "Could not load previous runs");
      }

      setRuns(payload.runs || []);
    } catch (loadError) {
      setHistoryError(loadError.message);
    } finally {
      setIsLoadingRuns(false);
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  async function runAgent(event) {
    event.preventDefault();
    setError("");
    setIsRunning(true);

    try {
      const formData = new FormData();
      formData.append("cv", cvFile);
      formData.append("jobDescription", jobDescription);

      const response = await fetch(`${API_BASE_URL}/api/applications/run`, {
        method: "POST",
        body: formData
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Agent run failed");
      }

      setResult(payload);
      await loadRuns();
    } catch (runError) {
      setError(runError.message);
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
          <h1>Turn a CV and job description into a focused application pack.</h1>
          <p>
            Upload a CV, paste the role, and run a small tool-based agent that
            produces the match score, gaps, CV edits, cover letter, and interview prep.
          </p>
        </div>

        <form className="inputPanel" onSubmit={runAgent}>
          <label className="uploadBox">
            <input
              type="file"
              accept=".txt,.pdf,.docx"
              onChange={(event) => setCvFile(event.target.files?.[0] || null)}
            />
            <Upload size={24} />
            <strong>{cvFile ? cvFile.name : "Upload CV"}</strong>
            <span>TXT, PDF, or DOCX</span>
          </label>

          <label className="jdBox">
            <span>Job description</span>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the job description here..."
            />
          </label>

          <button className="runButton" type="submit" disabled={!canRun}>
            {isRunning ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            Run Agent
          </button>
          {error ? <p className="error">{error}</p> : <p className="status">{statusCopy}</p>}

          <section className="historyBlock">
            <div className="historyHeader">
              <div>
                <History size={18} />
                <span>Previous matches</span>
              </div>
              <button type="button" onClick={loadRuns} disabled={isLoadingRuns}>
                {isLoadingRuns ? "Loading" : "Refresh"}
              </button>
            </div>
            {historyError ? <p className="error">{historyError}</p> : null}
            {!historyError && !runs.length ? (
              <p className="muted">No saved runs yet.</p>
            ) : (
              <div className="historyList">
                {runs.map((run) => (
                  <button
                    className="historyItem"
                    key={run._id}
                    type="button"
                    onClick={() => setResult(getRunResult(run))}
                  >
                    <span>{getRunTitle(run)}</span>
                    <small>
                      {run.result?.matchScore ?? "--"}% match
                      {run.createdAt ? ` · ${formatRunDate(run.createdAt)}` : ""}
                    </small>
                  </button>
                ))}
              </div>
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
                  ? `Prepared for ${result.companyName}. The score reflects detected overlap between CV evidence and job requirements.`
                  : "The score reflects detected overlap between CV evidence and job requirements, then the agent drafts supporting material from that analysis."}
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
            {(result.agentTrace || []).map((step) => (
              <div className="traceItem" key={step.tool}>
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
