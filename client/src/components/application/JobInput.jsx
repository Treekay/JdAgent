import React from "react";
import { Link } from "lucide-react";

export function JobInput({ jobDescription, jobUrl, onJobDescriptionChange, onJobUrlChange }) {
  return (
    <>
      <label className="jdBox">
        <span>Job link</span>
        <div className="urlInput">
          <Link size={17} />
          <input
            value={jobUrl}
            onChange={(event) => onJobUrlChange(event.target.value)}
            placeholder="https://..."
            type="url"
          />
        </div>
      </label>

      <label className="jdBox">
        <span>Job description</span>
        <textarea
          value={jobDescription}
          onChange={(event) => onJobDescriptionChange(event.target.value)}
          placeholder="Paste the job description here if you are not using a link..."
        />
      </label>
    </>
  );
}
