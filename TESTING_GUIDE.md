# Testing Guide - Edge Alpha Q-Score System

This guide walks through testing the complete PRD-aligned Q-Score implementation.

## Pre-Testing Setup

### 1. Verify Environment Variables

Check your `.env.local` file has:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 2. Create Database Tables

Run the SQL from `SUPABASE_SETUP.md` in your Supabase SQL Editor:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Copy all SQL from `SUPABASE_SETUP.md`
5. Click "Run"
6. Verify 9 tables created in "Table Editor"

**Tables to verify:**
- ✅ `founder_profiles`
- ✅ `qscore_assessments`
- ✅ `qscore_history`
- ✅ `agent_conversations`
- ✅ `agent_messages`
- ✅ `subscription_usage`
- ✅ `connection_requests`
- ✅ `analytics_events`

### 3. Run Health Check

Start the dev server and check system health:

```bash
npm run dev
```

Then visit:
```
http://localhost:3000/api/health
```

**Expected Response (All checks should be `true`):**
```json
{
  "status": "healthy",
  "message": "All systems operational",
  "checks": {
    "supabaseConfig": true,
    "supabaseConnection": true,
    "databaseTables": true
  },
  "details": {
    "supabaseUrl": "https://your-project.supabase.co",
    "auth": "No active session",
    "tables": {
      "founder_profiles": "✅ Accessible",
      "qscore_assessments": "✅ Accessible",
      "qscore_history": "✅ Accessible",
      "agent_conversations": "✅ Accessible",
      "subscription_usage": "✅ Accessible"
    }
  }
}
```

---

## Test Suite

### Test 1: Authentication Context Loading

**What:** Verify AuthProvider and QScoreProvider load correctly

**Steps:**
1. Visit `http://localhost:3000`
2. Open browser DevTools → Console
3. Look for warnings or errors

**Expected:**
- No React errors
- Warning: `"⚠️  Supabase not configured"` should NOT appear (means setup is working)

---

### Test 2: Dashboard Without Assessment

**What:** New user should see "Complete Assessment" prompt

**Steps:**
1. Visit `http://localhost:3000/founder/dashboard`
2. Should see loading spinner initially
3. Then should see blue card with "Complete Your Q-Score Assessment"

**Expected:**
- Loading state appears first
- Card with "Start Assessment" button
- No Q-Score displayed (since none exists yet)

**Screenshot Location:**
![Dashboard - No Assessment](expected: blue gradient card with Target icon)

---

### Test 3: Assessment Form - Data Entry

**What:** Test all 9 sections of assessment form

**Steps:**
1. Visit `http://localhost:3000/founder/assessment`
2. Fill out Section 1: Problem Origin Story (minimum 100 words)
3. Click "Continue" → Should advance to Section 2
4. Continue through all 9 sections:
   - Section 1: Problem Origin
   - Section 2: Unique Advantages
   - Section 3: Customer Evidence
   - Section 4: Failed Assumptions
   - Section 5: Learning Velocity
   - Section 6: Market Sizing
   - Section 7: Go-to-Market Strategy (NEW!)
   - Section 8: Financial Health (NEW!)
   - Section 9: Resilience

**Expected:**
- Progress bar updates (1/9 → 9/9)
- Each section saves automatically (check localStorage or DevTools Network tab)
- API calls to `/api/assessment/save` every 2 seconds
- Can navigate back and forward

**Test Data Example:**
```
Section 1 - Problem Origin:
"I spent 5 years as a product manager at Salesforce where I saw enterprise teams struggle with customer research. Every quarter, we'd interview 50+ customers, but insights would get lost in Slack threads and Google Docs. I personally wasted 10+ hours per week searching for past conversations. This problem costs product teams millions in duplicate research and missed insights. I'm building TechFlow AI to solve this with AI-powered research synthesis."

Section 7 - Go-to-Market:
ICP: "Series A-B SaaS companies with product teams of 5+ engineers..."
Channels Tried: Content Marketing, Direct Sales
Current CAC: $250
Target CAC: $150

Section 8 - Financial Health:
MRR: $5,000
Monthly Burn: $15,000
Runway: 8 months
```

---

### Test 4: Assessment Submission & Q-Score Calculation

**What:** Submit complete assessment and verify Q-Score calculation

**Steps:**
1. Complete all 9 sections
2. Click "Complete" button on Section 9
3. Watch DevTools Network tab

**Expected:**
- POST to `/api/assessment/submit` (status 200)
- POST to `/api/qscore/calculate` (triggered internally)
- Redirect to `/founder/dashboard`
- Q-Score now displays with breakdown

**Verify in Supabase:**
1. Go to Supabase → Table Editor
2. Check `qscore_assessments` table → 1 row with your data
3. Check `qscore_history` table → 1 row with calculated scores
4. Check `founder_profiles` table → `assessment_completed` = true

---

### Test 5: Dashboard With Q-Score

**What:** Verify dashboard shows real Q-Score data

**Steps:**
1. After completing assessment, view `http://localhost:3000/founder/dashboard`
2. Inspect Q-Score card

**Expected:**
- Overall score (0-100) displayed prominently
- Letter grade (A+, A, B+, B, C+, C, D, F)
- Percentile ranking
- 6 dimension breakdown:
  - Market (20% weight)
  - Product (18% weight)
  - Go-to-Market (17% weight)
  - Financial (18% weight)
  - Team (15% weight)
  - Traction (12% weight)
