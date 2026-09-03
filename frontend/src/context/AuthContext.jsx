import React, { createContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";

// ✅ Named export is a Context (not a component) — keep stable across edits
export const AuthContext = createContext(null);

// ✅ Default export is a component — keep this default export stable
function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [currency, setCurrency] = useState(
    () => localStorage.getItem("currency") || "PKR"
  );

  const authHeaders = (tkn = token) => ({
    headers: { Authorization: `Bearer ${tkn}` },
  });

  // Fetch profile when token changes
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        setUser(null);
        localStorage.removeItem("user");
        return;
      }
      try {
        const res = await api.get("/api/auth/me", authHeaders());
        if (!cancelled) {
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken("");
          setUser(null);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Preferences (currency)
  const fetchPrefs = async (tkn = token) => {
    if (!tkn) return;
    try {
      const r = await api.get("/api/users/prefs", authHeaders(tkn));
      const cur = r.data?.currency || "PKR";
      setCurrency(cur);
      localStorage.setItem("currency", cur);
    } catch {
      // keep local currency
    }
  };

  const updateCurrency = async (cur) => {
    setCurrency(cur);
    localStorage.setItem("currency", cur);
    try {
      await api.put("/api/users/prefs", { currency: cur }, authHeaders());
    } catch {
      // optionally toast error / revert
    }
  };

  // Auth actions
  const login = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    if (!res?.data?.token) throw new Error(res?.data?.message || "Login failed");
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    await fetchPrefs(res.data.token);
    return res.data.user;
  };

  // Your backend returns { message, userId, needsVerification } on register.
  const register = async (username, email, password) => {
    const res = await api.post("/api/auth/register", { username, email, password });
    if (res?.data?.token) {
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      await fetchPrefs(res.data.token);
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      setUser,
      login,
      register,
      logout,
      currency,
      updateCurrency,
    }),
    [token, user, currency]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
