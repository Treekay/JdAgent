import OpenAI from "openai";

const WORKFLOW_STEPS = [
  { id: "parse_resume", name: "Parse Resume" },
  { id: "parse_job_description", name: "Parse Job Description" },
  { id: "extract_candidate_profile", name: "Extract Candidate Profile" },
  { id: "extract_job_requirements", name: "Extract Job Requirements" },
  { id: "match_requirements", name: "Match Requirements" },
  { id: "calculate_fit_score", name: "Calculate Fit Score" },
  { id: "generate_recommendations", name: "Generate Recommendations" },
  { id: "generate_final_report", name: "Generate Final Report" }
];

const PRIORITY_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1
};

const STATUS_COVERAGE = {
  matched: 1,
  partial: 0.55,
  missing: 0
};

function parseMaybeJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : [];
}

function objectArray(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function clip(value, length = 14000) {
  return text(value).slice(0, length);
}

function makeTraceItem(step) {
  return {
    id: step.id,
    name: step.name,
    status: "pending",
    summary: "",
    startedAt: null,
    completedAt: null
  };
}

function summarizeCount(label, items) {
  return `${Array.isArray(items) ? items.length : 0} ${label}`;
}

async function runStep(trace, stepId, action) {
  const item = trace.find((traceItem) => traceItem.id === stepId);
  item.status = "running";
  item.startedAt = new Date().toISOString();

  try {
    const { output, summary } = await action();
    item.status = "completed";
    item.summary = summary || "Completed";
    item.completedAt = new Date().toISOString();
    return output;
  } catch (error) {
    item.status = "failed";
    item.summary = error.message || "Step failed";
    item.completedAt = new Date().toISOString();
    throw error;
  }
}

async function callJson(client, prompt) {
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Return only valid JSON. Be precise, evidence-based, and do not invent facts that are not present in the provided CV or job description."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const parsed = parseMaybeJson(completion.choices[0]?.message?.content || "");
  if (!parsed) {
    throw new Error("The AI response was not valid JSON.");
  }

  return parsed;
}

function normalizeResume(parsed) {
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

function normalizeJob(parsed) {
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

function normalizeCandidateProfile(profile) {
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

function normalizeRequirements(requirements) {
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

function normalizeMatches(matches, requirements) {
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

function calculateFit(requirements, matches) {
  const matchById = new Map(matches.map((match) => [match.requirementId, match]));
  let earned = 0;
  let possible = 0;

  for (const requirement of requirements) {
    const weight = PRIORITY_WEIGHT[requirement.priority] || 2;
    const status = matchById.get(requirement.id)?.status || "missing";
    possible += weight;
    earned += weight * (STATUS_COVERAGE[status] ?? 0);
  }

  return possible ? Math.round((earned / possible) * 100) : 0;
}

function splitRequirementMatches(requirements, matches) {
  const requirementById = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const matchedRequirements = [];
  const missingRequirements = [];
  const evidence = [];

  for (const match of matches) {
    const requirement = requirementById.get(match.requirementId);
    if (!requirement) continue;

    const item = {
      ...requirement,
      status: match.status,
      rationale: match.rationale,
      evidence: match.evidence
    };

    if (match.status === "matched" || match.status === "partial") {
      matchedRequirements.push(item);
    } else {
      missingRequirements.push(item);
    }

    for (const evidenceText of match.evidence) {
      evidence.push({
        requirementId: requirement.id,
        requirementName: requirement.name,
        evidence: evidenceText
      });
    }
  }

  const matchedIds = new Set(matches.map((match) => match.requirementId));
  for (const requirement of requirements) {
    if (!matchedIds.has(requirement.id)) {
      missingRequirements.push({
        ...requirement,
        status: "missing",
        rationale: "No supporting CV evidence was identified.",
        evidence: []
      });
    }
  }

  return { matchedRequirements, missingRequirements, evidence };
}

function normalizeApplicationAssets(value) {
  return {
    finalReport: text(value?.finalReport),
    tailoredResume: text(value?.tailoredResume),
    coverLetter: text(value?.coverLetter),
    interviewPrep: stringArray(value?.interviewPrep)
  };
}

function normalizeCoachInsights(value, status) {
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

function legacyFields({
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

export async function runCoachAgent(run) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to run the AI coach.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to run the AI matching agent.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const agentTrace = WORKFLOW_STEPS.map(makeTraceItem);

  try {
    const parsedResume = await runStep(agentTrace, "parse_resume", async () => {
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

  const parsedJob = await runStep(agentTrace, "parse_job_description", async () => {
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

  const candidateProfile = await runStep(agentTrace, "extract_candidate_profile", async () => {
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

  const jobRequirements = await runStep(agentTrace, "extract_job_requirements", async () => {
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

  const requirementMatches = await runStep(agentTrace, "match_requirements", async () => {
    const output = normalizeMatches(
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

    return {
      output,
      summary: `${requirementMatchesSummary(output)}`
    };
  });

  const scoring = await runStep(agentTrace, "calculate_fit_score", async () => {
    const fitScore = calculateFit(jobRequirements, requirementMatches);
    const split = splitRequirementMatches(jobRequirements, requirementMatches);

    return {
      output: { fitScore, ...split },
      summary: `${fitScore}% fit score calculated from weighted requirement coverage`
    };
  });

  const recommendations = await runStep(agentTrace, "generate_recommendations", async () => {
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

  const applicationAssets = await runStep(agentTrace, "generate_final_report", async () => {
    const parsed = await callJson(
      client,
      [
        "Step 8: Generate Final Report.",
        "Return JSON with finalReport, tailoredResume, coverLetter, and interviewPrep.",
        "finalReport must be a concise structured markdown report.",
        "tailoredResume must be a role-targeted resume draft in markdown using only truthful CV evidence.",
        "coverLetter must be a polished cover letter tailored to the company and role.",
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
  } catch (error) {
    error.agentTrace = agentTrace;
    throw error;
  }
}

function requirementMatchesSummary(matches) {
  const counts = matches.reduce(
    (accumulator, match) => ({
      ...accumulator,
      [match.status]: (accumulator[match.status] || 0) + 1
    }),
    {}
  );

  return `${counts.matched || 0} matched, ${counts.partial || 0} partial, ${
    counts.missing || 0
  } missing`;
}
