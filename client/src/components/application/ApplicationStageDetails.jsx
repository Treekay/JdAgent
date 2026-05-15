import React from "react";
import { getRunStatus } from "../../resultUtils.js";
import { RequirementList } from "../results/RequirementList.jsx";

const IMPROVEMENT_AREAS = [
  { id: "resume", label: "Resume evidence" },
  { id: "skills", label: "Skill proof" },
  { id: "interview", label: "Interview performance" },
  { id: "writing", label: "Cover letter clarity" }
];

function daysSince(value) {
  if (!value) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
}

function appliedTimeLabel(run) {
  const appliedHistory = (run.statusHistory || [])
    .slice()
    .reverse()
    .find((item) => item.status === "applied");
  const appliedAt = run.appliedAt || appliedHistory?.changedAt;
  const days = daysSince(appliedAt || run.createdAt);

  return {
    days,
    label: appliedAt ? "days since marked as applied" : "days since this application was created"
  };
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

function createEmptyInterviewRound(index = 0) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `round-${Date.now()}-${index}`,
    roundName: index ? `Round ${index + 1}` : "Round 1",
    date: "",
    interviewer: "",
    questions: "",
    feedback: ""
  };
}

function normalizeInterviewRounds(rounds) {
  return Array.isArray(rounds) && rounds.length ? rounds : [createEmptyInterviewRound()];
}

