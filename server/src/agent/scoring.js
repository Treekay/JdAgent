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

export function calculateFit(requirements, matches) {
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

export function splitRequirementMatches(requirements, matches) {
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

export function requirementMatchesSummary(matches) {
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