- Each dimension shows:
  - Score (0-100)
  - Trend indicator (↑ up, → neutral, ↓ down)
  - Change from previous

**Verify Scoring Logic:**
- Check that dimensions match PRD weights
- Overall score = weighted average
- Scores between 0-100

---

### Test 6: Real-Time Q-Score Updates

**What:** Test Supabase real-time subscription

**Steps:**
1. Open dashboard in browser
2. Open Supabase dashboard in another tab
3. Go to Table Editor → `qscore_history`
4. Manually update `overall_score` for your user
5. Watch original dashboard tab

**Expected:**
- Toast notification appears: "Q-Score Updated! +X points"
- Dashboard refreshes automatically
- New score displayed without page reload

---

### Test 7: API Endpoints

**What:** Test each API route directly

**Steps:**
1. **GET /api/health** → Should return 200 with all checks true
2. **GET /api/qscore/latest** → Should return your Q-Score (401 if not authenticated)
3. **GET /api/assessment/save** → Should return saved draft

**Using cURL:**
```bash
# Health check
curl http://localhost:3000/api/health

# Latest Q-Score (requires auth cookie)
curl -b cookies.txt http://localhost:3000/api/qscore/latest
```

---

### Test 8: Middleware & Route Protection

**What:** Verify Q-Score gating for marketplace

**Steps:**
1. Complete assessment with score < 65
2. Try to visit `http://localhost:3000/founder/matching`

**Expected:**
- Redirect to `/founder/improve-qscore`
- Cannot access marketplace with low score

**Then:**
1. Update Q-Score in Supabase to 65+
2. Try accessing `/founder/matching` again

**Expected:**
- Access granted
- Marketplace loads

---

### Test 9: Scoring Accuracy

**What:** Verify dimension scorers work correctly

**Test Cases:**

**Market Dimension (20%):**
- TAM $1B+ → 40 points
- Realistic conversion rate (0.5-5%) → 30 points
- Daily activity 100+ → 20 points
- LTV:CAC ratio 3:1 → 10 points

**Product Dimension (18%):**
- 50+ customer conversations → 20 points
- Evidence with commitment → 20 points
- Build time ≤7 days → 10 points
- 3+ iterations → 20 points

**GTM Dimension (17%):**
- ICP description 200+ words → 35 points
- 3+ channels tested → 35 points
- Messaging validated → 30 points

**Financial Dimension (18%):**
- Gross margin 80%+ → 20 points
- $1M+ revenue → 20 points
- 18+ months runway → 30 points
- Realistic growth projections → 30 points

**Team Dimension (15%):**
- Detailed origin story → 20 points
- Clear unique advantage → 20 points
- 3+ team members → 15 points
- Failed assumptions documented → 15 points

**Traction Dimension (12%):**
- 100+ customer conversations → 20 points
- Paying customers → 20 points
- $1M+ revenue → 30 points
- 30%+ growth rate → 30 points

**Create Test Assessments:**
1. **Perfect Score Test:** Fill with all maximum values → Should get 95-100
2. **Zero Score Test:** Leave everything minimal → Should get 10-30
3. **Median Score Test:** Fill with average values → Should get 50-70

---

### Test 10: Auto-Save & Draft Recovery

**What:** Verify draft persistence

**Steps:**
1. Start assessment, fill Section 1
2. Wait 3 seconds (auto-save triggers after 2s)
3. Close browser tab completely
4. Reopen `/founder/assessment`

**Expected:**
- Section 1 data still populated
- Resume from where you left off

**Verify in DevTools:**
- Network tab shows POST to `/api/assessment/save`
- localStorage has `founderAssessment` key

---

## Troubleshooting

### Issue: Health check fails on database tables

**Solution:**
1. Verify tables created in Supabase
2. Check RLS policies enabled
3. Try disabling RLS temporarily for testing

### Issue: "Unauthorized" errors on API calls

**Solution:**
1. Clear cookies and localStorage
2. Check Supabase Auth is enabled
3. Verify anon key is correct

### Issue: Q-Score not calculating

**Solution:**
1. Check browser console for errors
2. Verify `/api/qscore/calculate` returns 200
3. Check Supabase `qscore_history` table for insert

### Issue: Real-time updates not working

**Solution:**
1. Verify Realtime enabled in Supabase project settings
2. Check browser console for subscription errors
3. Test with manual database update

---

## Success Criteria

✅ All 9 tests pass
✅ Health check returns `healthy`
✅ Assessment submits successfully
✅ Q-Score calculates with correct weights
✅ Dashboard displays real data
✅ Real-time updates work
✅ Route protection enforces score threshold

---

## Performance Benchmarks

- Assessment auto-save: < 500ms
- Q-Score calculation: < 2s
- Dashboard load: < 1s
- Real-time notification: < 500ms

---

## Next Steps After Testing

Once all tests pass:

1. **Disable DEV_MODE** in assessment page (line 316)
2. **Enable validation** for production
3. **Set up Stripe** for subscription management
4. **Deploy to Vercel** for production testing
5. **Enable PostHog analytics** for user tracking

---

## Questions or Issues?

If any test fails:
1. Check browser DevTools console
2. Check `/api/health` response
3. Verify Supabase table structure
4. Check this file: `TESTING_GUIDE.md`
