import React from "react";

export function Panel({ icon: Icon, title, children }) {
  return (
    <section className="panel">
      <div className="panelTitle">
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}
