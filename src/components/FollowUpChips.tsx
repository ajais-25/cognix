"use client";

interface FollowUpChipsProps {
  followUps: string[];
  onSelect: (q: string) => void;
}

export default function FollowUpChips({
  followUps,
  onSelect,
}: FollowUpChipsProps) {
  if (!followUps || followUps.length === 0) return null;

  return (
    <div className="followup-chips">
      {followUps.map((q, i) => (
        <button
          key={i}
          className="followup-chip"
          onClick={() => onSelect(q)}
          title={q}
        >
          {q}
        </button>
      ))}
    </div>
  );
}
