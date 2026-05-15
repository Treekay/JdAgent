import React from "react";
import { Trash2 } from "lucide-react";
import { applicationStatuses } from "../../data.js";
import {
  formatRunDate,
  getRunStatus,
  getRunStatusLabel,
  getRunTitle
} from "../../resultUtils.js";

function statusIndex(run) {
  return Math.max(
    0,
    applicationStatuses.findIndex((status) => status.id === getRunStatus(run))
  );
}

function progressStepClass(index, currentIndex) {
  return [
    index <= currentIndex ? "complete" : "",
    index === currentIndex ? "current" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function progressRatio(run) {
  const maxIndex = Math.max(1, applicationStatuses.length - 1);
  return statusIndex(run) / maxIndex;
}

export function ApplicationTracker({
  activeStatus,
  onDeleteRun,
  onSelectRun,
  runs
}) {
  const visibleRuns =
    activeStatus === "all" ? runs : runs.filter((run) => getRunStatus(run) === activeStatus);

  return (
    <section className="historyBlock">
      <div className="historyHeader">
        <div>
          <span>Application Tracker</span>
        </div>
      </div>
      {visibleRuns.length ? (
        <div className="recordList">
          {visibleRuns.map((run) => (
            <div className="recordItem trackerItem" key={run._id}>
              <button type="button" onClick={() => onSelectRun(run)}>
                <div className="applicationRowTop">
                  <span>{getRunTitle(run)}</span>
                  <strong>{run.result?.fitScore ?? run.result?.matchScore ?? "--"}%</strong>
                </div>
                <small>
                  {run.createdAt ? formatRunDate(run.createdAt) : "No date"} -{" "}
                  {getRunStatusLabel(run)}
                </small>
                <div className="applicationProgress" style={{ "--progress": progressRatio(run) }}>
                  <div className="applicationProgressTrack" aria-hidden="true">
                    <span />
                  </div>
                  {applicationStatuses.map((status, index) => {
                    const currentIndex = statusIndex(run);

                    return (
                      <span className={progressStepClass(index, currentIndex)} key={status.id}>
                        <i />
                        <em>{status.label}</em>
                      </span>
                    );
                  })}
                </div>
              </button>
              <button
                className="iconButton"
                type="button"
                aria-label={`Delete ${getRunTitle(run)}`}
                onClick={() => onDeleteRun(run._id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No applications in this status yet.</p>
      )}
    </section>
  );
}
