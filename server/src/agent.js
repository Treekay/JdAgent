import { callJson, createOpenAIClient } from "./agent/llm.js";
import {
  legacyFields,
  normalizeApplicationAssets,
  normalizeCandidateProfile,
  normalizeCoachInsights,
  normalizeJob,
  normalizeMatches,
  normalizeRequirements,
  normalizeResume
} from "./agent/normalizers.js";
import {
  calculateFit,
  requirementMatchesSummary,
  splitRequirementMatches
} from "./agent/scoring.js";
import { applySemanticAliasMatches } from "./agent/semanticAliases.js";
import { clip, stringArray, summarizeCount, text } from "./agent/text.js";
import { makeTraceItem, runStep, WORKFLOW_STEPS } from "./agent/trace.js";

const COVER_LETTER_TONE_GUIDE = [
  "Cover letter tone guide:",
  "- Write in a natural, concise, respectful professional tone, similar to a brief professional outreach email.",
  "- Be warm but measured. Do not exaggerate, flatter, pressure the reader, or make claims stronger than the CV evidence supports.",
  "- Avoid phrases like perfect fit, dream role, thrilled, uniquely qualified, or extensive experience unless the evidence clearly supports them.",
  "- Use plain language and short paragraphs. Mention 1-2 specific overlaps with the role, then close politely.",
  "- If no recruiter name is provided, address it to Hiring Team. Keep the letter around 160-240 words."
].join("\n");

export async function runCoachAgent(run) {
  const client = createOpenAIClient("AI coach");
  const status = text(run.applicationStatus) || "saved";
  const result = run.result || {};

  const parsed = await callJson(
    client,
    [
      "Generate stage-aware career coach feedback for this job application.",
      "Return JSON with headline, summary, strengths, risks, nextActions, focusAreas.",
      "strengths, risks, nextActions, and focusAreas must be concise arrays.",
      "Use the current application stage and user-entered stage data. Do not invent interview outcomes or facts.",
      "For saved/preparing: focus on resume/JD fit gaps and application readiness.",
      "For applied: focus on follow-up timing and interview preparation.",
      "For interview: use interview rounds, questions, and feedback to identify weak answers and next prep.",
      "For result: use outcome, reason, improvement areas, and reflection to produce a retrospective action plan.",
      "",
      JSON.stringify({
        applicationStatus: status,
        companyName: run.companyName || result.companyName || "",
        roleTitle: run.roleTitle || result.roleTitle || "",
        fitScore: result.fitScore || result.matchScore || 0,
        matchedRequirements: (result.matchedRequirements || []).slice(0, 8),
        missingRequirements: (result.missingRequirements || []).slice(0, 8),
        recommendations: result.recommendations || [],
        interviewPrep: result.interviewPrep || [],
        stageData: run.stageData || {},
        statusHistory: run.statusHistory || []
      })
    ].join("\n")
  );

  return normalizeCoachInsights(parsed, status);
}

export async function runApplicationAgent({ cvText, jobDescription, jobUrl = "" }) {
  const client = createOpenAIClient("AI matching agent");
  const agentTrace = WORKFLOW_STEPS.map(makeTraceItem);

  try {
    const parsedResume = await parseResumeStep({ agentTrace, client, cvText });
    const parsedJob = await parseJobStep({ agentTrace, client, jobDescription, jobUrl });
    const candidateProfile = await candidateProfileStep({ agentTrace, client, parsedResume });
    const jobRequirements = await jobRequirementsStep({ agentTrace, client, parsedJob });
    const requirementMatches = await matchRequirementsStep({
      agentTrace,
      candidateProfile,
      client,
      jobRequirements,
      parsedResume
    });
    const scoring = await scoringStep({ agentTrace, jobRequirements, requirementMatches });
    const recommendations = await recommendationsStep({
      agentTrace,
      candidateProfile,
      client,
      scoring
    });
    const applicationAssets = await finalReportStep({
      agentTrace,
      candidateProfile,
      client,
      parsedJob,
      recommendations,
      scoring
    });

    return buildApplicationResult({
      agentTrace,
      applicationAssets,
      candidateProfile,
      jobRequirements,
      parsedJob,
      recommendations,
      scoring
    });
  } catch (error) {
    error.agentTrace = agentTrace;
    throw error;
  }
}

