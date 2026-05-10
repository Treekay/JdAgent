import React from "react";
import { ArrowLeft } from "lucide-react";
import { CvManager } from "./CvManager.jsx";

export function CvLibraryView({
  cvFile,
  cvs,
  isLoadingData,
  isUploadingCv,
  onBack,
  onCvFileChange,
  onDeleteCv,
  onLoadData,
  onSelectCv,
  onUploadCv,
  selectedCvId
}) {
  return (
    <section className="subPageStack">
      <button className="backButton" type="button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
      <section className="panel cvLibraryPanel">
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
      </section>
    </section>
  );
}
