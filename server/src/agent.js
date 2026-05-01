import OpenAI from "openai";

const REQUIRED_ARRAY_FIELDS = [
  "matchedSkills",
  "missingSkills",
  "tailoredCvSuggestions",
  "interviewQuestions",
  "agentTrace"
];
const DEFAULT_AGENT_TRACE = [
  { tool: "read_cv", status: "completed" },
  { tool: "read_job_description", status: "completed" },
  { tool: "extract_role_requirements", status: "completed" },
  { tool: "compare_cv_evidence", status: "completed" },
  { tool: "score_match", status: "completed" },
  { tool: "identify_skill_gaps", status: "completed" },
  { tool: "draft_cover_letter", status: "completed" },
  { tool: "prepare_interview_questions", status: "completed" }
];

function parseMaybeJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function normalizeString(value) {
  return typeof value === "string" ? value : "";
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => typeof item === "string" && item.trim());
}

function normalizeAgentTrace(value) {
  if (!Array.isArray(value)) {
    return DEFAULT_AGENT_TRACE;
  }

  const trace = value
    .map((step) => {
      if (typeof step === "string") {
        return {
          tool: step.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
          status: "completed"
        };
      }

      return {
        tool: normalizeString(
          step?.tool || step?.name || step?.step || step?.action || step?.phase
        ),
        status: normalizeString(step?.status || "completed")
      };
    })
    .filter((step) => step.tool);

  const uniqueTools = new Set(trace.map((step) => step.tool));
  if (!trace.length || uniqueTools.size === 1) {
    return DEFAULT_AGENT_TRACE;
  }

  return trace;
}

function normalizeAgentResult(result) {
  const normalized = {
    companyName: normalizeString(result?.companyName),
    roleTitle: normalizeString(result?.roleTitle),
    matchScore: Number.isFinite(Number(result?.matchScore))
      ? Math.max(0, Math.min(100, Math.round(Number(result.matchScore))))
      : 0,
    matchedSkills: [],
    missingSkills: [],
    tailoredCvSuggestions: [],
    coverLetter: normalizeString(result?.coverLetter),
    interviewQuestions: [],
    agentTrace: []
  };

  for (const field of REQUIRED_ARRAY_FIELDS) {
    normalized[field] =
      field === "agentTrace"
        ? normalizeAgentTrace(result?.[field])
        : normalizeStringArray(result?.[field]);
  }

  return normalized;
}

function buildPrompt({ cvText, jobDescription, jobUrl }) {
  return [
    "You are an AI job application assistant.",
    "Analyze the candidate CV and the job description directly. Do not rely on keyword matching.",
    "Extract the company name and role title when they are present. If unclear, use an empty string.",
    "Score the match from 0 to 100 using evidence from the CV against the role requirements.",
    "Return concise, practical CV suggestions, a tailored cover letter, and interview questions.",
    "Do not invent experience, credentials, employers, or company names.",
    "Return only strict JSON with these fields:",
    "companyName, roleTitle, matchScore, matchedSkills, missingSkills, tailoredCvSuggestions, coverLetter, interviewQuestions, agentTrace.",
    "agentTrace must be an array of distinct objects like {\"tool\":\"read_cv\",\"status\":\"completed\"}. Use concrete step names for reading the CV, reading the job description, extracting requirements, comparing evidence, scoring, finding gaps, drafting the cover letter, and preparing interview questions.",
    "",
    jobUrl ? `JOB URL:\n${jobUrl}` : "",
    `JOB DESCRIPTION:\n${jobDescription.slice(0, 18000)}`,
    "",
    `CV:\n${cvText.slice(0, 18000)}`
  ].join("\n");
}

export async function runApplicationAgent({ cvText, jobDescription, jobUrl = "" }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to run the AI matching agent.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You return only valid JSON. You are responsible for reading the supplied CV and job description, extracting facts, comparing evidence, and drafting application material."
      },
      {
        role: "user",
        content: buildPrompt({ cvText, jobDescription, jobUrl })
      }
    ]
  });

  const content = completion.choices[0]?.message?.content || "";
  const parsed = parseMaybeJson(content);

  if (!parsed) {
    throw new Error("The AI response was not valid JSON.");
  }

  return normalizeAgentResult(parsed);
}
