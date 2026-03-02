import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
    try {
        console.log("Starting full DB sync...");

        const schema = [
            {
                table: 'users',
                sql: `CREATE TABLE IF NOT EXISTS "users" (
          "id" SERIAL PRIMARY KEY,
          "username" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "display_name" TEXT NOT NULL,
          "bio" TEXT,
          "avatar_url" TEXT,
          "cover_url" TEXT,
          "study_mode_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
          "created_at" TIMESTAMP DEFAULT NOW()
        )`
            },
            {
                table: 'user_daily_usage',
                sql: `CREATE TABLE IF NOT EXISTS "user_daily_usage" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "date" TIMESTAMP NOT NULL DEFAULT NOW(),
          "total_minutes" INTEGER NOT NULL DEFAULT 0,
          "is_locked" BOOLEAN NOT NULL DEFAULT FALSE
        )`
            },
            {
                table: 'posts',
                sql: `CREATE TABLE IF NOT EXISTS "posts" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "content" TEXT NOT NULL,
          "category" TEXT DEFAULT 'general',
          "font_style" TEXT DEFAULT 'Inter',
          "background_color" TEXT DEFAULT '#ffffff',
          "original_post_id" INTEGER REFERENCES "posts"("id"),
          "created_at" TIMESTAMP DEFAULT NOW()
        )`
            },
            {
                table: 'comments',
                sql: `CREATE TABLE IF NOT EXISTS "comments" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "post_id" INTEGER NOT NULL REFERENCES "posts"("id"),
          "content" TEXT NOT NULL,
          "created_at" TIMESTAMP DEFAULT NOW()
        )`
            },
            {
                table: 'likes',
                sql: `CREATE TABLE IF NOT EXISTS "likes" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "post_id" INTEGER NOT NULL REFERENCES "posts"("id")
        )`
            },
            {
                table: 'reposts',
                sql: `CREATE TABLE IF NOT EXISTS "reposts" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "post_id" INTEGER NOT NULL REFERENCES "posts"("id"),
          "content" TEXT,
          "created_at" TIMESTAMP DEFAULT NOW()
        )`
            },
            {
                table: 'follows',
                sql: `CREATE TABLE IF NOT EXISTS "follows" (
          "id" SERIAL PRIMARY KEY,
          "follower_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "following_id" INTEGER NOT NULL REFERENCES "users"("id")
        )`
            },
            {
                table: 'blocks',
                sql: `CREATE TABLE IF NOT EXISTS "blocks" (
          "id" SERIAL PRIMARY KEY,
          "blocker_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "blocked_id" INTEGER NOT NULL REFERENCES "users"("id")
        )`
            },
            {
                table: 'conversations',
                sql: `CREATE TABLE IF NOT EXISTS "conversations" (
          "id" SERIAL PRIMARY KEY,
          "participant1_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "participant2_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "last_message_at" TIMESTAMP DEFAULT NOW(),
          "missed_call_from" INTEGER
        )`
            },
            {
                table: 'messages',
                sql: `CREATE TABLE IF NOT EXISTS "messages" (
          "id" SERIAL PRIMARY KEY,
          "conversation_id" INTEGER NOT NULL REFERENCES "conversations"("id"),
          "sender_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "content" TEXT NOT NULL,
          "read" BOOLEAN DEFAULT FALSE,
          "created_at" TIMESTAMP DEFAULT NOW()
        )`
            },
            {
                table: 'boards',
                sql: `CREATE TABLE IF NOT EXISTS "boards" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "title" TEXT NOT NULL,
          "elements" TEXT DEFAULT '[]',
          "app_state" TEXT DEFAULT '{}',
          "created_at" TIMESTAMP DEFAULT NOW(),
          "updated_at" TIMESTAMP DEFAULT NOW()
        )`
            }
        ];

        for (const item of schema) {
            console.log(`Checking table ${item.table}...`);
            await pool.query(item.sql);
        }

        // Now check for missing columns in case tables existed but were outdated
        const columnsToCheck = [
            { table: 'users', column: 'study_mode_enabled', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
            { table: 'posts', column: 'category', type: 'TEXT DEFAULT \'general\'' },
            { table: 'posts', column: 'font_style', type: 'TEXT DEFAULT \'Inter\'' },
            { table: 'posts', column: 'background_color', type: 'TEXT DEFAULT \'#ffffff\'' },
            { table: 'posts', column: 'original_post_id', type: 'INTEGER' },
            { table: 'conversations', column: 'missed_call_from', type: 'INTEGER' },
            { table: 'messages', column: 'read', type: 'BOOLEAN DEFAULT FALSE' },
            { table: 'user_daily_usage', column: 'is_locked', type: 'BOOLEAN NOT NULL DEFAULT FALSE' }
        ];

        for (const col of columnsToCheck) {
            const res = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [col.table, col.column]);

            if (res.rows.length === 0) {
                console.log(`Adding missing column ${col.column} to ${col.table}...`);
                await pool.query(`ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.type}`);
            }
        }

        console.log("DB sync complete!");

    } catch (err) {
        console.error("Error during DB sync:", err);
    } finally {
        await pool.end();
    }
}

fix();
