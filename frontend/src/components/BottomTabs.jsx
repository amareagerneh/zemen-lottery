import React from "react";
import { NavLink } from "react-router-dom";
import { Dice5, Ticket, Wallet, User } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

const TABS = [
  { to: "/", icon: Dice5, key: "nav_games", end: true },
  { to: "/my-tickets", icon: Ticket, key: "nav_tickets" },
  { to: "/wallet", icon: Wallet, key: "nav_wallet" },
  { to: "/profile", icon: User, key: "nav_profile" },
];

export default function BottomTabs() {
  const { t } = useLanguage();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-surfaceRaised bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-5xl">
        {TABS.map(({ to, icon: Icon, key, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? "text-gold" : "text-mist"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span>{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
