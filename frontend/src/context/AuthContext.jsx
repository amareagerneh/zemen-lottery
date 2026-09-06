import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "zemen_token";
const USER_KEY = "zemen_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function persist(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setUser(user);
  }

  async function login(phone, password) {
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await api.login({ phone, password });
      persist(token, user);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function register(name, phone, password, referralCode) {
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await api.register({ name, phone, password, referralCode });
      persist(token, user);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  // Keep tabs in sync if the user logs out in another tab.
  useEffect(() => {
    function onStorage(e) {
      if (e.key === TOKEN_KEY && !e.newValue) setUser(null);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // True until we've finished checking whether this page is running
  // inside Telegram (the bot's optional "Open full app" button) and, if
  // so, finished the auto-login attempt. The app is bot-first now — most
  // visitors never hit this at all — but it keeps that button working
  // properly for anyone who does use it.
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      setAuthReady(true);
      return;
    }
    tg.ready();
    tg.expand();

    const initData = tg.initData;
    if (!initData || user) {
      setAuthReady(true);
      return;
    }

    setLoading(true);
    api
      .telegramLogin(initData)
      .then(({ token, user }) => persist(token, user))
      .catch((err) => setError(err.message))
      .finally(() => {
        setLoading(false);
        setAuthReady(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, authReady, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
