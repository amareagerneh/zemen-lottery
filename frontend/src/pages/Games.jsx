import React, { useEffect, useState } from "react";
import TicketStub from "../components/TicketStub.jsx";
import { api } from "../services/api.js";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Games() {
  const { t } = useLanguage();
  const [games, setGames] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .listGames()
      .then((data) => setGames(data.games))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 font-display text-3xl tracking-widest text-paper">{t("openPools")}</h1>
      <p className="mb-6 text-sm text-mist">{t("openPoolsSubtitle")}</p>

      {error && <p className="text-brick">{error}</p>}

      {games === null && !error && <p className="text-mist">{t("loading")}</p>}

      {games?.length === 0 && (
        <div className="rounded-lg border border-dashed border-surfaceRaised p-8 text-center text-mist">
          {t("noOpenPools")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {games?.map((game) => (
          <TicketStub key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}
