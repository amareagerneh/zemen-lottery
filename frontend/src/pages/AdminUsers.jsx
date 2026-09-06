import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "DEPOSITED", label: "Deposited" },
  { key: "NOT_DEPOSITED", label: "Never deposited" },
];

export default function AdminUsers() {
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [users, setUsers] = useState(null);

  useEffect(() => {
    api.getUserStats().then((d) => setStats(d.stats));
  }, []);

  useEffect(() => {
    setUsers(null);
    api.listAdminUsers(filter).then((d) => setUsers(d.users));
  }, [filter]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 font-display text-3xl tracking-widest text-paper">USERS</h1>

      {stats && (
        <div className="mb-6 grid grid-cols-3 gap-3 font-mono">
          <div className="rounded bg-surface p-3 text-center">
            <div className="text-xs text-mist">Total registered</div>
            <div className="text-xl font-bold text-paper">{stats.totalUsers}</div>
          </div>
          <div className="rounded bg-surface p-3 text-center">
            <div className="text-xs text-mist">Have deposited</div>
            <div className="text-xl font-bold text-teal">{stats.usersWithDeposit}</div>
          </div>
          <div className="rounded bg-surface p-3 text-center">
            <div className="text-xs text-mist">Never deposited</div>
            <div className="text-xl font-bold text-brick">{stats.usersWithoutDeposit}</div>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded px-4 py-1.5 font-display text-sm tracking-widest ${
              filter === f.key ? "bg-gold text-ink" : "bg-surface text-mist"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {users === null && <p className="text-mist">Loading…</p>}
      {users?.length === 0 && <p className="text-mist">No users match this filter.</p>}

      {users?.length > 0 && (
        <div className="overflow-hidden rounded-lg bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surfaceRaised text-left text-xs text-mist">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2 text-right">Deposited</th>
                <th className="px-3 py-2 text-right"># Deposits</th>
                <th className="px-3 py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-surfaceRaised last:border-0">
                  <td className="px-3 py-2 text-paper">
                    {u.name}
                    {u.role === "ADMIN" && (
                      <span className="ml-1 text-xs text-goldDim">(admin)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-mist">{u.phone}</td>
                  <td className="px-3 py-2 text-right font-mono text-teal">
                    {u.total_deposited} ETB
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-mist">{u.deposit_count}</td>
                  <td className="px-3 py-2 text-xs text-mist">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
