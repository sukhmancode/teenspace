import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        const tables = res.rows.map(r => r.table_name);
        console.log("TABLES_LIST_START");
        for (const table of tables) {
            console.log(`TABLE: ${table}`);
            const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [table]);
            for (const col of cols.rows) {
                console.log(`  COL: ${col.column_name} (${col.data_type})`);
            }
        }
        console.log("TABLES_LIST_END");
    } catch (err) {
        console.error("Error checking tables:", err);
    } finally {
        await pool.end();
    }
}

check();
