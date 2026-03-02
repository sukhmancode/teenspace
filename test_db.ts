import "dotenv/config";
import pg from "pg";
const { Pool } = pg;

console.log("Full DATABASE_URL length:", process.env.DATABASE_URL?.length);
console.log("DATABASE_URL:", process.env.DATABASE_URL);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT 1", (err, res) => {
    if (err) {
        console.error("Connection failed!");
        console.error("Message:", err.message);
        console.error("Code:", err.code);
        console.error("Full Error:", err);
    } else {
        console.log("Connection successful:", res.rows);
    }
    pool.end();
});
