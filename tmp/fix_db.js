import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
    try {
        const tables = [
            { name: 'users', column: 'study_mode_enabled', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
            { name: 'posts', column: 'category', type: 'TEXT DEFAULT \'general\'' },
            { name: 'conversations', column: 'missed_call_from', type: 'INTEGER' },
            { name: 'user_daily_usage', column: 'is_locked', type: 'BOOLEAN NOT NULL DEFAULT FALSE' }
        ];

        for (const { name, column, type } of tables) {
            console.log(`Checking ${name}.${column}...`);
            const res = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [name, column]);

            if (res.rows.length === 0) {
                console.log(`Adding column ${column} to ${name} table...`);
                await pool.query(`ALTER TABLE ${name} ADD COLUMN ${column} ${type}`);
                console.log("Column added successfully.");
            } else {
                console.log("Column already exists.");
            }
        }
    } catch (err) {
        console.error("Error fixing DB:", err);
    } finally {
        await pool.end();
    }
}

fix();
