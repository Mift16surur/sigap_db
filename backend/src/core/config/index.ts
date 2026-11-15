/**
 * Core Configuration untuk SIGAP Backend
 */
export const config = {
  app: {
    name: "SIGAP Hospital Superapps API",
    version: "1.0.0",
    port: Number(process.env.PORT || 4000),
    env: process.env.NODE_ENV || "development",
  },
  db: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/sigap_db?schema=public",
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "sigap-secret-key-production-2026",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
    simulationDefaultPass: "sigap2026",
    adminDefaultPass: "admin2026",
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },
};

