import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { ArrowUpRight, ArrowDownLeft, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';

const TYPE_COLOR = {
  DEPOSIT: "text-teal",
  PRIZE: "text-gold",
  REFUND: "text-teal",
  TICKET: "text-mist",
  WITHDRAWAL: "text-brick",
  BONUS: "text-gold",
};

export default function Wallet() {
  const { t } = useLanguage();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    api.getWallet().then((d) => setBalance(d.balance));
    api.getTransactions().then((d) => setTransactions(d.transactions));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 font-display text-3xl tracking-widest text-paper">
        {t("nav_wallet").toUpperCase()}
      </h1>

      <div className="mb-6 rounded-lg bg-surface p-6 text-center">
        <div className="text-sm text-mist">{t("balance")}</div>
        <div className="font-mono text-4xl font-bold text-gold">
          {balance !== null ? `${balance} ETB` : "…"}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4">
        <Link
          to="/deposit"
          className="rounded-lg bg-teal py-4 text-center font-display text-lg tracking-widest text-ink transition-opacity hover:opacity-90"
        >
          {t("deposit").toUpperCase()}
          <ArrowDownLeft className="ml-2 inline h-4 w-4" />
        </Link>
        <Link
          to="/withdraw"
          className="rounded-lg bg-gold py-4 text-center font-display text-lg tracking-widest text-ink transition-opacity hover:opacity-90"
        >
          {t("withdraw").toUpperCase()}
          <ArrowUpRight className="ml-2 inline h-4 w-4" />
        </Link>
      </div>

      <h2 className="mb-3 font-display tracking-widest text-mist">{t("ledger").toUpperCase()}</h2>
      {transactions.length === 0 ? (
        <p className="text-mist">{t("noTransactions")}</p>
      ) : (
        <ul className="divide-y divide-surfaceRaised rounded-lg bg-surface">
          {transactions.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className={`font-display tracking-wide ${TYPE_COLOR[tx.type] || "text-paper"}`}>
                  {tx.type}
                </div>
                <div className="text-xs text-mist">
                  {new Date(tx.created_at).toLocaleString()}
                </div>
              </div>
              <div className={`font-mono font-semibold ${tx.amount < 0 ? "text-brick" : "text-teal"}`}>
                {tx.amount > 0 ? "+" : ""}
                {tx.amount} ETB
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
