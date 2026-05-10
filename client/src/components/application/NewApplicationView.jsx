import React from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { CvManager } from "./CvManager.jsx";
import { JobInput } from "./JobInput.jsx";

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
          {error ? <p className="error">{error}</p> : <p className="status">{status}</p>}
        </form>
      </section>
    </section>
  );
}
