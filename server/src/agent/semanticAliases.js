function flattenValues(value) {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenValues);
  if (typeof value === "object") return Object.values(value).flatMap(flattenValues);
  return [];
}

function normalizedCorpus(...values) {
  return flattenValues(values).join("\n").toLowerCase();
}

const SEMANTIC_ALIAS_RULES = [
  {
    id: "rest_api",
    requirementPattern: /\b(rest|restful)\s+(api|apis|service|services)\b/i,
    evidencePattern: /\b(rest|restful)\s+(api|apis|service|services)\b/i,
    evidenceLabel: "CV mentions RESTful API / REST API development."
  },
  {
    id: "api_development",
    requirementPattern: /\b(api|apis|endpoint|endpoints|web service|web services|backend service|backend services)\b/i,
    evidencePattern: /\b(api|apis|endpoint|endpoints|web service|web services|backend service|backend services|express|fastapi|flask|django|spring boot|asp\.net)\b/i,
    evidenceLabel: "CV mentions API, endpoint, web service, or backend service development."
  },
  {
    id: "graphql",
    requirementPattern: /\b(graphql|graph ql)\b/i,
    evidencePattern: /\b(graphql|apollo|relay)\b/i,
    evidenceLabel: "CV mentions GraphQL or related API tooling."
  },
  {
    id: "backend_development",
    requirementPattern: /\b(back[- ]?end|backend|server[- ]side|server side|server application|server applications)\b/i,
    evidencePattern: /\b(back[- ]?end|backend|server[- ]side|server side|node\.?js|express|fastapi|flask|django|spring boot|java|python|c#|\.net|go|golang)\b/i,
    evidenceLabel: "CV mentions backend or server-side development."
  },
  {
    id: "frontend_development",
    requirementPattern: /\b(front[- ]?end|frontend|client[- ]side|client side|ui development|web interface|web interfaces)\b/i,
    evidencePattern: /\b(front[- ]?end|frontend|client[- ]side|client side|react|vue|angular|svelte|javascript|typescript|html|css|tailwind|bootstrap)\b/i,
    evidenceLabel: "CV mentions frontend, client-side, or web UI development."
  },
  {
    id: "javascript_typescript",
    requirementPattern: /\b(java ?script|typescript|ts\/js|js\/ts|ecmascript)\b/i,
    evidencePattern: /\b(java ?script|typescript|node\.?js|react|vue|angular|express|next\.?js|nest\.?js)\b/i,
    evidenceLabel: "CV mentions JavaScript, TypeScript, or related JS ecosystem experience."
  },
  {
    id: "nodejs",
    requirementPattern: /\b(node\.?js|node|express|nestjs|nest\.?js)\b/i,
    evidencePattern: /\b(node\.?js|node|express|nestjs|nest\.?js|npm|yarn|pnpm)\b/i,
    evidenceLabel: "CV mentions Node.js or related backend JavaScript tooling."
  },
  {
    id: "python_backend",
    requirementPattern: /\b(python|django|flask|fastapi)\b/i,
    evidencePattern: /\b(python|django|flask|fastapi|pytest|pandas|numpy)\b/i,
    evidenceLabel: "CV mentions Python or related Python framework experience."
  },
  {
    id: "java_backend",
    requirementPattern: /\b(java|spring|spring boot|j2ee|jakarta)\b/i,
    evidencePattern: /\b(java|spring|spring boot|hibernate|maven|gradle|junit)\b/i,
    evidenceLabel: "CV mentions Java or Spring ecosystem experience."
  },
  {
    id: "dotnet_backend",
    requirementPattern: /\b(c#|\.net|dotnet|asp\.net|entity framework)\b/i,
    evidencePattern: /\b(c#|\.net|dotnet|asp\.net|entity framework|linq)\b/i,
    evidenceLabel: "CV mentions .NET, C#, or ASP.NET ecosystem experience."
  },
  {
    id: "sql_database",
    requirementPattern: /\b(sql|relational database|relational databases|rdbms|postgres|postgresql|mysql|mssql|sql server|oracle)\b/i,
    evidencePattern: /\b(sql|postgres|postgresql|mysql|mssql|sql server|oracle|sqlite|rdbms|relational database|relational databases)\b/i,
    evidenceLabel: "CV mentions SQL or relational database experience."
  },
  {
    id: "nosql_database",
    requirementPattern: /\b(nosql|mongo|mongodb|dynamodb|cosmos db|redis|cassandra|document database|key-value store)\b/i,
    evidencePattern: /\b(nosql|mongo|mongodb|dynamodb|cosmos db|redis|cassandra|document database|key-value store)\b/i,
    evidenceLabel: "CV mentions NoSQL or non-relational database experience."
  },
  {
    id: "orm_database",
    requirementPattern: /\b(orm|object relational mapping|entity framework|hibernate|sequelize|prisma|typeorm|sqlalchemy)\b/i,
    evidencePattern: /\b(orm|entity framework|hibernate|sequelize|prisma|typeorm|sqlalchemy|django orm)\b/i,
    evidenceLabel: "CV mentions ORM or database mapping tooling."
  },
  {
    id: "cloud_platform",
    requirementPattern: /\b(cloud|aws|azure|gcp|google cloud|cloud platform|cloud services)\b/i,
    evidencePattern: /\b(cloud|aws|amazon web services|azure|gcp|google cloud|lambda|ec2|s3|rds|cloudfront|cloudwatch|app service|cloud run)\b/i,
    evidenceLabel: "CV mentions cloud platform or cloud service experience."
  },
  {
    id: "aws",
    requirementPattern: /\b(aws|amazon web services|ec2|s3|lambda|rds|cloudfront|cloudwatch|ecs|eks)\b/i,
    evidencePattern: /\b(aws|amazon web services|ec2|s3|lambda|rds|cloudfront|cloudwatch|ecs|eks)\b/i,
    evidenceLabel: "CV mentions AWS or AWS service experience."
  },
  {
    id: "azure",
    requirementPattern: /\b(azure|microsoft azure|azure functions|app service|azure devops|aks)\b/i,
    evidencePattern: /\b(azure|microsoft azure|azure functions|app service|azure devops|aks)\b/i,
    evidenceLabel: "CV mentions Azure or Azure service experience."
  },
  {
    id: "gcp",
    requirementPattern: /\b(gcp|google cloud|cloud run|cloud functions|bigquery|gke)\b/i,
    evidencePattern: /\b(gcp|google cloud|cloud run|cloud functions|bigquery|gke)\b/i,
    evidenceLabel: "CV mentions Google Cloud or GCP service experience."
  },
  {
    id: "docker_containerization",
    requirementPattern: /\b(docker|container|containers|containeri[sz]ation|containeri[sz]ed)\b/i,
    evidencePattern: /\b(docker|container|containers|containeri[sz]ation|containeri[sz]ed|compose|dockerfile)\b/i,
    evidenceLabel: "CV mentions Docker or containerization experience."
  },
  {
    id: "version_control",
    requirementPattern: /\b(version control|git|github|gitlab|source control)\b/i,
    evidencePattern: /\b(git|github|gitlab|bitbucket|version control|source control)\b/i,
    evidenceLabel: "CV mentions Git / version control tooling."
  },
  {
    id: "agile_scrum",
    requirementPattern: /\b(agile|scrum|kanban|sprint|sprints|jira|stand[- ]?up|standup)\b/i,
    evidencePattern: /\b(agile|scrum|kanban|sprint|sprints|jira|stand[- ]?up|standup|retrospective|backlog)\b/i,
    evidenceLabel: "CV mentions Agile, Scrum, Kanban, Jira, or sprint-based delivery."
  },
  {
    id: "unit_testing",
    requirementPattern: /\b(unit test|unit tests|unit testing|automated test|automated tests|test automation|testing framework)\b/i,
    evidencePattern: /\b(unit test|unit tests|unit testing|automated test|automated tests|test automation|jest|vitest|pytest|junit|xunit|nunit|mocha|cypress|playwright|selenium)\b/i,
    evidenceLabel: "CV mentions unit testing, automated testing, or testing frameworks."
  },
  {
    id: "e2e_testing",
    requirementPattern: /\b(e2e|end[- ]to[- ]end|integration test|integration tests|cypress|playwright|selenium)\b/i,
    evidencePattern: /\b(e2e|end[- ]to[- ]end|integration test|integration tests|cypress|playwright|selenium)\b/i,
    evidenceLabel: "CV mentions E2E or integration testing experience."
  },
  {
    id: "ci_cd",
    requirementPattern: /\b(ci\/cd|continuous integration|continuous deployment|continuous delivery)\b/i,
    evidencePattern: /\b(ci\/cd|continuous integration|continuous deployment|continuous delivery|github actions|gitlab ci|jenkins)\b/i,
    evidenceLabel: "CV mentions CI/CD or continuous integration/deployment tooling."
  },
  {
    id: "devops",
    requirementPattern: /\b(devops|deployment|deployments|release pipeline|release pipelines|build pipeline|build pipelines|automation pipeline)\b/i,
    evidencePattern: /\b(devops|deployment|deployments|release pipeline|build pipeline|github actions|gitlab ci|jenkins|docker|kubernetes|terraform|ansible)\b/i,
    evidenceLabel: "CV mentions DevOps, deployment, release, or build pipeline experience."
  },
  {
    id: "infrastructure_as_code",
    requirementPattern: /\b(iac|infrastructure as code|terraform|cloudformation|pulumi|ansible)\b/i,
    evidencePattern: /\b(iac|infrastructure as code|terraform|cloudformation|pulumi|ansible)\b/i,
    evidenceLabel: "CV mentions infrastructure-as-code tooling."
  },
  {
    id: "kubernetes",
    requirementPattern: /\b(kubernetes|k8s)\b/i,
    evidencePattern: /\b(kubernetes|k8s)\b/i,
    evidenceLabel: "CV mentions Kubernetes / K8s."
  },
  {
    id: "microservices",
    requirementPattern: /\b(microservice|microservices|distributed system|distributed systems|service[- ]oriented|soa)\b/i,
    evidencePattern: /\b(microservice|microservices|distributed system|distributed systems|service[- ]oriented|soa|event-driven|message queue|rabbitmq|kafka|sns|sqs)\b/i,
    evidenceLabel: "CV mentions microservices, distributed systems, or service-oriented architecture."
  },
  {
    id: "message_queue",
    requirementPattern: /\b(message queue|message queues|queue|queues|kafka|rabbitmq|sqs|pub\/sub|pubsub|event driven|event-driven)\b/i,
    evidencePattern: /\b(message queue|message queues|queue|queues|kafka|rabbitmq|sqs|pub\/sub|pubsub|event driven|event-driven)\b/i,
    evidenceLabel: "CV mentions message queues or event-driven systems."
  },
  {
    id: "software_architecture",
    requirementPattern: /\b(architecture|system design|design patterns|scalable|scalability|maintainable|clean architecture|solid)\b/i,
    evidencePattern: /\b(architecture|system design|design pattern|design patterns|scalable|scalability|maintainable|clean architecture|solid|modular)\b/i,
    evidenceLabel: "CV mentions architecture, system design, scalability, or maintainable design."
  },
  {
    id: "security",
    requirementPattern: /\b(security|secure coding|authentication|authorization|auth|oauth|jwt|owasp|encryption)\b/i,
    evidencePattern: /\b(security|secure coding|authentication|authorization|auth|oauth|jwt|owasp|encryption|bcrypt|tls|ssl)\b/i,
    evidenceLabel: "CV mentions security, authentication, authorization, or secure coding concepts."
  },
  {
    id: "performance",
    requirementPattern: /\b(performance|optimization|optimisation|latency|throughput|profiling|scalability)\b/i,
    evidencePattern: /\b(performance|optimization|optimisation|latency|throughput|profiling|scalability|caching|cache)\b/i,
    evidenceLabel: "CV mentions performance, optimization, caching, or scalability work."
  },
  {
    id: "observability",
    requirementPattern: /\b(observability|monitoring|logging|metrics|alerting|tracing|prometheus|grafana|elk|cloudwatch)\b/i,
    evidencePattern: /\b(observability|monitoring|logging|metrics|alerting|tracing|prometheus|grafana|elk|cloudwatch|datadog|new relic|splunk)\b/i,
    evidenceLabel: "CV mentions observability, monitoring, logging, metrics, or alerting."
  },
  {
    id: "documentation",
    requirementPattern: /\b(documentation|technical documentation|api documentation|readme|knowledge sharing)\b/i,
    evidencePattern: /\b(documentation|technical documentation|api documentation|readme|knowledge sharing|wiki|confluence)\b/i,
    evidenceLabel: "CV mentions documentation, API docs, READMEs, or knowledge sharing."
  },
  {
    id: "code_review",
    requirementPattern: /\b(code review|code reviews|peer review|pull request|pull requests|pr review|merge request)\b/i,
    evidencePattern: /\b(code review|code reviews|peer review|pull request|pull requests|pr review|merge request|github|gitlab)\b/i,
    evidenceLabel: "CV mentions code review, pull requests, or collaborative development workflow."
  }
];

export function applySemanticAliasMatches(matches, requirements, parsedResume, candidateProfile) {
  const corpus = normalizedCorpus(parsedResume, candidateProfile);
  const matchById = new Map(matches.map((match) => [match.requirementId, match]));

  return requirements.map((requirement) => {
    const current = matchById.get(requirement.id) || {
      requirementId: requirement.id,
      status: "missing",
      evidence: [],
      rationale: "No supporting CV evidence was identified."
    };
    const requirementText = `${requirement.name} ${requirement.description} ${requirement.category}`;

    if (current.status === "matched") {
      return current;
    }

    const aliasRule = SEMANTIC_ALIAS_RULES.find(
      (rule) => rule.requirementPattern.test(requirementText) && rule.evidencePattern.test(corpus)
    );

    if (!aliasRule) {
      return current;
    }

    return {
      ...current,
      status: "matched",
      evidence: [...new Set([...(current.evidence || []), aliasRule.evidenceLabel])],
      rationale:
        current.status === "missing"
          ? `Matched by semantic equivalence (${aliasRule.id}); the CV contains equivalent wording for this requirement.`
          : current.rationale
    };
  });
}
