import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/database.sqlite');

// Ensure the data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

export async function getDb() {
  if (db) return db;
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(db) {
  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON;');
  
  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      avatar TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS quiz_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      time_spent INTEGER NOT NULL, -- in seconds
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS active_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      state TEXT NOT NULL, -- JSON string representation of quiz state
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
      UNIQUE(profile_id, subject)
    );
    
    CREATE TABLE IF NOT EXISTS science_literacy_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      passage TEXT,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT NOT NULL -- 'A', 'B', 'C', 'D'
    );
    
    CREATE TABLE IF NOT EXISTS assigned_workbooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      config TEXT NOT NULL, -- JSON config e.g. {"count": 10}
      status TEXT NOT NULL DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed'
      score INTEGER,
      total_questions INTEGER,
      time_spent INTEGER, -- in seconds
      state TEXT, -- JSON state of active work
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT UNIQUE PRIMARY KEY,
      value TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS math_word_problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL, -- e.g. '383'
      explanation TEXT
    );
  `);
}
