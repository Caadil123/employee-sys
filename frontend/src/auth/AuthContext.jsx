// This file remembers WHO is logged in, and shares it with every page.
// Any page can use:  const { currentUser, login, logout } = useAuth();

import { createContext, useContext, useEffect, useState } from "react";
import { readToken, removeToken, saveToken, sendRequest } from "../api";

// A "context" is like a shared box that every page can open
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // The logged-in user's details, or null if nobody is logged in
  const [currentUser, setCurrentUser] = useState(null);

  // True while we check the saved token when the page first opens
  const [isCheckingLogin, setIsCheckingLogin] = useState(true);

  // When the app opens: if a token was saved before, ask the backend who it belongs to
  useEffect(() => {
    async function checkSavedLogin() {
      // No saved token means nobody is logged in
      if (!readToken()) {
        setIsCheckingLogin(false);
        return;
      }

      try {
        // The backend checks the token and gives back the user
        const userDetails = await sendRequest("/api/me");
        setCurrentUser(userDetails);
      } catch {
        // The token is expired or fake, so throw it away
        removeToken();
      } finally {
        setIsCheckingLogin(false);
      }
    }

    checkSavedLogin();
  }, []);

  // Log in: send email + password, then save the token we get back
  async function login(email, password) {
    const loginAnswer = await sendRequest("/api/login", "POST", { email, password });
    saveToken(loginAnswer.login_token);
    setCurrentUser(loginAnswer.user);
  }

  // Log out: forget the token and the user
  function logout() {
    removeToken();
    setCurrentUser(null);
  }

  // Put everything in the shared box
  const sharedValues = { currentUser, isCheckingLogin, login, logout };

  return <AuthContext.Provider value={sharedValues}>{children}</AuthContext.Provider>;
}

// A short way for pages to open the shared box
export function useAuth() {
  return useContext(AuthContext);
}
