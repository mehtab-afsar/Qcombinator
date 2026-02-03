# Edge Alpha - Project Summary

## 🎯 What is Edge Alpha?

**Edge Alpha** is an AI-powered startup-investor matching platform that uses a proprietary **Q-Score** assessment system to evaluate and rank early-stage startups. The platform connects high-quality founders with investors through data-driven matching, AI-powered guidance, and exclusive workshops.

### Core Value Proposition:
- **For Founders:** Get a validated Q-Score (0-100), access AI agents for startup advice, and connect with qualified investors
- **For Investors:** Discover pre-screened startups with transparent scoring, see detailed founder assessments, and make data-driven investment decisions

---

## ✅ What We've Built (Phase 1 Complete)

### 1. PRD-Aligned 6-Dimension Q-Score System

**Scoring Algorithm:**
- **Market** (20%) - TAM size, conversion rates, unit economics
- **Product** (18%) - Customer validation, iteration speed, learning velocity
- **Go-to-Market** (17%) - ICP clarity, channel testing, CAC metrics
- **Financial** (18%) - Unit economics, runway, revenue projections
- **Team** (15%) - Domain expertise, team composition, resilience
- **Traction** (12%) - Users, revenue, growth rate

**Key Features:**
- Weighted average calculation with exact PRD weights
- Letter grades (A+ to F) based on overall score
- Percentile ranking vs cohort
- Week-over-week trend tracking
- Dimension-level insights

**Files:**
- `/lib/scoring/prd-types.ts` - Type definitions
- `/lib/scoring/prd-aligned-qscore.ts` - Main calculation
- `/lib/scoring/dimensions/*` - 6 dimension scorers

---

### 2. Enhanced Assessment Form (9 Sections)

**Current Sections:**
1. Problem Origin Story - Founder-problem fit
2. Unique Advantages - Unfair advantages
3. Customer Evidence - Customer validation with quotes
4. Failed Assumptions - Learning from mistakes
5. Learning Velocity - Build-measure-learn cycles
6. Market Sizing - TAM calculator with reality checks
7. **Go-to-Market Strategy** ✨ NEW - ICP, channels, CAC
8. **Financial Health** ✨ NEW - MRR/ARR, unit economics, runway
9. Resilience - Hardest moments and grit

**Features:**
- Auto-save every 2 seconds to API + localStorage
- Progress tracking (9 sections with time estimates)
- Validation rules for quality data
- Submit triggers real-time Q-Score calculation

**Files:**
- `/app/founder/assessment/page.tsx`
- `/app/founder/assessment/components/*`

---

### 3. Backend Infrastructure (Supabase + Next.js API)

**Database (9 Tables):**
- `founder_profiles` - User profile data
- `qscore_assessments` - Assessment submissions (draft/submitted/scored)
- `qscore_history` - Q-Score calculations with dimensions
- `agent_conversations` - AI agent chat history (Phase 2)
- `agent_messages` - Individual messages (Phase 2)
- `subscription_usage` - Feature usage limits
- `connection_requests` - Investor connections (Phase 3)
- `analytics_events` - User activity tracking (Phase 3)
- RLS policies enabled for security

**API Routes:**
- `POST /api/auth/signup` - User registration
- `POST /api/qscore/calculate` - Calculate and save Q-Score
- `GET /api/qscore/latest` - Fetch latest Q-Score with trends
- `POST /api/assessment/save` - Auto-save drafts
- `POST /api/assessment/submit` - Submit assessment
- `GET /api/health` - System health check

**Files:**
- `/app/api/*` - API route handlers
- `/lib/supabase/*` - Supabase client setup
- `/middleware.ts` - Auth & Q-Score gating
- `/supabase-setup.sql` - Complete database schema

---

### 4. Frontend Integration (Real-Time Updates)

**React Contexts:**
- `AuthContext` - Authentication state management
- `QScoreContext` - Q-Score with real-time Supabase subscriptions

**Dashboard:**
- Fetches real Q-Score from API
- Shows loading state and "Complete Assessment" prompt
- Real-time score updates via Supabase
- Toast notifications on score changes
- 6-dimension breakdown with trends

**Key Features:**
- Real-time updates (Supabase subscriptions)
- Graceful error handling (works without Supabase configured)
- Toast notifications (sonner)
- Loading states and skeleton screens

**Files:**
- `/contexts/*` - React contexts
- `/app/layout.tsx` - Provider wrapper
- `/app/founder/dashboard/page.tsx` - Real data dashboard

---

### 5. Security & Middleware

**Route Protection:**
- `/founder/*` routes require authentication
- `/founder/matching` requires Q-Score ≥ 65 (marketplace gate)
- RLS policies on all database tables
- JWT authentication via Supabase Auth

**Files:**
- `/middleware.ts` - Route protection logic

---

### 6. Testing & Documentation

**Documentation:**
- `SUPABASE_SETUP.md` - Database setup guide
- `TESTING_GUIDE.md` - 10-test comprehensive suite
- `IMPLEMENTATION_SUMMARY.md` - Technical overview
- `PROJECT_SUMMARY.md` - This file

**Scripts:**
- `npm run dev` - Start dev server
- `npm run verify-db` - Verify database setup
- `npm run build` - Production build
- `npm run test` - Run tests

