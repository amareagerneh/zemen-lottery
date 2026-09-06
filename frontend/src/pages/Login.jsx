import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Login() {
  const { login, loading, error } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await login(phone, password);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch {
      // error is already surfaced via context
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center font-display text-4xl tracking-widest text-gold">
          {t("appName")}
        </h1>
        <p className="mb-6 text-center text-xs text-mist">{t("adminSignInNote")}</p>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-surface p-6">
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm text-mist">
              {t("phone")}
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2519XXXXXXXX"
              className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 font-mono text-paper outline-none focus:border-gold"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-mist">
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 text-paper outline-none focus:border-gold"
            />
          </div>

          {error && <p className="text-sm text-brick">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-gold py-2 font-display tracking-widest text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "…" : t("signIn").toUpperCase()}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-mist">
          {t("newHere")}{" "}
          <Link to="/register" className="text-gold hover:underline">
            {t("createAccount")}
          </Link>
        </p>
      </div>
    </div>
  );
}
