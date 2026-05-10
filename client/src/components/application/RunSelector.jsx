import React from "react";
import { formatRunDate, getRunTitle } from "../../resultUtils.js";

export function RunSelector({ label = "Target job", runs, selectedRunId, onSelectRun }) {
  return (
    <label className="runSelector">
      <span>{label}</span>
      <select value={selectedRunId} onChange={(event) => onSelectRun(event.target.value)}>
        <option value="">Select an application</option>
        {runs.map((run) => (
          <option key={run._id} value={run._id}>
            {getRunTitle(run)}
            {run.createdAt ? ` - ${formatRunDate(run.createdAt)}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
