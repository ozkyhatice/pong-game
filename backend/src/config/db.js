import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export const initDB = async () => {
  const db = await open({
    filename: process.env.DATABASE_URL || './dev.db',
    driver: sqlite3.Database
  });

  // Gerekirse tabloyu otomatik oluştur:
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,

      avatar TEXT,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0
    )
  `);

  return db;
};