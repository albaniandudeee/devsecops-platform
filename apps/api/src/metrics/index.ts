import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  register,
} from "@prometheus-io/client";

collectDefaultMetrics();

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpRequestsInFlight = new Gauge({
  name: "http_requests_in_flight",
  help: "Number of HTTP requests currently being processed",
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(httpRequestsInFlight);

export { register };
