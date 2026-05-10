import React from "react";
import { FileText, PlusCircle } from "lucide-react";
import { ApplicationTracker } from "./ApplicationTracker.jsx";

export function DashboardHome({
  activeStatus,
  cvs,
  onDeleteRun,
  onOpenCvs,
  onOpenNewApplication,
  onSelectRun,
  runs
}) {
  return (
    <section className="dashboardGrid">
      <ApplicationTracker
        activeStatus={activeStatus}
        runs={runs}
        onDeleteRun={onDeleteRun}
        onSelectRun={onSelectRun}
      />

      <div className="dashboardActions">
        <button type="button" onClick={onOpenCvs}>
          <FileText size={22} />
          <span>My CVs</span>
          <small>{cvs.length} uploaded CVs</small>
        </button>
        <button type="button" onClick={onOpenNewApplication}>
          <PlusCircle size={22} />
          <span>New Application</span>
          <small>Submit a JD link or description and pick a CV</small>
        </button>
      </div>
    </section>
  );
}
