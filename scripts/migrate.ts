import { migrate } from 'drizzle-orm/mysql2/migrator';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import 'dotenv/config';

async function runMigrations() {
  const connection = await mysql.createConnection(
    process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/rightmove'
  );
  
  const db = drizzle(connection);
  
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete!');
  
  await connection.end();
}

runMigrations().catch(console.error);
