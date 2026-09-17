import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiRequest } from "../lib/api";

type CurrentUser = {
  id: string;
  email: string;
};

type MeResponse = {
  status: string;
  user: CurrentUser;
  session: {
    expiresAt: string;
  };
};

type ReadyResponse = {
  status: string;
  checks: {
    database: string;
    redis: string;
  };
  timestamp: string;
};

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState<ReadyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [me, health] = await Promise.all([
          apiRequest<MeResponse>("/auth/me"),
          apiRequest<ReadyResponse>("/health/ready"),
        ]);

        setUser(me.user);
        setReady(health);
      } catch {
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [navigate]);

  async function handleLogout() {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
      });
    } finally {
      navigate("/login", { replace: true });
    }
  }

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Loading dashboard...</div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const databaseHealthy = ready?.checks.database === "healthy";
  const redisHealthy = ready?.checks.redis === "healthy";
  const platformReady = ready?.status === "ready";

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <span className="brand-mark">DS</span>
          <span>DevSecOps Platform</span>
        </div>

        <button onClick={handleLogout} className="logout-button">
          Sign out
        </button>
      </nav>

      <section className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">Platform dashboard</span>
            <h1>Welcome back</h1>
            <p>{user.email}</p>
          </div>

          <span className="dashboard-status">
            <span className="status-dot" />
            {platformReady ? "Platform ready" : "Degraded"}
          </span>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <span>API</span>
            <strong>{platformReady ? "Operational" : "Degraded"}</strong>
            <p>Application API readiness check.</p>
          </article>

          <article className="dashboard-card">
            <span>Database</span>
            <strong>{databaseHealthy ? "Connected" : "Unavailable"}</strong>
            <p>PostgreSQL persistence layer status.</p>
          </article>

          <article className="dashboard-card">
            <span>Redis</span>
            <strong>{redisHealthy ? "Connected" : "Unavailable"}</strong>
            <p>Redis connection and queue infrastructure status.</p>
          </article>

          <article className="dashboard-card">
            <span>Observability</span>
            <strong>Enabled</strong>
            <p>Prometheus metrics and Grafana monitoring are active.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
