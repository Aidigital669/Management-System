import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query('ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "subtasks" TEXT');
  await pool.query('ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "department" TEXT');
  console.log('ALTER TABLE SUCCESSFUL');
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Task'");
  console.log('UPDATED COLUMNS IN Task TABLE:', res.rows.map(r => r.column_name));
} catch (err) {
  console.error('ALTER TABLE ERROR:', err);
} finally {
  await pool.end();
}