function parseResumeStep({ agentTrace, client, cvText }) {
  return runStep(agentTrace, "parse_resume", async () => {
    const output = normalizeResume(
      await callJson(
        client,
        [
          "Step 1: Parse Resume.",
          "Return JSON with candidateName, headline, summary, skills, experience, education, projects, certifications.",
          "experience must be an array of {title, company, dates, highlights}.",
          "",
          `RESUME:\n${clip(cvText)}`
        ].join("\n")
      )
    );

    return {
      output,
      summary: `${stringArray(output.skills).length} skills and ${output.experience.length} roles parsed`
    };
  });
}

function parseJobStep({ agentTrace, client, jobDescription, jobUrl }) {
  return runStep(agentTrace, "parse_job_description", async () => {
    const output = normalizeJob(
      await callJson(
        client,
        [
          "Step 2: Parse Job Description.",
          "Return JSON with companyName, roleTitle, location, employmentType, summary, responsibilities, qualifications, preferredQualifications, toolsAndTechnologies.",
          jobUrl ? `JOB URL: ${jobUrl}` : "",
          "",
          `JOB DESCRIPTION:\n${clip(jobDescription)}`
        ].join("\n")
      )
    );

    return {
      output,
      summary: [output.companyName, output.roleTitle].filter(Boolean).join(" - ") || "Job parsed"
    };
  });
}

function candidateProfileStep({ agentTrace, client, parsedResume }) {
  return runStep(agentTrace, "extract_candidate_profile", async () => {
    const output = normalizeCandidateProfile(
      await callJson(
        client,
        [
          "Step 3: Extract Candidate Profile.",
          "Use the parsed resume. Return JSON with headline, coreSkills, strengths, experienceHighlights, evidence.",
          "evidence must be an array of {claim, evidence}.",
          "",
          JSON.stringify(parsedResume)
        ].join("\n")
      )
    );

    return {
      output,
      summary: `${output.coreSkills.length} core skills and ${output.evidence.length} evidence items`
    };
  });
}

function jobRequirementsStep({ agentTrace, client, parsedJob }) {
  return runStep(agentTrace, "extract_job_requirements", async () => {
    const output = normalizeRequirements(
      await callJson(
        client,
        [
          "Step 4: Extract Job Requirements.",
          "Use the parsed job description. Return JSON with requirements.",
          "requirements must be an array of {id, name, category, priority, description}.",
          "priority must be high, medium, or low. Prefer 6 to 12 requirements.",
          "",
          JSON.stringify(parsedJob)
        ].join("\n")
      )
    );

    return {
      output,
      summary: summarizeCount("requirements extracted", output)
    };
  });
}

function matchRequirementsStep({
  agentTrace,
  candidateProfile,
  client,
  jobRequirements,
  parsedResume
}) {
  return runStep(agentTrace, "match_requirements", async () => {
    const llmMatches = normalizeMatches(
      await callJson(
        client,
        [
          "Step 5: Match Requirements.",
          "Compare the candidate profile to each job requirement.",
          "Return JSON with matches: array of {requirementId, status, evidence, rationale}.",
          "status must be matched, partial, or missing. evidence must quote or summarize concrete CV evidence.",
          "Use semantic equivalence, not exact keyword matching. Treat common variants as equivalent when the CV evidence supports the same capability.",
          "Examples: REST API, RESTful API, RESTful APIs, and REST services are equivalent; CI/CD and continuous integration/deployment are equivalent; Kubernetes and K8s are equivalent; AWS S3 and Amazon S3 are equivalent.",
          "Mark a requirement as matched when the CV shows the same practical skill under a variant name. Mark partial when the CV shows related but incomplete evidence.",
          "",
          `CANDIDATE PROFILE:\n${JSON.stringify(candidateProfile)}`,
          "",
          `PARSED RESUME DETAILS:\n${JSON.stringify(parsedResume)}`,
          "",
          `JOB REQUIREMENTS:\n${JSON.stringify(jobRequirements)}`
        ].join("\n")
      ),
      jobRequirements
    );
    const output = applySemanticAliasMatches(
      llmMatches,
      jobRequirements,
      parsedResume,
      candidateProfile
    );

    return {
      output,
      summary: requirementMatchesSummary(output)
    };
  });
}

