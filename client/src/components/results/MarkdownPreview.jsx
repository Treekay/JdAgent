import React from "react";

function renderInlineMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const key = `${part}-${index}`;

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

export function MarkdownPreview({ content }) {
  const lines = (content || "").split("\n").filter((line) => line.trim());

  if (!lines.length) {
    return <p className="muted">Run the agent to generate a resume draft.</p>;
  }

  return lines.map((line, index) => {
    const trimmed = line.trim();
    const key = `${trimmed}-${index}`;

    if (trimmed.startsWith("### ")) {
      return <h4 key={key}>{renderInlineMarkdown(trimmed.replace(/^###\s+/, ""))}</h4>;
    }

    if (trimmed.startsWith("## ")) {
      return <h3 key={key}>{renderInlineMarkdown(trimmed.replace(/^##\s+/, ""))}</h3>;
    }

    if (trimmed.startsWith("- ")) {
      return (
        <p className="resumeBullet" key={key}>
          {renderInlineMarkdown(trimmed.replace(/^-\s+/, ""))}
        </p>
      );
    }

    return <p key={key}>{renderInlineMarkdown(trimmed)}</p>;
  });
}
