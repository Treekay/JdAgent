import React from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MessageSquareText,
  Sparkles,
  Target
} from "lucide-react";
import { Panel } from "../common/Panel.jsx";
import { ScoreRing } from "../common/ScoreRing.jsx";
import { EvidenceList } from "./EvidenceList.jsx";
import { MarkdownPreview } from "./MarkdownPreview.jsx";
import { RequirementList } from "./RequirementList.jsx";
import { TracePanel } from "./TracePanel.jsx";

export function AnalysisReport({ result, showTrace, onToggleTrace }) {
  return (
    <section className="analysisReport">
      <Panel icon={Target} title="Fit Score">
        <div className="scoreLayout">
          <ScoreRing score={result.fitScore || result.matchScore || 0} />
          <div>
            <h3>{result.roleTitle || "Role alignment"}</h3>
            <p>
              {result.companyName
                ? `Prepared for ${result.companyName}. The score is calculated from weighted requirement coverage.`
                : "The score is calculated from weighted requirement coverage."}
            </p>
          </div>
        </div>
      </Panel>

      <Panel icon={CheckCircle2} title="Matched Requirements">
        <RequirementList
          items={(result.matchedRequirements || []).slice(0, 5)}
          emptyLabel="No matched requirements yet."
        />
      </Panel>

      <Panel icon={BriefcaseBusiness} title="Missing Requirements">
        <RequirementList
          items={(result.missingRequirements || []).slice(0, 5)}
          emptyLabel="No missing requirements found."
        />
      </Panel>

      <Panel icon={FileText} title="Evidence">
        <EvidenceList items={(result.evidence || []).slice(0, 6)} />
      </Panel>

      <Panel icon={Sparkles} title="Recommendations">
        <ul className="cleanList">
          {(result.recommendations || []).slice(0, 5).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Panel>

      <Panel icon={MessageSquareText} title="Final Report">
        <div className="markdownReport compactReport">
          <MarkdownPreview content={result.finalReport} />
        </div>
      </Panel>

      <section className="traceToggle">
        <button type="button" onClick={onToggleTrace}>
          {showTrace ? "Hide agent trace" : "Show agent trace"}
        </button>
      </section>

      {showTrace ? <TracePanel trace={result.agentTrace} /> : null}
    </section>
  );
}
