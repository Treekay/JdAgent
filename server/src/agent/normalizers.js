import { objectArray, stringArray, text } from "./text.js";

export function normalizeResume(parsed) {
  return {
    candidateName: text(parsed?.candidateName),
    headline: text(parsed?.headline),
    summary: text(parsed?.summary),
    skills: stringArray(parsed?.skills),
    experience: objectArray(parsed?.experience).map((item) => ({
      title: text(item.title),
      company: text(item.company),
      dates: text(item.dates),
      highlights: stringArray(item.highlights)
    })),
    education: stringArray(parsed?.education),
    projects: stringArray(parsed?.projects),
    certifications: stringArray(parsed?.certifications)
  };
}

export function normalizeJob(parsed) {
  return {
    companyName: text(parsed?.companyName),
    roleTitle: text(parsed?.roleTitle),
    location: text(parsed?.location),
    employmentType: text(parsed?.employmentType),
    summary: text(parsed?.summary),
    responsibilities: stringArray(parsed?.responsibilities),
    qualifications: stringArray(parsed?.qualifications),
    preferredQualifications: stringArray(parsed?.preferredQualifications),
    toolsAndTechnologies: stringArray(parsed?.toolsAndTechnologies)
  };
}

export function normalizeCandidateProfile(profile) {
  return {
    headline: text(profile?.headline),
    coreSkills: stringArray(profile?.coreSkills),
    strengths: stringArray(profile?.strengths),
    experienceHighlights: stringArray(profile?.experienceHighlights),
    evidence: objectArray(profile?.evidence).map((item) => ({
      claim: text(item.claim),
      evidence: text(item.evidence)
    }))
  };
}

export function normalizeRequirements(requirements) {
  return objectArray(requirements?.requirements || requirements).map((item, index) => ({
    id: text(item.id) || `req_${index + 1}`,
    name: text(item.name) || `Requirement ${index + 1}`,
    category: text(item.category) || "general",
    priority: ["high", "medium", "low"].includes(text(item.priority).toLowerCase())
      ? text(item.priority).toLowerCase()
      : "medium",
    description: text(item.description)
  }));
}

export function normalizeMatches(matches, requirements) {
  const requirementIds = new Set(requirements.map((requirement) => requirement.id));

  return objectArray(matches?.matches || matches)
    .map((item) => {
      const status = text(item.status).toLowerCase();
      return {
        requirementId: text(item.requirementId),
        status: ["matched", "partial", "missing"].includes(status) ? status : "missing",
        evidence: stringArray(item.evidence),
        rationale: text(item.rationale)
      };
    })
    .filter((item) => requirementIds.has(item.requirementId));
}

export function normalizeApplicationAssets(value) {
  return {
    finalReport: text(value?.finalReport),
    tailoredResume: text(value?.tailoredResume),
    coverLetter: text(value?.coverLetter),
    interviewPrep: stringArray(value?.interviewPrep)
  };
}

export function normalizeCoachInsights(value, status) {
  return {
    status,
    headline: text(value?.headline),
    summary: text(value?.summary),
    strengths: stringArray(value?.strengths).slice(0, 6),
    risks: stringArray(value?.risks).slice(0, 6),
    nextActions: stringArray(value?.nextActions).slice(0, 8),
    focusAreas: stringArray(value?.focusAreas).slice(0, 6),
    generatedAt: new Date().toISOString()
  };
}

export function legacyFields({
  matchedRequirements,
  missingRequirements,
  recommendations,
  finalReport,
  coverLetter,
  interviewPrep
}) {
  return {
    matchedSkills: matchedRequirements.map((item) => item.name),
    missingSkills: missingRequirements.map((item) => item.name),
    tailoredCvSuggestions: recommendations,
    coverLetter: coverLetter || finalReport,
    interviewQuestions: interviewPrep
  };
}
