import React from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { CvManager } from "./CvManager.jsx";
import { JobInput } from "./JobInput.jsx";

const agentProgressSteps = [
  "Parse Resume",
  "Parse Job Description",
  "Extract Candidate Profile",
  "Extract Job Requirements",
  "Match Requirements",
  "Calculate Fit Score",
  "Generate Recommendations",
  "Generate Final Report"
];

export function AgentRunningProgress() {
  return (
    <section className="agentRunningProgress" aria-live="polite">
      <div>
        <strong>AI analysis in progress</strong>
        <span>Running the workflow step by step. This may take a moment.</span>
      </div>
      <div className="agentProgressBar">
        <span />
      </div>
      <div className="agentProgressSteps">
        {agentProgressSteps.map((step, index) => (
          <span key={step} style={{ "--step": index }}>
            {step}
          </span>
        ))}
      </div>
    </section>
  );
}

export function NewApplicationView({
  canRun,
  cvFile,
  cvs,
  error,
  isLoadingData,
  isRunning,
  isUploadingCv,
  jobDescription,
  jobUrl,
  onBack,
  onCvFileChange,
  onDeleteCv,
  onJobDescriptionChange,
  onJobUrlChange,
  onLoadData,
  onRunAgent,
  onSelectCv,
  onUploadCv,
  selectedCvId,
  status
}) {
  return (
    <section className="subPageStack">
      <button className="backButton" type="button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <section className="moduleGrid">
        <CvManager
          cvFile={cvFile}
          cvs={cvs}
          isLoadingData={isLoadingData}
          isUploadingCv={isUploadingCv}
          selectedCvId={selectedCvId}
          onCvFileChange={onCvFileChange}
          onDeleteCv={onDeleteCv}
          onLoadData={onLoadData}
          onSelectCv={onSelectCv}
          onUploadCv={onUploadCv}
        />

        <form className="panel newApplicationPanel" onSubmit={onRunAgent}>
          <h2>Target job</h2>
          <JobInput
            jobDescription={jobDescription}
            jobUrl={jobUrl}
            onJobDescriptionChange={onJobDescriptionChange}
            onJobUrlChange={onJobUrlChange}
          />
          <button className="runButton" type="submit" disabled={!canRun}>
            {isRunning ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            Run AI Match
          </button>
          {isRunning ? <AgentRunningProgress /> : null}
          {error ? <p className="error">{error}</p> : <p className="status">{status}</p>}
        </form>
      </section>
    </section>
  );
}
