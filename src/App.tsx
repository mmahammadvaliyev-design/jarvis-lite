import { NavLink, Route, Routes } from "react-router-dom";
import Today from "./screens/Today";
import Add from "./screens/Add";
import Evening from "./screens/Evening";
import Stats from "./screens/Stats";
import Settings from "./screens/Settings";

const TABS = [
  { to: "/", ico: "📅", label: "Сегодня", end: true },
  { to: "/add", ico: "➕", label: "Добавить", end: false },
  { to: "/evening", ico: "🌙", label: "Вечер", end: false },
  { to: "/stats", ico: "📊", label: "Статистика", end: false },
  { to: "/settings", ico: "⚙️", label: "Настройки", end: false },
];

export default function App() {
  return (
    <div className="app">
      <div className="screen">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/add" element={<Add />} />
          <Route path="/evening" element={<Evening />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <nav className="nav">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="ico">{t.ico}</span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
