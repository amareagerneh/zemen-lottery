import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

export default function Landing() {
  const { t } = useLanguage();
  const botLink = BOT_USERNAME ? `https://t.me/${BOT_USERNAME}` : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 font-display text-4xl tracking-widest text-gold">
          {t("appName")}
        </h1>
        <p className="mb-8 text-mist">{t("landingTagline")}</p>

        <div className="mb-6 rounded-lg bg-surface p-6">
          <div className="mb-4 text-5xl">🎟️</div>
          <p className="mb-6 text-sm text-paper">{t("landingBody")}</p>

          {botLink ? (
            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded bg-gold py-3 text-center font-display text-lg tracking-widest text-ink transition-opacity hover:opacity-90"
            >
              {t("openInTelegram").toUpperCase()} ↗
            </a>
          ) : (
            <p className="text-sm text-brick">{t("botLinkMissing")}</p>
          )}
        </div>

        <p className="text-xs text-mist">
          {t("adminQuestion")}{" "}
          <Link to="/login" className="text-gold hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
