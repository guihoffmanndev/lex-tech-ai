import React from "react";

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

export default function HighlightText({ text, query, className }: HighlightTextProps) {
  if (!query || !query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