export function createStageDraft(run) {
  const stageData = run?.stageData || {};

  return {
    appliedNote: stageData.appliedNote || "",
    interviewNotes: stageData.interviewNotes || "",
    interviewFeedback: stageData.interviewFeedback || "",
    interviewRounds: normalizeInterviewRounds(stageData.interviewRounds),
    resultStatus: stageData.resultStatus || "",
    resultReason: stageData.resultReason || "",
    resultReflection: stageData.resultReflection || "",
    improvementAreas: Array.isArray(stageData.improvementAreas) ? stageData.improvementAreas : [],
    nextAction: stageData.nextAction || ""
  };
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

function AppliedDetail({ onDraftChange, onSave, result, run, saving, stageDraft }) {
  const timing = appliedTimeLabel(run);

  return (
    <section className="detailStageGrid">
      <section className="panel detailSinglePanel">
        <h2>Application Timing</h2>
        <div className="detailMetricRow">
          <strong>{timing.days}</strong>
          <span>{timing.label}</span>
        </div>
      </section>
      <section className="panel detailSinglePanel">
        <h2>Application Notes</h2>
        <textarea
          className="detailTextarea"
          value={stageDraft.appliedNote}
          placeholder="Record where you applied, follow-up timing, recruiter name, or anything that matters later..."
          onChange={(event) => onDraftChange("appliedNote", event.target.value)}
        />
        <button className="detailSaveButton" disabled={saving} type="button" onClick={onSave}>
          {saving ? "Saving..." : "Save applied notes"}
        </button>
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

function CoachInsightsPanel({ coachInsights, generatingCoach, onGenerateCoach }) {
  if (!coachInsights) {
    return (
      <section className="panel detailSinglePanel coachInsightsPanel">
        <div className="stageFormHeader">
          <h2>Coach Insight</h2>
          <button disabled={generatingCoach} type="button" onClick={onGenerateCoach}>
            {generatingCoach ? "Generating..." : "Generate coach"}
          </button>
        </div>
        <p className="detailMuted">
          Generate a stage-aware review after saving your latest application notes.
        </p>
      </section>
    );
  }

  return (
    <section className="panel detailSinglePanel coachInsightsPanel">
      <div className="stageFormHeader">
        <h2>Coach Insight</h2>
        <button disabled={generatingCoach} type="button" onClick={onGenerateCoach}>
          {generatingCoach ? "Refreshing..." : "Refresh coach"}
        </button>
      </div>
      <strong>{coachInsights.headline || "Application coach review"}</strong>
      {coachInsights.summary ? <p>{coachInsights.summary}</p> : null}
      <div className="coachInsightGrid">
        <section>
          <h3>Strengths</h3>
          <ul className="cleanList">
            {(coachInsights.strengths || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Risks</h3>
          <ul className="cleanList">
            {(coachInsights.risks || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Next Actions</h3>
          <ul className="cleanList">
            {(coachInsights.nextActions || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Focus Areas</h3>
          <div className="keywordList">
            {(coachInsights.focusAreas || []).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function InterviewRoundEditor({ index, onChange, onRemove, round, showRemove }) {
  return (
    <section className="interviewRound">
      <div className="stageFormHeader">
        <strong>{round.roundName || `Round ${index + 1}`}</strong>
        {showRemove ? (
          <button type="button" onClick={() => onRemove(index)}>
            Remove
          </button>
        ) : null}
      </div>
      <div className="stageInlineFields">
        <input
          className="detailInput"
          value={round.roundName || ""}
          placeholder="Round name"
          onChange={(event) => onChange(index, "roundName", event.target.value)}
        />
        <input
          className="detailInput"
          type="date"
          value={round.date || ""}
          onChange={(event) => onChange(index, "date", event.target.value)}
        />
        <input
          className="detailInput"
          value={round.interviewer || ""}
          placeholder="Interviewer / team"
          onChange={(event) => onChange(index, "interviewer", event.target.value)}
        />
      </div>
      <textarea
        className="detailTextarea compactTextarea"
        value={round.questions || ""}
        placeholder="Questions asked, prompts, take-home tasks, or topics..."
        onChange={(event) => onChange(index, "questions", event.target.value)}
      />
      <textarea
        className="detailTextarea compactTextarea"
        value={round.feedback || ""}
        placeholder="Your feedback, what went well, weak answers, follow-up items..."
        onChange={(event) => onChange(index, "feedback", event.target.value)}
      />
    </section>
  );
}

function InterviewDetail({ onDraftChange, onSave, result, saving, stageDraft }) {
  const rounds = normalizeInterviewRounds(stageDraft.interviewRounds);

  function updateRound(index, field, value) {
    onDraftChange(
      "interviewRounds",
      rounds.map((round, currentIndex) =>
        currentIndex === index ? { ...round, [field]: value } : round
      )
    );
  }

  function addRound() {
    onDraftChange("interviewRounds", [...rounds, createEmptyInterviewRound(rounds.length)]);
  }

  function removeRound(index) {
    onDraftChange(
      "interviewRounds",
      rounds.filter((_round, currentIndex) => currentIndex !== index)
    );
  }

  return (
    <section className="detailStageGrid">
      <section className="panel detailSinglePanel">
        <div className="stageFormHeader">
          <h2>Interview Rounds</h2>
          <button type="button" onClick={addRound}>
            Add round
          </button>
        </div>
        <div className="stageFormGrid">
          {rounds.map((round, index) => (
            <InterviewRoundEditor
              index={index}
              key={round.id || index}
              round={round}
              showRemove={rounds.length > 1}
              onChange={updateRound}
              onRemove={removeRound}
            />
          ))}
        </div>
        <button className="detailSaveButton" disabled={saving} type="button" onClick={onSave}>
          {saving ? "Saving..." : "Save interview details"}
        </button>
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
        <textarea
          className="detailTextarea"
          value={stageDraft.interviewFeedback}
          placeholder="Summarize the coach/readout: technical knowledge, communication, behavioral examples, role understanding..."
          onChange={(event) => onDraftChange("interviewFeedback", event.target.value)}
        />
      </section>
    </section>
  );
}

function ResultDetail({ onDraftChange, onSave, result, saving, stageDraft }) {
  function toggleImprovementArea(area) {
    const currentAreas = stageDraft.improvementAreas || [];
    onDraftChange(
      "improvementAreas",
      currentAreas.includes(area)
        ? currentAreas.filter((item) => item !== area)
        : [...currentAreas, area]
    );
  }

  return (
    <section className="detailStageGrid">
      <section className="panel detailSinglePanel">
        <h2>Outcome</h2>
        <div className="stageFormGrid">
          <select
            className="detailSelect"
            value={stageDraft.resultStatus}
            onChange={(event) => onDraftChange("resultStatus", event.target.value)}
          >
            <option value="">Select outcome</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="pending">Pending</option>
          </select>
          <select
            className="detailSelect"
            value={stageDraft.resultReason}
            onChange={(event) => onDraftChange("resultReason", event.target.value)}
          >
            <option value="">Primary reason</option>
            <option value="resume">Resume did not land enough interviews</option>
            <option value="skills">Skill or project proof gap</option>
            <option value="interview">Interview performance gap</option>
            <option value="writing">Cover letter or email quality</option>
            <option value="market">Timing / market / visa fit</option>
          </select>
        </div>
      </section>
      <section className="panel detailSinglePanel">
        <h2>Application Retrospective</h2>
        <textarea
          className="detailTextarea"
          value={stageDraft.resultReflection}
          placeholder="Record what happened, where the application broke down, and what to change next time..."
          onChange={(event) => onDraftChange("resultReflection", event.target.value)}
        />
        <button className="detailSaveButton" disabled={saving} type="button" onClick={onSave}>
          {saving ? "Saving..." : "Save result details"}
        </button>
        <ul className="cleanList">
          {resultAdvice(result).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="panel detailSinglePanel">
        <h2>Improvement Areas</h2>
        <div className="stageCheckboxGrid">
          {IMPROVEMENT_AREAS.map((area) => (
            <label key={area.id}>
              <input
                checked={(stageDraft.improvementAreas || []).includes(area.id)}
                type="checkbox"
                onChange={() => toggleImprovementArea(area.id)}
              />
              <span>{area.label}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="panel detailSinglePanel">
        <h2>Next Iteration</h2>
        <textarea
          className="detailTextarea compactTextarea"
          value={stageDraft.nextAction}
          placeholder="Define the next action before applying to a similar role..."
          onChange={(event) => onDraftChange("nextAction", event.target.value)}
        />
      </section>
    </section>
  );
}

export function StageContent({
  coachInsights,
  generatingCoach,
  onDraftChange,
  onGenerateCoach,
  onOpenModule,
  onSaveStageData,
  result,
  run,
  saving,
  stageDraft
}) {
  const status = getRunStatus(run);
  const coachPanel = (
    <CoachInsightsPanel
      coachInsights={coachInsights}
      generatingCoach={generatingCoach}
      onGenerateCoach={onGenerateCoach}
    />
  );

  if (status === "applied") {
    return (
      <>
        <AppliedDetail
          result={result}
          run={run}
          saving={saving}
          stageDraft={stageDraft}
          onDraftChange={onDraftChange}
          onSave={onSaveStageData}
        />
        {coachPanel}
      </>
    );
  }

  if (status === "interview") {
    return (
      <>
        <InterviewDetail
          result={result}
          run={run}
          saving={saving}
          stageDraft={stageDraft}
          onDraftChange={onDraftChange}
          onSave={onSaveStageData}
        />
        {coachPanel}
      </>
    );
  }

  if (status === "result") {
    return (
      <>
        <ResultDetail
          result={result}
          run={run}
          saving={saving}
          stageDraft={stageDraft}
          onDraftChange={onDraftChange}
          onSave={onSaveStageData}
        />
        {coachPanel}
      </>
    );
  }

  return (
    <>
      <PreparingDetail result={result} run={run} onOpenModule={onOpenModule} />
      {coachPanel}
    </>
  );
}
