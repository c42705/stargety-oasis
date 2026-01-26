import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as readline from 'readline';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompt user for input
 */
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Display warning banner
 */
function displayWarning(dbUrl: string): void {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    ⚠️  DATABASE RESET WARNING  ⚠️               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  console.log('This action will:');
  console.log('  1. DROP all tables in the database');
  console.log('  2. DELETE ALL DATA permanently');
  console.log('  3. Re-run Prisma migrations to restore schema');
  console.log('\n');
  console.log('Target Database:');
  console.log(`  ${dbUrl.replace(/:[^@]*@/, ':****@')}`);
  console.log('\n');
}

/**
 * Countdown timer before execution
 */
async function countdownTimer(seconds: number): Promise<void> {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\rExecuting in ${i} seconds... Press Ctrl+C to cancel.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log('\n');
}

/**
 * Main reset function
 */
async function resetDatabase(): Promise<void> {
  try {
    const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost/stargety_oasis';
    
    displayWarning(dbUrl);

    // First confirmation
    const confirm1 = await prompt(
      'Are you sure you want to WIPE the database? This will DELETE ALL DATA. Type \'YES\' to continue: '
    );

    if (confirm1 !== 'YES') {
      logger.warn('Database reset cancelled by user');
      rl.close();
      process.exit(0);
    }

    // Second confirmation
    const confirm2 = await prompt(
      'This action is IRREVERSIBLE. Type \'WIPE DATABASE\' to confirm: '
    );

    if (confirm2 !== 'WIPE DATABASE') {
      logger.warn('Database reset cancelled by user');
      rl.close();
      process.exit(0);
    }

    rl.close();

    // Countdown
    await countdownTimer(3);

    // Connect to database
    logger.info('🔌 Connecting to database...');
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Execute reset
    logger.info('🗑️  Wiping all data from database...');
    await prisma.$executeRawUnsafe(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
        END LOOP;
      END $$;
    `);
    logger.info('✅ All tables dropped');

    // Run migrations
    logger.info('🔄 Running Prisma migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    logger.info('✅ Migrations completed');

    // Prompt for seeding
    const seedPrompt = new Promise<string>((resolve) => {
      const seedRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      seedRl.question('\nDo you want to seed the database with default data? (y/n): ', (answer) => {
        seedRl.close();
        resolve(answer.toLowerCase());
      });
    });

    const seedAnswer = await seedPrompt;

    if (seedAnswer === 'y' || seedAnswer === 'yes') {
      logger.info('🌱 Running seed script...');
      execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit' });
      logger.info('✅ Seed completed');
    }

    // Summary
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ DATABASE RESET SUCCESSFUL ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\n');
    logger.info('Database reset completed successfully');

  } catch (error) {
    logger.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetDatabase().catch((error) => {
  logger.fatal('Fatal error during database reset:', error);
  process.exit(1);
});

