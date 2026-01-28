"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const readline = __importStar(require("readline"));
const logger_1 = require("../src/utils/logger");
const prisma = new client_1.PrismaClient();
// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
/**
 * Prompt user for input
 */
function prompt(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}
/**
 * Display warning banner
 */
function displayWarning(dbUrl) {
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
async function countdownTimer(seconds) {
    for (let i = seconds; i > 0; i--) {
        process.stdout.write(`\rExecuting in ${i} seconds... Press Ctrl+C to cancel.`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log('\n');
}
/**
 * Main reset function
 */
async function resetDatabase() {
    try {
        const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost/stargety_oasis';
        displayWarning(dbUrl);
        // First confirmation
        const confirm1 = await prompt('Are you sure you want to WIPE the database? This will DELETE ALL DATA. Type \'YES\' to continue: ');
        if (confirm1 !== 'YES') {
            logger_1.logger.warn('Database reset cancelled by user');
            rl.close();
            process.exit(0);
        }
        // Second confirmation
        const confirm2 = await prompt('This action is IRREVERSIBLE. Type \'WIPE DATABASE\' to confirm: ');
        if (confirm2 !== 'WIPE DATABASE') {
            logger_1.logger.warn('Database reset cancelled by user');
            rl.close();
            process.exit(0);
        }
        rl.close();
        // Countdown
        await countdownTimer(3);
        // Connect to database
        logger_1.logger.info('🔌 Connecting to database...');
        await prisma.$connect();
        logger_1.logger.info('✅ Database connected');
        // Execute reset
        logger_1.logger.info('🗑️  Wiping all data from database...');
        // First, drop all application tables (excluding PostGIS system tables)
        await prisma.$executeRawUnsafe(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        -- Drop all tables except PostGIS system tables
        FOR r IN (
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
        ) LOOP
          EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
        END LOOP;

        -- Drop all sequences
        FOR r IN (
          SELECT sequence_name
          FROM information_schema.sequences
          WHERE sequence_schema = 'public'
        ) LOOP
          EXECUTE 'DROP SEQUENCE IF EXISTS "' || r.sequence_name || '" CASCADE';
        END LOOP;

        -- Drop all custom types (enums, etc.)
        FOR r IN (
          SELECT typname
          FROM pg_type
          WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
          AND typtype = 'e'
        ) LOOP
          EXECUTE 'DROP TYPE IF EXISTS "' || r.typname || '" CASCADE';
        END LOOP;
      END $$;
    `);
        logger_1.logger.info('✅ All application tables, sequences, and types dropped');
        // Run migrations
        logger_1.logger.info('🔄 Running Prisma migrations...');
        (0, child_process_1.execSync)('npx prisma migrate deploy', { stdio: 'inherit' });
        logger_1.logger.info('✅ Migrations completed');
        // Prompt for seeding
        const seedPrompt = new Promise((resolve) => {
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
            logger_1.logger.info('🌱 Running seed script...');
            (0, child_process_1.execSync)('npx ts-node prisma/seed.ts', { stdio: 'inherit' });
            logger_1.logger.info('✅ Seed completed');
        }
        // Summary
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║                   ✅ DATABASE RESET SUCCESSFUL ✅              ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log('\n');
        logger_1.logger.info('Database reset completed successfully');
    }
    catch (error) {
        logger_1.logger.error('❌ Database reset failed:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the reset
resetDatabase().catch((error) => {
    logger_1.logger.fatal('Fatal error during database reset:', error);
    process.exit(1);
});
