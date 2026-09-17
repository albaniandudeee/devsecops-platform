import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiRequest } from "../lib/api";

function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      navigate("/login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed.",
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
          <h2>Create account</h2>
          <p>Create an account to get started.</p>
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
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />

          <label htmlFor="confirm-password">Confirm password</label>

          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="••••••••••••"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />

          <p className="password-hint">
            Password must be between 12 and 128 characters.
          </p>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          <span>Already have an account?</span>

          <Link to="/login" className="switch-button">
            Sign in
          </Link>
        </div>

        <div className="back-home">
          <Link to="/">← Back to home</Link>
        </div>
      </section>
    </main>
  );
}

export default Register;
