const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/prisma');

const migrationPath = path.resolve(__dirname, '../prisma/migrations/20260426000000_rider_pool_assignment/migration.sql');

const splitSqlStatements = (sql) =>
  sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

const run = async () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log(`Applied ${statements.length} rider migration statements.`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
