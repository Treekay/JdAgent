import React from "react";
import { Download, Palette } from "lucide-react";
import { resumeAccents, resumeTemplates } from "../../data.js";
import { Panel } from "../common/Panel.jsx";
import { MarkdownPreview } from "./MarkdownPreview.jsx";

function ResumePreview({ accent, content, template }) {
  return (
    <article className={`resumePreview ${template}`} style={{ "--resumeAccent": accent }}>
      <div className="resumeTopline" />
      <MarkdownPreview content={content} />
    </article>
  );
}

export function ResumeTemplatePanel({
  result,
  resumeAccent,
  resumeTemplate,
  onAccentChange,
  onTemplateChange
}) {
  return (
    <Panel icon={Palette} title="Resume Template">
      <div className="templateToolbar">
        <div className="templateOptions">
          {resumeTemplates.map((template) => (
            <button
              className={resumeTemplate === template.id ? "active" : ""}
              key={template.id}
              type="button"
              onClick={() => onTemplateChange(template.id)}
            >
              {template.label}
            </button>
          ))}
        </div>
        <div className="accentOptions" aria-label="Resume accent color">
          {resumeAccents.map((accent) => (
            <button
              className={resumeAccent === accent ? "active" : ""}
              key={accent}
              style={{ background: accent }}
              type="button"
              aria-label={`Use accent ${accent}`}
              onClick={() => onAccentChange(accent)}
            />
          ))}
        </div>
        <button className="secondaryButton printButton" type="button" onClick={() => window.print()}>
          <Download size={16} />
          Save PDF
        </button>
      </div>
      <ResumePreview
        accent={resumeAccent}
        content={result.tailoredResume}
        template={resumeTemplate}
      />
    </Panel>
  );
}
