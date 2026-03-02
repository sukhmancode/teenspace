import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
    try {
        console.log("Creating tables if they don't exist...");

        // Create user_daily_usage table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS "user_daily_usage" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "date" TIMESTAMP NOT NULL DEFAULT NOW(),
        "total_minutes" INTEGER NOT NULL DEFAULT 0,
        "is_locked" BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
        console.log("Table user_daily_usage verified/created.");

        // Check for other tables that might be missing based on logs
        const tables = ['comments', 'reposts', 'conversations', 'likes', 'messages', 'users', 'posts', 'follows', 'blocks', 'boards'];
        for (const table of tables) {
            const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`, [table]);
            if (res.rows.length === 0) {
                console.log(`WARNING: Table ${table} is missing!`);
            } else {
                console.log(`Table ${table} exists.`);
            }
        }

    } catch (err) {
        console.error("Error fixing DB:", err);
    } finally {
        await pool.end();
    }
}

fix();
