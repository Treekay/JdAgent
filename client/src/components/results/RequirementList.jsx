import React from "react";

function priorityClass(priority = "medium") {
  const normalized = priority.toLowerCase();

  if (normalized === "high") return "priorityBadge high";
  if (normalized === "low") return "priorityBadge low";
  return "priorityBadge medium";
}

export function RequirementList({ items, emptyLabel }) {
  if (!items?.length) {
    return <p className="muted">{emptyLabel}</p>;
  }

  return (
    <div className="requirementList">
      {items.map((item) => (
        <article className="requirementItem" key={item.id || item.name}>
          <div>
            <strong>{item.name}</strong>
            <small className={priorityClass(item.priority)}>
              {item.priority || "medium"} priority
            </small>
          </div>
          {item.rationale ? <p>{item.rationale}</p> : null}
          {item.evidence?.length ? (
            <ul>
              {item.evidence.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}
