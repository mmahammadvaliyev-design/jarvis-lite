import { useEffect } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import Today from "./screens/Today";
import Add from "./screens/Add";
import Money from "./screens/Money";
import Stats from "./screens/Stats";
import Settings from "./screens/Settings";
import { getProfile } from "./db";
import {
  clearMoneyReminders,
  clearWaterReminders,
  scheduleMoneyReminders,
  scheduleWaterReminders,
} from "./logic/notify";

const TABS = [
  { to: "/", ico: "📅", label: "План", end: true },
  { to: "/add", ico: "✍️", label: "Добавить", end: false },
  { to: "/budget", ico: "💰", label: "Бюджет", end: false },
  { to: "/stats", ico: "📊", label: "Прогресс", end: false },
  { to: "/settings", ico: "⚙️", label: "Настройки", end: false },
];

export default function App() {
  // Напоминания о бюджете (днём и вечером), пока приложение открыто.
  useEffect(() => {
    getProfile().then((p) => {
      if (p.notifications && p.moneyReminders) scheduleMoneyReminders();
      if (p.notifications && p.waterReminders) scheduleWaterReminders();
    });
    return () => {
      clearMoneyReminders();
      clearWaterReminders();
    };
  }, []);

  return (
    <div className="app">
      <div className="screen">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/add" element={<Add />} />
          <Route path="/budget" element={<Money />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <nav className="nav">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="ico">{t.ico}</span>
            <span className="lbl">{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
