import type { Category, Profile, Task } from "../db";

export interface Idea {
  title: string;
  category: Category;
  estimateMin: number;
  reason: string;
}

// Правила «что бы ещё сделать сегодня». Без ИИ: смотрим, каких категорий не хватает,
// на время суток и на интересы. Умную, привязанную к привычкам версию даст LLM позже.
export function proposeIdeas(todayTasks: Task[], profile: Profile, nowHHMM: string): Idea[] {
  const hour = parseInt(nowHHMM.split(":")[0], 10);
  const cats = new Set(todayTasks.map((t) => t.category));
  const titles = todayTasks.map((t) => t.title.toLowerCase());
  const interests = profile.interests.map((i) => i.toLowerCase());
  const hasInterest = (k: string) => interests.some((i) => i.includes(k));

  const pool: Idea[] = [];

  if (!cats.has("здоровье")) {
    pool.push({
      title: hour >= 18 ? "Вечерняя прогулка 20 минут" : "Разминка или короткая прогулка",
      category: "здоровье",
      estimateMin: 20,
      reason: "немного движения — и энергии на день больше",
    });
  }

  if (!cats.has("саморазвитие")) {
    if (hasInterest("англ")) {
      pool.push({ title: "Английский: выучить 5 новых слов", category: "саморазвитие", estimateMin: 15, reason: "маленький шаг каждый день заметно двигает язык" });
    } else if (hasInterest("шахмат")) {
      pool.push({ title: "Решить шахматную задачу", category: "саморазвитие", estimateMin: 10, reason: "хорошая зарядка для ума" });
    } else {
      pool.push({ title: "Почитать книгу 20 минут", category: "саморазвитие", estimateMin: 20, reason: "спокойное время для себя" });
    }
  }

  if (!cats.has("люди")) {
    pool.push({ title: "Написать близкому человеку", category: "люди", estimateMin: 10, reason: "пара минут — а человеку приятно" });
  }

  if (hour >= 13 && !cats.has("отдых")) {
    pool.push({ title: "Сделать осознанную паузу", category: "отдых", estimateMin: 15, reason: "отдых — часть продуктивного дня, а не помеха" });
  }

  if (hour < 11 && todayTasks.length > 0) {
    pool.push({ title: "Выпить воды и наметить главную задачу дня", category: "здоровье", estimateMin: 5, reason: "хорошее начало задаёт тон всему дню" });
  }

  // Не повторяем то, что уже есть в задачах.
  const filtered = pool.filter((idea) => !titles.some((t) => t.includes(idea.title.toLowerCase().slice(0, 8))));

  return filtered.slice(0, 3);
}
