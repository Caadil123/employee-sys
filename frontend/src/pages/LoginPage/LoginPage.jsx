// The login page: the user types their email and password here.

import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./LoginPage.css";

export default function LoginPage() {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();

  // What the user types in the form
  const [typedEmail, setTypedEmail] = useState("");
  const [typedPassword, setTypedPassword] = useState("");

  // Show the password as text or as dots
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // The error message to show (empty = no error)
  const [errorMessage, setErrorMessage] = useState("");

  // True while we wait for the backend, so the button can't be clicked twice
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Already logged in? Then there is no reason to see the login page.
  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  // Runs when the user clicks "Log in" or presses Enter
  async function handleLogin(event) {
    // Stop the browser from reloading the page (the normal form behaviour)
    event.preventDefault();

    // Clear the old error and show the loading state
    setErrorMessage("");
    setIsLoggingIn(true);

    try {
      // Ask the backend to check the email and password
      await login(typedEmail, typedPassword);

      // Success: go to the dashboard
      navigate("/");
    } catch (loginError) {
      // Failed: show the reason, e.g. "Wrong email or password"
      setErrorMessage(loginError.message);
    } finally {
      // Stop the loading state (success or not)
      setIsLoggingIn(false);
    }
  }

  return (
    <div className="login-page">
      {/* Left side: purple welcome panel */}
      <div className="login-welcome">
        <div className="brand">
          <span className="brand-logo">E</span>
          <span className="brand-name">EmployeeMS</span>
        </div>

        <h1>Manage your team in one place.</h1>
        <p>Add, edit and organise every employee in your company, quickly and safely.</p>
      </div>

      {/* Right side: the login form */}
      <div className="login-form-side">
        <form className="login-card" onSubmit={handleLogin}>
          <h2>Welcome back</h2>
          <p className="login-subtitle">Log in to your account</p>

          {/* The error box only appears when there is an error */}
          {errorMessage && <div className="login-error">{errorMessage}</div>}

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={typedEmail}
            onChange={(event) => setTypedEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>
          <div className="password-box">
            <input
              id="password"
              type={isPasswordVisible ? "text" : "password"}
              placeholder="Your password"
              value={typedPassword}
              onChange={(event) => setTypedPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            {/* Button to show or hide the password */}
            <button
              type="button"
              className="show-password-button"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            >
              {isPasswordVisible ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit" className="login-button" disabled={isLoggingIn}>
            {isLoggingIn ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
