import mysql from "mysql2/promise";

export function databaseConfig() {
  const database = process.env.DB_NAME || "nassau_tickets";
  if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error("DB_NAME inválido.");
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER || "nassau_app",
    password: process.env.DB_PASSWORD || "",
    database,
    charset: "utf8mb4",
    timezone: "Z",
    dateStrings: true,
    connectTimeout: 5000,
    connectionLimit: 5,
  };
}

export function createPool() {
  return mysql.createPool(databaseConfig());
}
