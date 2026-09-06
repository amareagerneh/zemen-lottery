import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Register() {
  const { register, loading, error } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await register(name, phone, password, referralCode.trim() || undefined);
      navigate("/", { replace: true });
    } catch {
      // error surfaced via context
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center font-display text-4xl tracking-widest text-gold">
          {t("appName")}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-surface p-6">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-mist">
              {t("fullName")}
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 text-paper outline-none focus:border-gold"
            />
          </div>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 text-paper outline-none focus:border-gold"
            />
            <p className="mt-1 text-xs text-mist">At least 8 characters.</p>
          </div>

          <div>
            <label htmlFor="referralCode" className="mb-1 block text-sm text-mist">
              Referral code (optional)
            </label>
            <input
              id="referralCode"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3D4"
              className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 font-mono uppercase text-paper outline-none focus:border-gold"
            />
          </div>

          {error && <p className="text-sm text-brick">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-gold py-2 font-display tracking-widest text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "…" : t("createAccount").toUpperCase()}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-mist">
          {t("alreadyRegistered")}{" "}
          <Link to="/login" className="text-gold hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
