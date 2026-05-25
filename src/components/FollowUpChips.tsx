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
      <div className="followup-heading">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>Follow-up Questions</span>
      </div>
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
