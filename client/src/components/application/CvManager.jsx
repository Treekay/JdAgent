import React from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { formatRunDate } from "../../resultUtils.js";

export function CvManager({
  cvFile,
  cvs,
  isLoadingData,
  isUploadingCv,
  onCvFileChange,
  onDeleteCv,
  onLoadData,
  onSelectCv,
  onUploadCv,
  selectedCvId
}) {
  return (
    <section className="cvBlock">
      <div className="historyHeader">
        <div>
          <FileText size={18} />
          <span>Saved CVs</span>
        </div>
        <button type="button" onClick={onLoadData} disabled={isLoadingData}>
          {isLoadingData ? "Loading" : "Refresh"}
        </button>
      </div>

      <label className="uploadBox">
        <input
          type="file"
          accept=".txt,.pdf,.docx"
          onChange={(event) => onCvFileChange(event.target.files?.[0] || null)}
        />
        <Upload size={24} />
        <strong>{cvFile ? cvFile.name : "Upload a new CV"}</strong>
        <span>TXT, PDF, or DOCX</span>
      </label>
      <button
        className="secondaryButton"
        type="button"
        disabled={!cvFile || isUploadingCv}
        onClick={onUploadCv}
      >
        {isUploadingCv ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
        Save CV
      </button>

      {cvs.length ? (
        <div className="recordList">
          {cvs.map((cv) => (
            <div className={`recordItem ${selectedCvId === cv._id ? "selected" : ""}`} key={cv._id}>
              <button type="button" onClick={() => onSelectCv(cv._id)}>
                <span>{cv.fileName}</span>
                <small>{cv.createdAt ? formatRunDate(cv.createdAt) : ""}</small>
              </button>
              <button
                className="iconButton"
                type="button"
                aria-label={`Delete ${cv.fileName}`}
                onClick={() => onDeleteCv(cv._id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Upload a CV before running the agent.</p>
      )}
    </section>
  );
}
