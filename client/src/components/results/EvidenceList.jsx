import React from "react";

export function EvidenceList({ items }) {
  if (!items?.length) {
    return <p className="muted">No evidence items yet.</p>;
  }

  return (
    <ul className="cleanList">
      {items.map((item, index) => (
        <li key={`${item.requirementId || item.requirementName || "evidence"}-${index}`}>
          <strong>{item.requirementName || "Evidence"}:</strong> {item.evidence || item}
        </li>
      ))}
    </ul>
  );
}
