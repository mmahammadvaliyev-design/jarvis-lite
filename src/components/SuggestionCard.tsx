import { useState } from "react";
import type { Suggestion } from "../content/suggestions";

const KIND_ICON: Record<string, string> = {
  fact: "💡",
  word: "📖",
  etymology: "🔤",
  puzzle: "🧩",
  recommendation: "🎬",
  rest: "☕",
};

export function SuggestionCard({
  suggestion,
  windowMinutes,
  onNext,
  onThanks,
}: {
  suggestion: Suggestion;
  windowMinutes: number;
  onNext: () => void;
  onThanks: () => void;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  return (
    <div className="card block-free">
      <div className="muted" style={{ marginBottom: 6 }}>
        Свободно ~{windowMinutes} мин · {suggestion.interest === "*" ? "пауза" : suggestion.interest}
      </div>
      <div style={{ fontWeight: 600 }}>
        {KIND_ICON[suggestion.kind] ?? "✨"} {suggestion.title}
      </div>
      <div style={{ marginTop: 6, lineHeight: 1.5 }}>{suggestion.content}</div>

      {suggestion.answer && (
        <div className="spoiler">
          {showAnswer ? (
            <div className="answer">{suggestion.answer}</div>
          ) : (
            <button className="ghost small" onClick={() => setShowAnswer(true)}>
              Показать ответ
            </button>
          )}
        </div>
      )}

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button className="small" onClick={onNext}>
          Ещё
        </button>
        <button className="ghost small" onClick={onThanks}>
          Спасибо, хватит
        </button>
      </div>
    </div>
  );
}
