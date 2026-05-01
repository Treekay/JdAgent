import OpenAI from "openai";

const DEFAULT_SKILLS = [
  "react",
  "node",
  "express",
  "mongodb",
  "typescript",
  "javascript",
  "api",
  "rest",
  "openai",
  "llm",
  "agent",
  "tool calling",
  "python",
  "aws",
  "docker",
  "testing",
  "ci/cd",
  "communication",
  "leadership",
  "analytics",
  "security",
  "postgres",
  "graphql",
  "tailwind",
  "figma"
];

function normalize(text = "") {
  return text.toLowerCase().replace(/[^a-z0-9+#./\s-]/g, " ");
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function detectSkills(text) {
  const normalized = normalize(text);
  return unique(
    DEFAULT_SKILLS.filter((skill) => normalized.includes(skill.toLowerCase()))
  );
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function cleanJobValue(value = "", maxLength = 90) {
  return value
    .replace(/^[\s:|-]+|[\s:|,-]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function pickLabeledValue(lines, labels) {
  for (const line of lines) {
    for (const label of labels) {
      const match = line.match(new RegExp(`^${label}\\s*[:：-]\\s*(.+)$`, "i"));
      if (match?.[1]) {
        return cleanJobValue(match[1]);
      }
    }
  }

  return "";
}

function findCompanyName(lines) {
  const labeled = pickLabeledValue(lines, [
    "company",
    "company name",
    "employer",
    "organisation",
    "organization"
  ]);

  if (labeled) {
    return labeled;
  }

  for (const line of lines) {
    const aboutMatch = line.match(/^about\s+(.+)$/i);
    if (aboutMatch?.[1] && !/^(us|the company|our company|role)$/i.test(aboutMatch[1])) {
      return cleanJobValue(aboutMatch[1]);
    }
  }

  const atLine = lines.find((line) => /\bat\s+([A-Z][\w&.' -]{1,70})$/i.test(line));
  if (atLine) {
    return cleanJobValue(atLine.replace(/^.*\bat\s+/i, ""));
  }

  const aboutIndex = lines.findIndex((line) => /^about\s+(us|the company|our company)$/i.test(line));
  if (aboutIndex > 0) {
    return cleanJobValue(lines[aboutIndex - 1]);
  }

  return "";
}

function findRoleTitle(lines) {
  const labeled = pickLabeledValue(lines, [
    "role",
    "role title",
    "title",
    "job title",
    "position",
    "position title"
  ]);

  if (labeled) {
    return labeled;
  }

  for (const line of lines) {
    const lookingForMatch = line.match(
      /\b(?:is\s+)?looking\s+for\s+(?:an?\s+)?(.+?)(?:\s+with|\s+to|\s+for|[.。]|$)/i
    );

    if (lookingForMatch?.[1]) {
      return cleanJobValue(lookingForMatch[1]);
    }
  }

  if (lines.some((line) => /\bpaid\s+internship\b/i.test(line))) {
    return "Paid Internship";
  }

  if (lines.some((line) => /\binternship\b/i.test(line))) {
    return "Internship";
  }

  const titleWords =
    /\b(engineer|developer|designer|manager|analyst|consultant|specialist|assistant|coordinator|lead|architect|administrator|intern|internship)\b/i;
  return cleanJobValue(lines.find((line) => titleWords.test(line) && line.length <= 90) || "");
}

export function extractJobInfo(jobDescription) {
  const lines = jobDescription
    .split(/\r?\n/)
    .map((line) => cleanJobValue(line, 180))
    .filter((line) => line.length >= 2 && !/^https?:\/\//i.test(line));

  return {
    companyName: findCompanyName(lines),
    roleTitle: findRoleTitle(lines)
  };
}

function extractHighlights(text, skills) {
  const sentences = splitSentences(text);
  const highlights = [];

  for (const skill of skills) {
    const found = sentences.find((sentence) =>
      normalize(sentence).includes(skill.toLowerCase())
    );
    if (found) {
      highlights.push(found);
    }
  }

  return unique(highlights).slice(0, 5);
}

function analyzeMatch({ cvText, jobDescription }) {
  const cvSkills = detectSkills(cvText);
  const jobSkills = detectSkills(jobDescription);
  const matchedSkills = jobSkills.filter((skill) => cvSkills.includes(skill));
  const missingSkills = jobSkills.filter((skill) => !cvSkills.includes(skill));
  const matchScore = jobSkills.length
    ? Math.round((matchedSkills.length / jobSkills.length) * 100)
    : 55;

  return {
    matchScore,
    cvSkills,
    jobSkills,
    matchedSkills,
    missingSkills,
    evidence: extractHighlights(cvText, matchedSkills)
  };
}

function createCvSuggestions({ analysis }) {
  const suggestions = [];

  if (analysis.matchedSkills.length) {
    suggestions.push(
      `Move ${analysis.matchedSkills.slice(0, 4).join(", ")} into the top skills summary so the recruiter sees the strongest overlap immediately.`
    );
  }

  if (analysis.missingSkills.length) {
    suggestions.push(
      `Add honest adjacent experience for ${analysis.missingSkills.slice(0, 3).join(", ")} or include a short learning/project note if you are building these skills.`
    );
  }

  suggestions.push(
    "Rewrite two recent role bullets to include measurable outcomes, scope, and the tools used.",
    "Mirror the job description language in your profile summary while keeping the claims evidence-based.",
    "Add a compact project section for agent workflows, API integrations, or data-backed automation if those are relevant to this role."
  );

  return suggestions;
}

function createCoverLetter({ analysis, jobDescription, jobInfo }) {
  const roleLine = jobInfo.roleTitle || "the role";
  const companyLine = jobInfo.companyName ? ` at ${jobInfo.companyName}` : "";
  const matched = analysis.matchedSkills.slice(0, 4).join(", ") || "the core requirements";
  const missing = analysis.missingSkills.slice(0, 2).join(" and ");

  return [
    "Dear Hiring Manager,",
    "",
    `I am excited to apply for ${roleLine}${companyLine}. My background aligns strongly with the role through hands-on experience in ${matched}, and I am especially drawn to work that turns product requirements into reliable, user-focused systems.`,
    "",
    `In previous work, I have translated ambiguous needs into practical implementations, collaborated across technical and non-technical stakeholders, and kept delivery focused on measurable outcomes. I would bring that same combination of engineering judgment, communication, and ownership to your team.`,
    "",
    missing
      ? `I also noticed the role values ${missing}. While I would be careful not to overstate my experience, I am actively closing that gap through focused practice and would be ready to ramp quickly.`
      : "The requirements map closely to my current strengths, so I would be ready to contribute quickly while continuing to learn the team's domain.",
    "",
    "Thank you for your time and consideration. I would welcome the chance to discuss how my experience can support your hiring goals.",
    "",
    "Sincerely,"
  ].join("\n");
}

function createInterviewQuestions({ analysis }) {
  const skills = analysis.jobSkills.length ? analysis.jobSkills : DEFAULT_SKILLS.slice(0, 5);
  return [
    `Tell me about a project where you used ${skills[0]} to solve a business problem.`,
    `How would you approach the first 30 days in a role where ${skills.slice(0, 3).join(", ")} matter most?`,
    "Describe a time you received unclear requirements. How did you turn them into a delivery plan?",
    analysis.missingSkills.length
      ? `This role asks for ${analysis.missingSkills[0]}. How would you ramp up and prove competence quickly?`
      : "Which part of this role best matches your strongest professional evidence?",
    "What tradeoffs would you consider when balancing speed, quality, and maintainability?"
  ];
}

function localAgentRun({ cvText, jobDescription }) {
  const analysis = analyzeMatch({ cvText, jobDescription });
  const jobInfo = extractJobInfo(jobDescription);

  return {
    ...jobInfo,
    matchScore: analysis.matchScore,
    missingSkills: analysis.missingSkills,
    matchedSkills: analysis.matchedSkills,
    tailoredCvSuggestions: createCvSuggestions({ analysis }),
    coverLetter: createCoverLetter({ analysis, jobDescription, jobInfo }),
    interviewQuestions: createInterviewQuestions({ analysis }),
    agentTrace: [
      { tool: "extract_cv_profile", status: "completed" },
      { tool: "compare_job_requirements", status: "completed" },
      { tool: "identify_skill_gaps", status: "completed" },
      { tool: "generate_cv_suggestions", status: "completed" },
      { tool: "draft_cover_letter", status: "completed" },
      { tool: "prepare_interview_questions", status: "completed" }
    ]
  };
}

const toolSpecs = [
  {
    type: "function",
    function: {
      name: "compare_job_requirements",
      description: "Compare the CV text with the job description and return skill match analysis.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    }
  }
];

function parseMaybeJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function openAiAgentRun({ cvText, jobDescription }) {
  if (!process.env.OPENAI_API_KEY) {
    return localAgentRun({ cvText, jobDescription });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const local = localAgentRun({ cvText, jobDescription });

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    tools: toolSpecs,
    tool_choice: "auto",
    messages: [
      {
        role: "system",
        content:
          "You are an agentic job application assistant. Return strict JSON with companyName, roleTitle, matchScore, missingSkills, matchedSkills, tailoredCvSuggestions, coverLetter, interviewQuestions, and agentTrace. Use the provided tool result as grounded evidence. Do not invent a company name. If the company is unclear, use an empty string and address the letter to the Hiring Manager."
      },
      {
        role: "user",
        content: `CV:\n${cvText.slice(0, 9000)}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 9000)}`
      },
      {
        role: "assistant",
        tool_calls: [
          {
            id: "call_compare_requirements",
            type: "function",
            function: {
              name: "compare_job_requirements",
              arguments: "{}"
            }
          }
        ]
      },
      {
        role: "tool",
        tool_call_id: "call_compare_requirements",
        content: JSON.stringify(local)
      }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  const parsed = parseMaybeJson(content);
  return parsed || local;
}

export async function runApplicationAgent({ cvText, jobDescription }) {
  return openAiAgentRun({ cvText, jobDescription });
}
