import { applicationStatuses, defaultAgentTrace } from "./data.js";

export function formatRunDate(value) {
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

export function getRunTitle(run) {
  if (run.displayTitle) return run.displayTitle;

  const companyName = run.companyName || run.result?.companyName;
  const roleTitle = run.roleTitle || run.result?.roleTitle;

  if (companyName && roleTitle) return `${companyName} - ${roleTitle}`;
  return companyName || roleTitle || "Saved match";
}

export function getRunStatus(run) {
  return applicationStatuses.some((status) => status.id === run?.applicationStatus)
    ? run.applicationStatus
    : "saved";
}

export function getRunStatusLabel(run) {
  return applicationStatuses.find((status) => status.id === getRunStatus(run))?.label || "Saved";
}

export function getRunResult(run) {
  return normalizeResult({
    id: run._id,
    ...(run.result || {}),
    companyName: run.companyName || run.result?.companyName || "",
    roleTitle: run.roleTitle || run.result?.roleTitle || ""
  });
}

export function normalizeTrace(trace) {
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

export function normalizeResult(nextResult) {
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
    tailoredResume: nextResult?.tailoredResume || "",
    coverLetter: nextResult?.coverLetter || "",
    interviewPrep: nextResult?.interviewPrep || nextResult?.interviewQuestions || [],
    finalReport: nextResult?.finalReport || nextResult?.coverLetter || "",
    agentTrace: normalizeTrace(nextResult?.agentTrace)
  };
}
