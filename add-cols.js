const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query('ALTER TABLE "Task" ADD COLUMN "module" TEXT, ADD COLUMN "dependency" TEXT, ADD COLUMN "expectedOutput" TEXT;');
    console.log('Columns added successfully');
  } catch (err) {
    if (err.code === '42701') {
      console.log('Columns already exist');
    } else {
      console.error(err);
    }
  } finally {
    await pool.end();
  }
}
run();
