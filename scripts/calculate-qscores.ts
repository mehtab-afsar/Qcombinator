import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { mergeToAssessmentData, type SectionData } from '../lib/profile-builder/data-merger';
import {
  calculateQScore,
  inferStage,
  normalizeSector,
} from '../features/qscore/calculators/q-score-calculator';
import { calculateGrade } from '../features/qscore/types/qscore.types';

const ACCOUNT_EMAILS = [
  'nishita@nexuspower-test.example.com',
  'vamshi@pcra-test.example.com',
  'shivani@inochi-test.example.com',
  'utsav@gmetri-test.example.com',
  'hutesh@drivomate-test.example.com',
  'raja@digiclinics-test.example.com',
  'stuti@meine-test.example.com',
  'tanmaya@rntinsights-test.example.com',
  'anuj@manentia-test.example.com',
  'nikesh@blinq-test.example.com',
  'logesh@dashagriv-test.example.com',
  'robin@cluix-test.example.com',
  'ramanuj@gocarin-test.example.com',
  'satyajit@wduwg-test.example.com',
  'ajeet@gudlyf-test.example.com',
  'nishant@vyorius-test.example.com',
  'asuttosh@logistos-test.example.com',
  'anirban@pragmatech-test.example.com',
];

async function calculateQScores() {
  console.log('🧮 Triggering REAL Q-Score Calculation for All 18 Accounts...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing env vars');
    process.exit(1);
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  interface Result {
    email: string;
    companyName: string;
    userId: string;
    score: number;
    grade: string;
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    p5: number;
    p6: number;
  }

  const results: Result[] = [];

  // Get all auth users once
  console.log('📍 Loading auth users...');
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr || !authData) {
    console.error('❌ Auth lookup failed:', authErr?.message);
    process.exit(1);
  }

  const authMap = new Map(authData.users.map((u: { email?: string; id: string }) => [u.email, u.id]));
  console.log(`✓ Found ${authData.users.length} auth users\n`);

  for (const email of ACCOUNT_EMAILS) {
    console.log(`📌 Processing: ${email}`);

    try {
      const userId = authMap.get(email);
      if (!userId) {
        console.error(`   ❌ User not found with email: ${email}`);
        continue;
      }

      // Step 1: Read founder_profiles
      console.log('   → Reading founder profile...');
      const { data: fp, error: fpErr } = await supabase
        .from('founder_profiles')
        .select('full_name, industry, stage, is_impact_focused')
        .eq('user_id', userId)
        .single();

      if (fpErr || !fp) {
        console.error(`   ❌ Profile lookup failed:`, fpErr?.message);
        continue;
      }

      const companyName = fp.full_name;
      const industry = fp.industry || 'default';
      const stage = fp.stage || 'seed';
      const isImpactFocused = fp.is_impact_focused || false;

      // Step 2: Read profile_builder_data (5 sections)
      console.log('   → Reading profile sections...');
      const { data: sectionRows, error: sectErr } = await supabase
        .from('profile_builder_data')
        .select('section, extracted_fields, confidence_map')
        .eq('user_id', userId)
        .order('section', { ascending: true });

      if (sectErr || !sectionRows || sectionRows.length === 0) {
        console.error(`   ❌ Sections lookup failed or empty:`, sectErr?.message);
        continue;
      }

      // Step 3: Build sections map
      const sections: Partial<Record<number, SectionData>> = {};
      for (const row of sectionRows) {
        sections[row.section as number] = {
          extractedFields: (row.extracted_fields ?? {}) as Record<string, unknown>,
          confidenceMap: (row.confidence_map ?? {}) as Record<string, number>,
        };
      }

      // Step 4: Merge to AssessmentData
      const { assessmentData } = mergeToAssessmentData(sections);

      // Step 5: Normalize sector and stage
      const sector = normalizeSector(industry);
      const stageKey = inferStage(stage);
      const track = isImpactFocused ? 'impact' : 'commercial';

      // Step 6: Get custom sector weights
      const { data: sectorWeights } = await supabase
        .from('sector_weight_profiles')
        .select('p1_weight, p2_weight, p3_weight, p4_weight, p5_weight, p6_weight')
        .eq('sector', sector)
        .maybeSingle();

      const customWeights = sectorWeights
        ? [
            sectorWeights.p1_weight,
            sectorWeights.p2_weight,
            sectorWeights.p3_weight,
            sectorWeights.p4_weight,
            sectorWeights.p5_weight,
            sectorWeights.p6_weight,
          ]
        : undefined;

      // Step 7: Calculate Q-Score (REAL calculation)
      console.log('   → Calculating Q-Score...');
      const result = calculateQScore(assessmentData, stageKey, sector, track, customWeights);

      // Step 8: Build parameter map
      interface ParamInfo {
        averageScore?: number;
        [key: string]: unknown;
      }
      const paramMap: Record<string, ParamInfo> = {};
      if (result.parameters) {
        for (const param of result.parameters) {
          paramMap[param.id || 'unknown'] = param as unknown as ParamInfo;
        }
      }

      // Step 9: Compute individual p1–p6 scores
      const p1Score = Math.round((paramMap['p1']?.averageScore ?? 0) * 20);
      const p2Score = Math.round((paramMap['p2']?.averageScore ?? 0) * 20);
      const p3Score = Math.round((paramMap['p3']?.averageScore ?? 0) * 20);
      const p4Score = Math.round((paramMap['p4']?.averageScore ?? 0) * 20);
      const p5Score = Math.round((paramMap['p5']?.averageScore ?? 0) * 20);
      const p6Score = Math.round((paramMap['p6']?.averageScore ?? 0) * 20);

      const finalScore = Math.round(result.finalIQ);
      const grade = calculateGrade(finalScore);

      // Step 10: Delete old records
      console.log('   → Clearing old Q-Score records...');
      await supabase
        .from('qscore_history')
        .delete()
        .eq('user_id', userId)
        .neq('data_source', 'profile_builder');

      // Step 11: Insert new qscore_history row
      console.log('   → Inserting new Q-Score history...');
      const { error: insertErr } = await supabase.from('qscore_history').insert({
        user_id: userId,
        overall_score: finalScore,
        p1_score: p1Score,
        p2_score: p2Score,
        p3_score: p3Score,
        p4_score: p4Score,
        p5_score: p5Score,
        p6_score: p6Score,
        grade: grade,
        data_source: 'profile_builder',
        score_version: 'v2_q',
        track: result.track,
        assessment_data: assessmentData,
        iq_breakdown: result,
        available_iq: result.availableIQ,
        reconciliation_flags: [],
        validation_warnings: [],
        calculated_at: new Date().toISOString(),
      });

      if (insertErr) {
        console.error(`   ❌ Insert failed:`, insertErr.message);
        continue;
      }

      // Step 12: Update founder_profiles
      console.log('   → Marking profile as completed...');
      const { error: updateErr } = await supabase
        .from('founder_profiles')
        .update({
          profile_builder_completed: true,
          profile_builder_completed_at: new Date().toISOString(),
          assessment_completed: true,
        })
        .eq('user_id', userId);

      if (updateErr) {
        console.error(`   ❌ Update failed:`, updateErr.message);
        continue;
      }

      console.log(`   ✓ Q-Score CALCULATED: ${finalScore} (Grade: ${grade})`);
      console.log(`   ✓ P1=${p1Score}, P2=${p2Score}, P3=${p3Score}, P4=${p4Score}, P5=${p5Score}, P6=${p6Score}`);

      results.push({
        email,
        companyName,
        userId,
        score: finalScore,
        grade,
        p1: p1Score,
        p2: p2Score,
        p3: p3Score,
        p4: p4Score,
        p5: p5Score,
        p6: p6Score,
      });
    } catch (err) {
      console.error(`   ❌ Error:`, err instanceof Error ? err.message : String(err));
    }

    console.log();
  }

  // Summary
  console.log('✅ Q-Score Calculation Complete!\n');
  console.log('📊 Summary:');
  console.log(
    results
      .map(
        (r) =>
          `   ${r.companyName} (${r.email}): ${r.score} (${r.grade}) | P1=${r.p1} P2=${r.p2} P3=${r.p3} P4=${r.p4} P5=${r.p5} P6=${r.p6}`
      )
      .join('\n')
  );
  console.log(`\n✓ Processed: ${results.length}/${ACCOUNT_EMAILS.length} accounts successfully`);
}

calculateQScores().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
