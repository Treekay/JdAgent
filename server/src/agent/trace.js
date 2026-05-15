export const WORKFLOW_STEPS = [
  { id: "parse_resume", name: "Parse Resume" },
  { id: "parse_job_description", name: "Parse Job Description" },
  { id: "extract_candidate_profile", name: "Extract Candidate Profile" },
  { id: "extract_job_requirements", name: "Extract Job Requirements" },
  { id: "match_requirements", name: "Match Requirements" },
  { id: "calculate_fit_score", name: "Calculate Fit Score" },
  { id: "generate_recommendations", name: "Generate Recommendations" },
  { id: "generate_final_report", name: "Generate Final Report" }
];

export function makeTraceItem(step) {
  return {
    id: step.id,
    name: step.name,
    status: "pending",
    summary: "",
    startedAt: null,
    completedAt: null
  };
}

export async function runStep(trace, stepId, action) {
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
