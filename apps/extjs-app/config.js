// Loaded before the app — sets the API base URL based on environment
window.APP_CONFIG = {
  apiBase:
    window.location.hostname === "localhost"
      ? "http://localhost:3001"
      : "https://sg-map-api-xsbo7cqsfa-uw.a.run.app",
};