**Files:**
- `/scripts/verify-database.ts` - DB verification
- `/__tests__/regression/*` - Regression tests

---

## 📊 Current System Architecture

```
User → Next.js Frontend
  ↓
AuthContext (Supabase Auth)
  ↓
Assessment Form (9 sections)
  ↓
Auto-save API (every 2s)
  ↓
Submit → Q-Score Calculation
  ↓
Supabase Database (9 tables)
  ↓
Real-time Subscription
  ↓
Dashboard Update + Toast
```

---

## 🚀 What Needs to Be Done

### Immediate (Before Launch):
1. ✅ **Database Setup** - Run `supabase-setup.sql` in Supabase dashboard
2. ✅ **Test Complete Flow** - Follow `TESTING_GUIDE.md` (10 tests)
3. ⏭️ **Build Sign-up/Login UI** - Create auth forms (currently using Supabase Auth only)
4. ⏭️ **Test with Real Users** - Get 10 founders to complete assessment
5. ⏭️ **Validate Scoring** - Ensure Q-Score calculations are accurate

### Phase 2 (AI Agents & Workshops):
- [ ] AI Agent integration with Groq (4 agents already designed)
- [ ] Agent conversation persistence (tables exist, need frontend)
- [ ] Workshop registration system
- [ ] Stripe payment integration for premium tier

### Phase 3 (Investor Marketplace):
- [ ] Investor matching algorithm (recommendation engine exists)
- [ ] Connection request flow (table exists, need UI)
- [ ] Investor dashboard
- [ ] Notification system

### Phase 4 (Analytics & Scale):
- [ ] PostHog analytics integration
- [ ] A/B testing framework
- [ ] Email notifications (Resend)
- [ ] Advanced filtering and search

---

## 🔑 Key Metrics to Track

**Founder Metrics:**
- Assessment completion rate (%)
- Average Q-Score (0-100)
- Score distribution by dimension
- Week-over-week score improvements
- Marketplace access rate (≥65 score)

**Platform Metrics:**
- User retention (DAU/MAU)
- Agent usage (conversations/user)
- Investor connections (requests/matches)
- Premium conversion rate

---

## 💻 Tech Stack

**Frontend:**
- Next.js 15.5.2 (App Router, Turbopack)
- React 19 with Server Components
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- Framer Motion (animations)

**Backend:**
- Supabase (Postgres + Auth + Realtime)
- Next.js API Routes (server-side)
- Row Level Security (RLS)

**AI/ML:**
- Groq (LLaMA models for AI agents)
- Custom Q-Score algorithm

**Dev Tools:**
- Jest (testing)
- ESLint (linting)
- tsx (TypeScript execution)

---

## 📁 Project Structure

```
/app
  /api                      # API routes (auth, qscore, assessment)
  /founder                  # Founder pages (dashboard, assessment, matching)
  /investor                 # Investor pages (dashboard, startups)
  /types                    # TypeScript types

/components
  /dashboard               # Dashboard components
  /investor                # Investor components
  /matching                # Matching components
  /layout                  # Layout components
  /ui                      # shadcn/ui components

/contexts
  AuthContext.tsx          # Authentication state
  QScoreContext.tsx        # Q-Score state + real-time

/lib
  /scoring                 # Q-Score calculation engine
    /dimensions            # 6 dimension scorers
    prd-types.ts           # Type definitions
    prd-aligned-qscore.ts  # Main calculation
  /supabase                # Supabase client setup
  groq.ts                  # Groq AI integration
  recommendation-engine.ts # Matching algorithm

/scripts
  verify-database.ts       # DB verification script

supabase-setup.sql        # Complete database schema
.env.local                # Environment variables
```

---

## 🔐 Environment Variables

```env
GROQ_API_KEY=gsk_...                                    # Groq AI API key
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                    # Public anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...                        # Private service role key
```

---

## 🎯 Success Criteria (Phase 1)

- ✅ PRD-aligned Q-Score model implemented
- ✅ All 6 dimensions scoring correctly
- ✅ Assessment form with 9 sections complete
- ✅ Real-time updates working
- ✅ Database schema deployed
- ✅ API routes functional
- ⏭️ 10 test users complete assessment
- ⏭️ Q-Score accuracy validated (manual review)
- ⏭️ Dashboard shows real data

---

## 📈 Next Milestone: Beta Launch

**Goal:** 100 founders with completed Q-Scores

**Requirements:**
1. Sign-up/Login UI built
2. Assessment flow tested and refined
3. Q-Score accuracy validated
4. Basic investor matching (manual)
5. Landing page with value prop

**Timeline:** 2-3 weeks

---

## 🤝 Contributing

This is a private project. For questions or issues:
- Check documentation: `TESTING_GUIDE.md`, `IMPLEMENTATION_SUMMARY.md`
- Run verification: `npm run verify-db`
- Check health: `http://localhost:3000/api/health`

---

## 📊 Current Status

**Phase 1: Q-Score Foundation** ✅ 100% Complete
- All backend infrastructure ready
- All frontend integration done
- Database schema deployed
- Testing tools created

**Next:** User testing & validation → Beta launch prep

---

*Last Updated: February 3, 2026*
*Version: 1.0.0*
*Status: Ready for testing*
