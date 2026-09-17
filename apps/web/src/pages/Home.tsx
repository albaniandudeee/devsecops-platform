import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="home-page">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="brand-mark">DS</span>
          <span>DevSecOps Platform</span>
        </div>

        <div className="nav-actions">
          <Link to="/login" className="nav-login">
            Sign in
          </Link>
          <Link to="/register" className="nav-register">
            Get started
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">
            Production-ready DevSecOps platform
          </span>

          <h1>
            Build securely.
            <br />
            <span>Deploy confidently.</span>
          </h1>

          <p>
            A production-oriented platform combining secure application
            development, containerization, CI/CD, observability, and
            infrastructure automation.
          </p>

          <div className="hero-actions">
            <Link to="/register" className="primary-button">
              Create account
            </Link>

            <Link to="/login" className="secondary-button">
              Sign in
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="panel-header">
            <span>System status</span>

            <span className="status">
              <span className="status-dot" />
              Operational
            </span>
          </div>

          <div className="status-list">
            <div>
              <span>API</span>
              <strong>Healthy</strong>
            </div>

            <div>
              <span>Database</span>
              <strong>Connected</strong>
            </div>

            <div>
              <span>Redis</span>
              <strong>Connected</strong>
            </div>

            <div>
              <span>Worker</span>
              <strong>Running</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="section-heading">
          <span>Platform capabilities</span>
          <h2>Built around real production practices.</h2>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-number">01</span>
            <h3>Security first</h3>
            <p>
              Argon2id authentication, RBAC, secure sessions, validation,
              rate limiting, audit logging, and security scanning.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-number">02</span>
            <h3>Automated delivery</h3>
            <p>
              Containerized services, GitHub Actions CI/CD, vulnerability
              scanning, SBOM generation, and production image publishing.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-number">03</span>
            <h3>Observable infrastructure</h3>
            <p>
              Prometheus metrics, Grafana dashboards, health checks, worker
              metrics, queue monitoring, and graceful shutdown handling.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Home;
