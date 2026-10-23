import { execSync } from 'node:child_process';
import path from 'node:path';

export default function globalSetup() {
  const databaseUrl =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:55432/payflow_test';

  execSync('npx prisma db push --skip-generate --force-reset', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}
