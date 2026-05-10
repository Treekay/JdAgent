export const sampleResult = {
  companyName: "",
  roleTitle: "this role",
  fitScore: 78,
  matchScore: 78,
  matchedRequirements: [
    {
      id: "demo_1",
      name: "React application experience",
      priority: "high",
      status: "matched",
      rationale: "The CV includes React project work.",
      evidence: ["Built user-facing React interfaces."]
    },
    {
      id: "demo_2",
      name: "Node API experience",
      priority: "medium",
      status: "matched",
      rationale: "The CV includes Node and Express experience.",
      evidence: ["Implemented API workflows with Node and Express."]
    }
  ],
  missingRequirements: [
    {
      id: "demo_3",
      name: "Docker production experience",
      priority: "medium",
      status: "missing",
      rationale: "No Docker evidence was found in the demo CV.",
      evidence: []
    }
  ],
  evidence: [
    {
      requirementId: "demo_1",
      requirementName: "React application experience",
      evidence: "Built user-facing React interfaces."
    }
  ],
  recommendations: [
    "Move React, Node, Express, and MongoDB into the top skills summary so the recruiter sees the strongest overlap immediately.",
    "Add honest adjacent experience for testing and Docker or include a short learning/project note if you are building these skills.",
    "Rewrite two recent role bullets to include measurable outcomes, scope, and the tools used."
  ],
  tailoredResume:
    "## Targeted Resume Draft\n\n### Summary\nReact and Node developer with experience building user-facing AI workflow tools.\n\n### Selected Experience\n- Built React interfaces for document upload, job analysis, and agent workflow results.\n- Implemented Node and Express APIs for CV parsing and structured AI outputs.",
  coverLetter:
    "Dear Hiring Manager,\n\nI am excited to apply for this role. My experience building React and Node applications aligns well with the responsibilities described, especially user-facing workflow tools and AI-assisted document generation.\n\nSincerely,",
  interviewPrep: [
    "Prepare a short story about a React project that improved a user workflow.",
    "Be ready to explain how you validate AI-generated output before showing it to users."
  ],
  finalReport:
    "## Demo Fit Report\n\nThe candidate shows strong alignment with the React and Node portions of the role. The main improvement area is adding concrete Docker or deployment evidence before applying.",
  agentTrace: []
};

export const defaultAgentTrace = [
  { id: "parse_resume", name: "Parse Resume", status: "completed", summary: "Demo resume parsed" },
  { id: "parse_job_description", name: "Parse Job Description", status: "completed", summary: "Demo JD parsed" },
  { id: "extract_candidate_profile", name: "Extract Candidate Profile", status: "completed", summary: "Candidate profile extracted" },
  { id: "extract_job_requirements", name: "Extract Job Requirements", status: "completed", summary: "Requirements extracted" },
  { id: "match_requirements", name: "Match Requirements", status: "completed", summary: "Requirements matched" },
  { id: "calculate_fit_score", name: "Calculate Fit Score", status: "completed", summary: "Weighted score calculated" },
  { id: "generate_recommendations", name: "Generate Recommendations", status: "completed", summary: "Recommendations generated" },
  { id: "generate_final_report", name: "Generate Final Report", status: "completed", summary: "Final report generated" }
];

export const applicationStatuses = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interview", label: "Interview" },
  { id: "result", label: "Result" }
];

export const resumeTemplates = [
  { id: "compact", label: "ATS Compact" },
  { id: "modern", label: "Modern" },
  { id: "technical", label: "Technical" }
];

export const resumeAccents = ["#0f8b73", "#1f6feb", "#8b3dff", "#a73d55", "#b66a18"];
