import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { api } from "../services/api.js";

const adminLinkClass = ({ isActive }) =>
  `font-display text-sm tracking-wide transition-colors ${
    isActive ? "text-gold" : "text-mist hover:text-paper"
  }`;

export default function Navbar() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (!user) return;
    api
      .getWallet()
      .then((data) => setBalance(data.balance))
      .catch(() => setBalance(null));
  }, [user]);

  if (!user) return null;

  return (
    <header className="border-b border-surfaceRaised bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <NavLink to="/" className="font-display text-2xl tracking-widest text-gold">
          {t("appName")}
        </NavLink>
        <span className="font-mono text-sm text-mist">
          {balance !== null ? `${balance} ETB` : "…"}
        </span>
      </div>

      {user.role === "ADMIN" && (
        <nav className="flex items-center gap-5 overflow-x-auto border-t border-surfaceRaised bg-ink px-4 py-1.5 sm:px-6">
          <span className="font-display text-xs tracking-widest text-goldDim">ADMIN</span>
          <NavLink to="/admin" end className={adminLinkClass}>
            {t("createPool")}
          </NavLink>
          <NavLink to="/admin/games" className={adminLinkClass}>
            Pools
          </NavLink>
          <NavLink to="/admin/users" className={adminLinkClass}>
            Users
          </NavLink>
          <NavLink to="/admin/deposits" className={adminLinkClass}>
            {t("deposits")}
          </NavLink>
          <NavLink to="/admin/withdrawals" className={adminLinkClass}>
            {t("withdrawals")}
          </NavLink>
        </nav>
      )}
    </header>
  );
}
