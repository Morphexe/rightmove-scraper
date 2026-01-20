import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/rightmove',
  },
} satisfies Config;
