import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // Pretty print in dev, JSON in production
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
  base: {
    service: "sg-map-api",
    env: process.env.NODE_ENV || "development",
  },
});