function scoringStep({ agentTrace, jobRequirements, requirementMatches }) {
  return runStep(agentTrace, "calculate_fit_score", async () => {
    const fitScore = calculateFit(jobRequirements, requirementMatches);
    const split = splitRequirementMatches(jobRequirements, requirementMatches);

    return {
      output: { fitScore, ...split },
      summary: `${fitScore}% fit score calculated from weighted requirement coverage`
    };
  });
}

function recommendationsStep({ agentTrace, candidateProfile, client, scoring }) {
  return runStep(agentTrace, "generate_recommendations", async () => {
    const parsed = await callJson(
      client,
      [
        "Step 7: Generate Recommendations.",
        "Return JSON with recommendations: concise array of practical actions to improve this application.",
        "",
        `FIT SCORE: ${scoring.fitScore}`,
        `MATCHED REQUIREMENTS:\n${JSON.stringify(scoring.matchedRequirements)}`,
        `MISSING REQUIREMENTS:\n${JSON.stringify(scoring.missingRequirements)}`,
        `CANDIDATE PROFILE:\n${JSON.stringify(candidateProfile)}`
      ].join("\n")
    );
    const output = stringArray(parsed.recommendations);

    return {
      output,
      summary: summarizeCount("recommendations generated", output)
    };
  });
}

function finalReportStep({ agentTrace, candidateProfile, client, parsedJob, recommendations, scoring }) {
  return runStep(agentTrace, "generate_final_report", async () => {
    const parsed = await callJson(
      client,
      [
        "Step 8: Generate Final Report.",
        "Return JSON with finalReport, tailoredResume, coverLetter, and interviewPrep.",
        "finalReport must be a concise structured markdown report.",
        "tailoredResume must be a role-targeted resume draft in markdown using only truthful CV evidence.",
        COVER_LETTER_TONE_GUIDE,
        "coverLetter must be a tailored cover letter for the company and role, written under the tone guide above.",
        "interviewPrep must be an array of concise interview prep tips/questions for this job.",
        "",
        JSON.stringify({
          parsedJob,
          candidateProfile,
          fitScore: scoring.fitScore,
          matchedRequirements: scoring.matchedRequirements,
          missingRequirements: scoring.missingRequirements,
          evidence: scoring.evidence,
          recommendations
        })
      ].join("\n")
    );
    const output = normalizeApplicationAssets(parsed);

    return {
      output,
      summary: "Final report, tailored resume, cover letter, and interview prep generated"
    };
  });
}

function buildApplicationResult({
  agentTrace,
  applicationAssets,
  candidateProfile,
  jobRequirements,
  parsedJob,
  recommendations,
  scoring
}) {
  return {
    companyName: parsedJob.companyName,
    roleTitle: parsedJob.roleTitle,
    fitScore: scoring.fitScore,
    matchScore: scoring.fitScore,
    candidateProfile,
    jobRequirements,
    matchedRequirements: scoring.matchedRequirements,
    missingRequirements: scoring.missingRequirements,
    evidence: scoring.evidence,
    recommendations,
    finalReport: applicationAssets.finalReport,
    tailoredResume: applicationAssets.tailoredResume,
    coverLetter: applicationAssets.coverLetter,
    interviewPrep: applicationAssets.interviewPrep,
    agentTrace,
    ...legacyFields({
      matchedRequirements: scoring.matchedRequirements,
      missingRequirements: scoring.missingRequirements,
      recommendations,
      finalReport: applicationAssets.finalReport,
      coverLetter: applicationAssets.coverLetter,
      interviewPrep: applicationAssets.interviewPrep
    })
  };
}
