import React from "react";

export function ScoreRing({ score }) {
  const angle = Math.max(0, Math.min(score, 100)) * 3.6;

  return (
    <div
      className="scoreRing"
      style={{
        background: `conic-gradient(#13a881 ${angle}deg, #dde7e3 ${angle}deg)`
      }}
      aria-label={`Match score ${score}%`}
    >
      <div>
        <strong>{score}</strong>
        <span>%</span>
      </div>
    </div>
  );
}
