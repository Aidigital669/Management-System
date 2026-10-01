const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query('ALTER TABLE "Task" ADD COLUMN "taskDate" TEXT;');
    console.log('Column taskDate added successfully');
  } catch (err) {
    if (err.code === '42701') {
      console.log('Column taskDate already exists');
    } else {
      console.error(err);
    }
  } finally {
    await pool.end();
  }
}
run();
