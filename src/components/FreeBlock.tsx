import { useEffect, useState } from "react";
import { db, todayStr } from "../db";
import { pickSuggestion, type Suggestion } from "../content/suggestions";
import { SuggestionCard } from "./SuggestionCard";

// Одно свободное окно: подбирает предложение по интересам, помнит показанные.
export function FreeBlock({
  interests,
  windowMinutes,
}: {
  interests: string[];
  windowMinutes: number;
}) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [dismissed, setDismissed] = useState(false);

  async function loadNew() {
    const today = todayStr();
    const seenRows = await db.seen.where("date").equals(today).toArray();
    const seenIds = seenRows.map((r) => r.suggestionId);
    const next = pickSuggestion(interests, windowMinutes, seenIds);
    if (next) {
      await db.seen.put({ id: `${next.id}@${today}`, suggestionId: next.id, date: today });
    }
    setSuggestion(next);
  }

  useEffect(() => {
    loadNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) {
    return (
      <div className="card block-free">
        <div className="muted">Свободно ~{windowMinutes} мин — отдыхай спокойно 🙂</div>
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="card block-free">
        <div className="muted">Свободно ~{windowMinutes} мин</div>
      </div>
    );
  }

  return (
    <SuggestionCard
      suggestion={suggestion}
      windowMinutes={windowMinutes}
      onNext={loadNew}
      onThanks={() => setDismissed(true)}
    />
  );
}
