import React, { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { login, register, storeToken } from "../api.js";

export function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegistering = mode === "register";
  const canSubmit = username.trim().length >= 3 && password.length >= 6 && !isSubmitting;

  async function submitAuth(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const action = isRegistering ? register : login;
      const payload = await action({ username, password });
      storeToken(payload.token);
      onAuthenticated(payload.user);
    } catch (authError) {
      setError(authError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="authShell">
      <div className="authShellInner">
        <section className="authPoster">
          <div className="brand">
            <span className="brandMark">
              <Sparkles size={20} />
            </span>
            <span>ApplyAgent</span>
          </div>
          <div>
            <h1>Turn every target role into a focused application workflow.</h1>
            <p>
              Upload CVs, match job requirements, generate tailored material, and track each role
              from preparation through outcome.
            </p>
          </div>
        </section>

        <section className="authPanel">
          <form className="authForm" onSubmit={submitAuth}>
          <div>
            <span>{isRegistering ? "Create account" : "Welcome back"}</span>
            <h2>{isRegistering ? "Register" : "Login"}</h2>
          </div>

          <label>
            Username
            <input
              minLength={3}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="at least 3 characters"
            />
          </label>

          <label>
            Password
            <input
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="at least 6 characters"
            />
          </label>

          <button className="runButton" type="submit" disabled={!canSubmit}>
            {isSubmitting ? <Loader2 className="spin" size={18} /> : null}
            {isRegistering ? "Create account" : "Login"}
          </button>

          {error ? <p className="error">{error}</p> : null}

          <button
            className="authSwitch"
            type="button"
            onClick={() => {
              setMode(isRegistering ? "login" : "register");
              setError("");
            }}
          >
            {isRegistering ? "Already have an account? Login" : "Need an account? Register"}
          </button>
          </form>
        </section>
      </div>
    </main>
  );
}
