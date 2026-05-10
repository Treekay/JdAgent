import React from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  FileText,
  History,
  Link,
  Loader2,
  MessageSquareText,
  Palette,
  Send,
  Sparkles,
  Target,
  Trash2,
  Upload
} from "lucide-react";
import { applicationStatuses, resumeAccents, resumeTemplates } from "./data.js";
import { formatRunDate, getRunStatus, getRunStatusLabel, getRunTitle } from "./resultUtils.js";

export function ScoreRing({ score }) {
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

export function Panel({ icon: Icon, title, children }) {
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

function MarkdownPreview({ content }) {
  const lines = (content || "").split("\n").filter((line) => line.trim());

  if (!lines.length) {
    return <p className="muted">Run the agent to generate a resume draft.</p>;
  }

  return lines.map((line, index) => {
    const trimmed = line.trim();
    const key = `${trimmed}-${index}`;

    if (trimmed.startsWith("### ")) {
      return <h4 key={key}>{trimmed.replace(/^###\s+/, "")}</h4>;
    }

    if (trimmed.startsWith("## ")) {
      return <h3 key={key}>{trimmed.replace(/^##\s+/, "")}</h3>;
    }

    if (trimmed.startsWith("- ")) {
      return (
        <p className="resumeBullet" key={key}>
          {trimmed.replace(/^-\s+/, "")}
        </p>
      );
    }

    return <p key={key}>{trimmed}</p>;
  });
}

function ResumePreview({ accent, content, template }) {
  return (
    <article className={`resumePreview ${template}`} style={{ "--resumeAccent": accent }}>
      <div className="resumeTopline" />
      <MarkdownPreview content={content} />
    </article>
  );
}

function ResumeTemplatePanel({ result, resumeAccent, resumeTemplate, onAccentChange, onTemplateChange }) {
  return (
    <Panel icon={Palette} title="Resume Template">
      <div className="templateToolbar">
        <div className="templateOptions">
          {resumeTemplates.map((template) => (
            <button
              className={resumeTemplate === template.id ? "active" : ""}
              key={template.id}
              type="button"
              onClick={() => onTemplateChange(template.id)}
            >
              {template.label}
            </button>
          ))}
        </div>
        <div className="accentOptions" aria-label="Resume accent color">
          {resumeAccents.map((accent) => (
            <button
              className={resumeAccent === accent ? "active" : ""}
              key={accent}
              style={{ background: accent }}
              type="button"
              aria-label={`Use accent ${accent}`}
              onClick={() => onAccentChange(accent)}
            />
          ))}
        </div>
        <button className="secondaryButton printButton" type="button" onClick={() => window.print()}>
          <Download size={16} />
          Save PDF
        </button>
      </div>
      <ResumePreview
        accent={resumeAccent}
        content={result.tailoredResume}
        template={resumeTemplate}
      />
    </Panel>
  );
}

function StageCoach({ result, selectedRun }) {
  const currentStatus = getRunStatus(selectedRun);
  const unlocked = currentStatus === "interview" || currentStatus === "result";

  return (
    <Panel icon={BriefcaseBusiness} title="Stage Coach">
      {selectedRun ? (
        <div className="stageCoach">
          <div>
            <strong>{getRunTitle(selectedRun)}</strong>
            <span>{getRunStatusLabel(selectedRun)}</span>
          </div>
          {unlocked ? (
            <>
              <p>Interview rehearsal is unlocked for this application.</p>
              <ul className="cleanList">
                {(result.interviewPrep || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>
              Move this application to Interview when you receive an invite. The prep material
              will appear here for focused rehearsal.
            </p>
          )}
        </div>
      ) : (
        <p className="muted">Select a tracked application to see its next action.</p>
      )}
    </Panel>
  );
}

export function ApplicationForm({
  canRun,
  cvFile,
  cvs,
  error,
  isLoadingData,
  isRunning,
  isUploadingCv,
  jobDescription,
  jobUrl,
  onCvFileChange,
  onDeleteCv,
  onDeleteRun,
  onJobDescriptionChange,
  onJobUrlChange,
  onLoadData,
  onRunAgent,
  onSelectCv,
  onSelectRun,
  onUpdateRunStatus,
  onUploadCv,
  runs,
  selectedCv,
  selectedCvId,
  status
}) {
  return (
    <form className="inputPanel" onSubmit={onRunAgent}>
      <section className="cvBlock">
        <div className="historyHeader">
          <div>
            <FileText size={18} />
            <span>Saved CVs</span>
          </div>
          <button type="button" onClick={onLoadData} disabled={isLoadingData}>
            {isLoadingData ? "Loading" : "Refresh"}
          </button>
        </div>

        <label className="uploadBox">
          <input
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={(event) => onCvFileChange(event.target.files?.[0] || null)}
          />
          <Upload size={24} />
          <strong>{cvFile ? cvFile.name : "Upload a new CV"}</strong>
          <span>TXT, PDF, or DOCX</span>
        </label>
        <button
          className="secondaryButton"
          type="button"
          disabled={!cvFile || isUploadingCv}
          onClick={onUploadCv}
        >
          {isUploadingCv ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
          Save CV
        </button>

        {cvs.length ? (
          <div className="recordList">
            {cvs.map((cv) => (
              <div className={`recordItem ${selectedCvId === cv._id ? "selected" : ""}`} key={cv._id}>
                <button type="button" onClick={() => onSelectCv(cv._id)}>
                  <span>{cv.fileName}</span>
                  <small>{cv.createdAt ? formatRunDate(cv.createdAt) : ""}</small>
                </button>
                <button
                  className="iconButton"
                  type="button"
                  aria-label={`Delete ${cv.fileName}`}
                  onClick={() => onDeleteCv(cv._id)}
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
            onChange={(event) => onJobUrlChange(event.target.value)}
            placeholder="https://..."
            type="url"
          />
        </div>
      </label>

      <label className="jdBox">
        <span>Job description</span>
        <textarea
          value={jobDescription}
          onChange={(event) => onJobDescriptionChange(event.target.value)}
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
            <span>Application Tracker</span>
          </div>
        </div>
        {runs.length ? (
          <div className="recordList">
            {runs.map((run) => (
              <div className="recordItem trackerItem" key={run._id}>
                <button type="button" onClick={() => onSelectRun(run)}>
                  <span>{getRunTitle(run)}</span>
                  <small>
                    {run.result?.fitScore ?? run.result?.matchScore ?? "--"}% fit
                    {run.createdAt ? ` - ${formatRunDate(run.createdAt)}` : ""} -{" "}
                    {getRunStatusLabel(run)}
                  </small>
                </button>
                <button
                  className="iconButton"
                  type="button"
                  aria-label={`Delete ${getRunTitle(run)}`}
                  onClick={() => onDeleteRun(run._id)}
                >
                  <Trash2 size={16} />
                </button>
                <div className="statusSteps" aria-label={`Status for ${getRunTitle(run)}`}>
                  {applicationStatuses.map((applicationStatus) => (
                    <button
                      className={`statusStep ${
                        getRunStatus(run) === applicationStatus.id ? "active" : ""
                      }`}
                      type="button"
                      key={applicationStatus.id}
                      onClick={() => onUpdateRunStatus(run._id, applicationStatus.id)}
                    >
                      {applicationStatus.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No saved runs yet.</p>
        )}
      </section>
    </form>
  );
}

export function Intro() {
  return (
    <div className="intro">
      <div className="brand">
        <span className="brandMark">
          <Sparkles size={20} />
        </span>
        <span>ApplyAgent</span>
      </div>
      <h1>Turn a saved CV and job description into a focused application pack.</h1>
      <p>
        Select an uploaded CV, paste a job description or link, and let the AI read both
        documents directly before drafting the application material.
      </p>
    </div>
  );
}

export function ResultsDashboard({
  result,
  resumeAccent,
  resumeTemplate,
  selectedRun,
  onAccentChange,
  onTemplateChange
}) {
  return (
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

      <StageCoach result={result} selectedRun={selectedRun} />

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

      <ResumeTemplatePanel
        result={result}
        resumeAccent={resumeAccent}
        resumeTemplate={resumeTemplate}
        onAccentChange={onAccentChange}
        onTemplateChange={onTemplateChange}
      />

      <Panel icon={MessageSquareText} title="Cover Letter">
        <pre className="letter">{result.coverLetter}</pre>
      </Panel>

      <Panel icon={BriefcaseBusiness} title="Interview Prep">
        <ul className="cleanList">
          {(result.interviewPrep || []).map((item) => (
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
  );
}
