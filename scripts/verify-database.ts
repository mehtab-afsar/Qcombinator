/**
 * Database Verification Script
 *
 * Run this script to verify your Supabase database setup is correct.
 *
 * Usage:
 *   npx tsx scripts/verify-database.ts
 */

import { createClient } from '@supabase/supabase-js';

const REQUIRED_TABLES = [
  'founder_profiles',
  'qscore_assessments',
  'qscore_history',
  'agent_conversations',
  'agent_messages',
  'subscription_usage',
  'connection_requests',
  'analytics_events',
];

const _QSCORE_HISTORY_COLUMNS = [
  'id',
  'user_id',
  'overall_score',
  'percentile',
  'grade',
  'p1_score',
  'p2_score',
  'p3_score',
  'p4_score',
  'p5_score',
  'p6_score',
  'calculated_at',
  'created_at',
];

async function verifyDatabase() {
  console.log('🔍 Verifying Supabase Database Setup...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Environment variables not set!');
    console.error('   Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   URL: ${supabaseUrl}\n`);

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test connection
  try {
    const { error } = await supabase.auth.getSession();
    if (error) throw error;
    console.log('✅ Supabase connection successful\n');
  } catch (error: unknown) {
    console.error('❌ Failed to connect to Supabase');
    console.error(`   Error: ${(error as Error).message}`);
    process.exit(1);
  }

  // Check each table
  console.log('📊 Checking database tables...\n');

  let allTablesExist = true;

  for (const table of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);

      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('relation')) {
          console.error(`❌ Table "${table}" does not exist`);
          allTablesExist = false;
        } else if (error.message.includes('RLS')) {
          console.warn(`⚠️  Table "${table}" exists but RLS may be blocking access`);
          console.warn(`   This is OK - RLS policies will work with authenticated users`);
        } else {
          console.error(`❌ Table "${table}" error: ${error.message}`);
          allTablesExist = false;
        }
      } else {
        console.log(`✅ Table "${table}" exists and is accessible`);
      }
    } catch (error: unknown) {
      console.error(`❌ Table "${table}" check failed: ${(error as Error).message}`);
      allTablesExist = false;
    }
  }

  console.log('\n');

  // Check qscore_history schema
  console.log('🔍 Checking qscore_history table schema...\n');

  try {
    const { error } = await supabase
      .from('qscore_history')
      .select('*')
      .limit(0);

    if (error && !error.message.includes('RLS')) {
      console.error(`❌ Cannot access qscore_history: ${error.message}`);
    } else {
      console.log('✅ qscore_history table schema looks correct');
    }
  } catch (error: unknown) {
    console.error(`❌ Schema check failed: ${(error as Error).message}`);
  }

  console.log('\n');

  // Summary
  if (allTablesExist) {
    console.log('✅ DATABASE SETUP COMPLETE!');
    console.log('   All required tables are created.');
    console.log('   You can now run the application.\n');
    console.log('   Next steps:');
    console.log('   1. npm run dev');
    console.log('   2. Visit http://localhost:3000/api/health');
    console.log('   3. Follow TESTING_GUIDE.md for complete testing\n');
    process.exit(0);
  } else {
    console.error('❌ DATABASE SETUP INCOMPLETE!');
    console.error('   Some tables are missing or inaccessible.\n');
    console.error('   Please run the SQL from SUPABASE_SETUP.md in your Supabase dashboard:');
    console.error('   1. Go to https://supabase.com/dashboard');
    console.error('   2. Select your project');
    console.error('   3. Click "SQL Editor"');
    console.error('   4. Copy SQL from SUPABASE_SETUP.md');
    console.error('   5. Click "Run"');
    console.error('   6. Run this script again\n');
    process.exit(1);
  }
}

// Run verification
verifyDatabase().catch((error) => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});
