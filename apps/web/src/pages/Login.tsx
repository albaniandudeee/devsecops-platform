import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiRequest } from "../lib/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <span className="brand-mark">DS</span>

          <div>
            <h1>DevSecOps Platform</h1>
            <p>Secure infrastructure management</p>
          </div>
        </div>

        <div className="auth-header">
          <h2>Welcome back</h2>
          <p>Sign in to access your platform dashboard.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
            required
          />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-switch">
          <span>Don't have an account?</span>

          <Link to="/register" className="switch-button">
            Create account
          </Link>
        </div>

        <div className="back-home">
          <Link to="/">← Back to home</Link>
        </div>
      </section>
    </main>
  );
}

export default Login;
