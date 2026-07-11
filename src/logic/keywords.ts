import type { Category, Energy } from "../db";

// Словарь ключевых слов для раскладки задач по категориям.
// Дополняйте свободно — порядок не важен, совпадение ищется по вхождению основы слова.
export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  работа: [
    "работ", "отчёт", "отчет", "встреч", "созвон", "клиент", "проект", "презентац",
    "дедлайн", "почт", "письм", "задач по работе", "совещан", "митинг", "договор",
  ],
  учёба: [
    "учи", "курс", "лекц", "английск", "язык", "экзамен", "домашк", "конспект",
    "урок", "занят", "изуч", "туториал",
  ],
  здоровье: [
    "зал", "спорт", "трениров", "бег", "пробежк", "врач", "зубн", "анализ",
    "витамин", "йог", "прогулк по здоровью", "медитац", "вод", "сон",
  ],
  быт: [
    "купить", "куп ", "магазин", "убрат", "уборк", "постира", "стирк", "посуд",
    "мусор", "готов", "приготов", "почин", "дом", "продукт", "аптек",
  ],
  финансы: [
    "оплат", "счёт", "счет", "налог", "банк", "кредит", "перевод", "бюджет",
    "деньг", "карт", "инвест", "коммуналк",
  ],
  люди: [
    "позвон", "звонок", "мам", "пап", "друг", "подруг", "встрет", "написать",
    "поздрав", "родител", "семь", "коллег по личн",
  ],
  саморазвитие: [
    "книг", "читать", "чтен", "шахмат", "подкаст", "статья", "статью", "навык",
    "хобби", "рисова", "гитар", "медитац практик",
  ],
  отдых: [
    "фильм", "сериал", "отдых", "погуля", "прогул", "игра", "поиграт", "кино",
    "расслаб", "полежа", "музык", "youtube", "ютуб",
  ],
};

const PRIORITY_HIGH = ["важн", "срочн", "обязательн", "сегодня край", "не забыть", "критичн"];
const PRIORITY_LOW = ["если успею", "если будет время", "может быть", "потом", "не срочно", "по возможности"];

const ENERGY_HIGH = ["зал", "спорт", "трениров", "бег", "отчёт", "отчет", "презентац", "сложн", "экзамен", "уборк"];
const ENERGY_LOW = ["позвон", "звонок", "почт", "письм", "купить", "оплат", "мусор", "фильм", "отдых"];

// Дефолтная длительность по категории (минуты), если не указана в тексте.
export const DEFAULT_ESTIMATE: Record<Category, number> = {
  работа: 90,
  учёба: 45,
  здоровье: 60,
  быт: 30,
  финансы: 20,
  люди: 20,
  саморазвитие: 40,
  отдых: 45,
};

function has(text: string, list: string[]): boolean {
  return list.some((k) => text.includes(k));
}

export function detectCategory(text: string): Category {
  const t = text.toLowerCase();
  let best: Category = "быт";
  let bestScore = 0;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    const score = words.filter((w) => t.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return best;
}

export function detectPriority(text: string): "high" | "medium" | "low" {
  const t = text.toLowerCase();
  if (has(t, PRIORITY_HIGH)) return "high";
  if (has(t, PRIORITY_LOW)) return "low";
  return "medium";
}

export function detectEnergy(text: string, category: Category): Energy {
  const t = text.toLowerCase();
  if (has(t, ENERGY_HIGH)) return "high";
  if (has(t, ENERGY_LOW)) return "low";
  // по умолчанию — по «весу» категории
  if (category === "здоровье" || category === "работа" || category === "учёба") return "medium";
  return "low";
}
