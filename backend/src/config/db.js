import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export const initDB = async () => {
  const db = await open({
    filename: `./db/${process.env.DB_NAME || 'dev.db'}`,
    driver: sqlite3.Database
  });

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      twoFASecret TEXT,
      isTwoFAEnabled BOOLEAN DEFAULT FALSE,
      isGoogleAuth BOOLEAN DEFAULT FALSE,
      avatar TEXT,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      currentTournamentId INTEGER NULL,
      isEliminated BOOLEAN DEFAULT 0,
      FOREIGN KEY (currentTournamentId) REFERENCES tournaments(id) ON DELETE SET NULL
    )
  `);

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requesterID INTEGER NOT NULL,
      recipientID INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requesterID) REFERENCES users(id),
      FOREIGN KEY (recipientID) REFERENCES users(id)
    )
  `);

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS blocked_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blockerId INTEGER NOT NULL,
      blockedId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (blockerId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (blockedId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      senderId INTEGER NOT NULL,
      receiverId INTEGER NOT NULL,
      content TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      isRead INTEGER DEFAULT 0,
      delivered INTEGER DEFAULT 0,
      FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1Id INTEGER NOT NULL,
      player2Id INTEGER NOT NULL,
      player1Score INTEGER DEFAULT 0,
      player2Score INTEGER DEFAULT 0,
      winnerId INTEGER,
      tournamentId INTEGER NULL,           
      round INTEGER NULL,                   
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      startedAt DATETIME,
      endedAt DATETIME,
      FOREIGN KEY (player1Id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (player2Id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (winnerId) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (tournamentId) REFERENCES tournaments(id) ON DELETE CASCADE
    )`);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      startAt DATETIME NULL,
      endAt DATETIME NULL,
      maxPlayers INTEGER NOT NULL DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'pending',
      winnerId INTEGER NULL,
      currentRound INTEGER DEFAULT 1,
      FOREIGN KEY (winnerId) REFERENCES users(id) ON DELETE SET NULL
    )`);

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_pairings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournamentId INTEGER NOT NULL,
      round INTEGER NOT NULL,
      position INTEGER NOT NULL,
      player1Id INTEGER NULL,
      player2Id INTEGER NULL,
      winnerId INTEGER NULL,
      matchId INTEGER NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournamentId) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (player1Id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (player2Id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (winnerId) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (matchId) REFERENCES matches(id) ON DELETE SET NULL
    )`);

  return db;
};