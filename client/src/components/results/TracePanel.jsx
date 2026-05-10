import React from "react";
import { CheckCircle2 } from "lucide-react";

export function TracePanel({ trace }) {
  return (
    <section className="tracePanel">
      <h2>Agent Trace</h2>
      <div className="traceList">
        {(trace || []).map((step, index) => (
          <div className={`traceItem ${step.status}`} key={`${step.id}-${step.status}-${index}`}>
            <CheckCircle2 size={16} />
            <span>{step.name}</span>
            <small>{step.status}</small>
            {step.summary ? <p>{step.summary}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
