# Component Refactoring Roadmap - The Real Work

## 🎯 **The Hard Truth**

**70% of the work is HERE** - Breaking down 3,380 lines of tightly coupled components.

---

## 📊 **Current State: The Monoliths**

### Assessment Components: 2,280 Lines
```
app/founder/assessment/components/
├── ProblemOriginForm.tsx       340 lines  ❌ Monolithic
├── UniqueAdvantageForm.tsx     280 lines  ❌ Monolithic
├── CustomerEvidenceForm.tsx    380 lines  ❌ Monolithic
├── FailedAssumptionsForm.tsx   250 lines  ❌ Monolithic
├── LearningVelocityForm.tsx    320 lines  ❌ Monolithic
├── MarketCalculator.tsx        420 lines  ❌ Monolithic
└── ResilienceForm.tsx          290 lines  ❌ Monolithic
```

### Startup Profile: 1,100 Lines
```
app/founder/startup-profile/
└── page.tsx                    1,100 lines ❌ All 6 sections mixed
```

**Target**: Break into 48 components, each < 50 lines

---

## 🗓️ **8-Week Execution Plan**

### **Week 1: Hook Extraction** (Foundation)
**Goal**: Remove ALL state logic from components

**Day 1-2: Create Assessment Hooks**
```typescript
src/hooks/
├── use-problem-origin.ts        Extract 100 lines from 340
├── use-unique-advantage.ts      Extract 80 lines from 280
├── use-customer-evidence.ts     Extract 120 lines from 380
└── use-failed-assumptions.ts    Extract 70 lines from 250
```

**Day 3-4: Create More Assessment Hooks**
```typescript
src/hooks/
├── use-learning-velocity.ts     Extract 100 lines from 320
├── use-market-calculator.ts     Extract 150 lines from 420
└── use-resilience.ts           Extract 80 lines from 290
```

**Day 5: Create Startup Profile Hook**
```typescript
src/hooks/
└── use-startup-profile.ts      Extract 300 lines from 1,100
```

**Deliverable**: 8 hooks (~700 lines), state logic separated

---

### **Week 2: UI Building Blocks** (Reusable Components)
**Goal**: Create reusable form components to eliminate JSX repetition

**Day 1-2: Core Form Components**
```typescript
src/components/forms/
├── FormField.tsx               Universal field wrapper (40 lines)
├── FormSection.tsx             Section container (35 lines)
├── TextAreaField.tsx           Textarea with validation (45 lines)
├── ErrorMessage.tsx            Error display (20 lines)
└── FieldLabel.tsx             Label with tooltips (25 lines)
```

**Day 3-4: Specialized Inputs**
```typescript
src/components/forms/
├── MultiSelectField.tsx        Checkbox group (50 lines)
├── SliderField.tsx            Slider with labels (45 lines)
├── DatePickerField.tsx        Date picker (40 lines)
└── CounterField.tsx           Number counter (35 lines)
```

**Day 5: Navigation & Feedback**
```typescript
src/components/forms/
├── NavigationButtons.tsx       Back/Next buttons (30 lines)
├── ProgressIndicator.tsx       Step progress (40 lines)
├── LoadingSpinner.tsx         Loading states (25 lines)
└── ValidationSummary.tsx      Error summary (35 lines)
```

**Deliverable**: 13 reusable components (~465 lines)

---

### **Week 3: Break Down Assessment (Part 1)**
**Goal**: Refactor 4 assessment components

**Day 1-2: ProblemOriginForm (340 → 180 lines, 4 components)**
```typescript
src/components/features/assessment/problem-origin/
├── ProblemStoryInput.tsx           45 lines ✅
├── ProblemImpactMetrics.tsx        50 lines ✅
├── ProblemValidation.tsx           40 lines ✅
└── ProblemOriginContainer.tsx      45 lines ✅

Feature Flag: USE_NEW_PROBLEM_ORIGIN
A/B Test: 10% of users
```

**Day 3: UniqueAdvantageForm (280 → 150 lines, 3 components)**
```typescript
src/components/features/assessment/unique-advantage/
├── AdvantageSelector.tsx           50 lines ✅
├── AdvantageExplanation.tsx        55 lines ✅
└── UniqueAdvantageContainer.tsx    45 lines ✅

Feature Flag: USE_NEW_UNIQUE_ADVANTAGE
A/B Test: 10% of users
```

**Day 4-5: CustomerEvidenceForm (380 → 200 lines, 5 components)**
```typescript
src/components/features/assessment/customer-evidence/
├── CustomerConversationInput.tsx   50 lines ✅
├── CustomerQuoteSection.tsx        45 lines ✅
├── CustomerCountSelector.tsx       40 lines ✅
├── CustomerLearningInput.tsx       35 lines ✅
└── CustomerEvidenceContainer.tsx   30 lines ✅

Feature Flag: USE_NEW_CUSTOMER_EVIDENCE
A/B Test: 10% of users
```

**Deliverable**: 12 new components, 3 forms refactored

---

### **Week 4: Break Down Assessment (Part 2)**
**Goal**: Refactor remaining 3 assessment components

**Day 1: FailedAssumptionsForm (250 → 130 lines, 3 components)**
```typescript
src/components/features/assessment/failed-assumptions/
├── AssumptionBeliefInput.tsx           45 lines ✅
├── AssumptionDiscoveryInput.tsx        40 lines ✅
└── FailedAssumptionsContainer.tsx      45 lines ✅

Feature Flag: USE_NEW_FAILED_ASSUMPTIONS
A/B Test: 10% of users
```

**Day 2-3: LearningVelocityForm (320 → 165 lines, 4 components)**
```typescript
src/components/features/assessment/learning-velocity/
├── BuildTimeInput.tsx              40 lines ✅
├── MeasurementInput.tsx            45 lines ✅
├── ResultsInput.tsx                40 lines ✅
└── LearningVelocityContainer.tsx   40 lines ✅

Feature Flag: USE_NEW_LEARNING_VELOCITY
A/B Test: 10% of users
```

**Day 4-5: MarketCalculator (420 → 170 lines, 4 components)**
```typescript
src/components/features/assessment/market-calculator/
├── MarketSizeInput.tsx                 40 lines ✅
├── MarketAssumptions.tsx               50 lines ✅
├── MarketCalculationDisplay.tsx        45 lines ✅
└── MarketCalculatorContainer.tsx       35 lines ✅

Feature Flag: USE_NEW_MARKET_CALCULATOR
A/B Test: 10% of users
```

**Deliverable**: 11 new components, all assessment forms refactored

---

### **Week 5: Break Down Startup Profile**
**Goal**: Refactor 1,100-line page into 6 focused components

**Day 1: Company Basics (180 lines → 2 components)**
```typescript
src/components/features/startup-profile/
├── CompanyBasicsForm.tsx       90 lines ✅
└── IndustrySelector.tsx        45 lines ✅

Extracting: Lines 260-440 from page.tsx
```

**Day 2: Problem & Solution (200 lines → 3 components)**
```typescript
src/components/features/startup-profile/
├── ProblemSolutionForm.tsx     70 lines ✅
├── SolutionUpload.tsx         45 lines ✅
└── MoatExplanation.tsx        50 lines ✅

Extracting: Lines 440-640 from page.tsx
```

**Day 3: Market & Competition (180 lines → 3 components)**
```typescript
src/components/features/startup-profile/
├── MarketSizeForm.tsx          65 lines ✅
├── CompetitorList.tsx          60 lines ✅
└── DifferentiationForm.tsx     55 lines ✅

Extracting: Lines 640-820 from page.tsx
```

**Day 4: Traction & Metrics (200 lines → 4 components)**
```typescript
src/components/features/startup-profile/
├── TractionTypeSelector.tsx    45 lines ✅
├── RevenueMetrics.tsx          70 lines ✅
├── PreRevenueMetrics.tsx       50 lines ✅
└── IntegrationOptions.tsx      35 lines ✅

Extracting: Lines 820-1020 from page.tsx
```

**Day 5: Team & Fundraising (340 lines → 4 components)**
```typescript
src/components/features/startup-profile/
├── TeamSection.tsx             90 lines ✅
├── AdvisorsList.tsx            50 lines ✅
├── FundraisingForm.tsx         80 lines ✅
└── UseOfFunds.tsx              70 lines ✅

Extracting: Lines 1020-1100 from page.tsx
```

**Deliverable**: 16 new components, startup profile fully refactored

---

### **Week 6: Integration & Testing**
**Goal**: Connect all pieces, test thoroughly

**Day 1-2: Integration**
- Wire up all new components to main pages
- Connect to Zustand stores
- Enable feature flags
- Test navigation flow

**Day 3-4: Comprehensive Testing**
```bash
npm run test:coverage    # Aim for 80%+
npm run test:regression  # Must be 100% passing
```
- Unit tests for all hooks
- Component tests for all new components
- Integration tests for full flows
- Performance profiling

**Day 5: Bug Fixes**
- Address any issues found
- Performance optimization
- Accessibility improvements

**Deliverable**: Working refactored app, all tests passing

---

### **Week 7: Gradual Rollout**
**Goal**: Roll out to production safely

**Day 1**: 0.1% rollout (internal testing)
- Enable flags for 0.1% of users
- Monitor error rates
- Check for data loss
- Verify scoring consistency

**Day 2**: 1% rollout
- Increase to 1% if no issues
- Monitor user feedback
- Check performance metrics
- Review error logs

**Day 3**: 5% rollout
- Increase to 5%
- Continue monitoring
- Gather user feedback
- Performance validation

**Day 4**: 10% rollout
- Increase to 10%
- Analyze A/B test results
- Compare metrics vs old

**Day 5**: 25% rollout
- Increase to 25%
- Final validation before majority
- Review all metrics

**Deliverable**: 25% of users on new implementation, validated

---

### **Week 8: Full Migration**
**Goal**: Complete rollout and cleanup

**Day 1**: 50% rollout
- Increase to 50%
- Monitor closely
- Ready to rollback if needed

**Day 2**: 75% rollout
- Increase to 75%
- Final checks

**Day 3**: 100% rollout
- Full migration
- All users on new implementation
- Monitor for 24 hours

**Day 4-5: Cleanup**
- Remove old components
- Delete feature flags
- Update documentation
- Celebrate! 🎉

**Deliverable**: Migration complete, old code removed

---

## 📏 **Component Breakdown Formula**

### For Each Monolithic Component:

#### Step 1: Analyze Structure (30 min)
```
Read through component
Identify logical sections
List all state variables
Map data flow
```

#### Step 2: Extract Hook (2-3 hours)
```typescript
// Create hook file
export const useComponentName = () => {
  // Move state from component
  // Move validation logic
  // Move business logic calls
  // Connect to Zustand store
  // Return clean interface
};
```

#### Step 3: Create Subcomponents (3-4 hours)
```typescript
// Break JSX into 3-6 focused components
// Each handles one logical section
// Props only, no internal state
// Max 50 lines each
```

#### Step 4: Create Container (1-2 hours)
```typescript
// Orchestrate subcomponents
// Use the custom hook
// Handle navigation
// Manage loading states
```

#### Step 5: Test & Integrate (2-3 hours)
```bash
# Write tests
# Manual testing
# Feature flag integration
# A/B test setup
```

**Total per component**: 8-13 hours
**Total for all 8 components**: 64-104 hours (2-3 weeks with focused work)

---

## 🎯 **Success Metrics**

### Code Quality
- [ ] No component > 50 lines
- [ ] No function > 20 lines
- [ ] Cyclomatic complexity < 10
- [ ] Test coverage > 80%

### Performance
- [ ] Bundle size ≤ current + 10%
- [ ] Page load time ≤ current + 5%
- [ ] Time to interactive ≤ current + 5%

### Business
- [ ] Zero data loss
- [ ] Scoring results identical
- [ ] User completion rate ≥ current
- [ ] Error rate ≤ current

### Developer Experience
- [ ] Time to onboard new dev < 1 week
- [ ] Time to fix bug < 2 hours
- [ ] Time to add feature < 1 day

---

## 🚨 **Risk Mitigation**

### Risk 1: Breaking Changes
**Mitigation**:
- Feature flags for each component
- A/B testing at 10%
- Regression tests must pass 100%
- Side-by-side implementation

### Risk 2: Performance Regression
**Mitigation**:
- Performance benchmarks
- Bundle size monitoring
- Profiling before/after
- Circuit breaker on slowdowns

### Risk 3: User Experience Degradation
**Mitigation**:
- Manual testing every component
- User feedback collection
- Rollback within 5 minutes
- Error tracking on all actions

### Risk 4: Timeline Slippage
**Mitigation**:
- One component at a time
- No moving to next until current complete
- Buffer week built into plan
- Daily progress tracking

---

## 📋 **Daily Checklist**

### Morning (Planning)
- [ ] Review yesterday's progress
- [ ] Identify today's target component
- [ ] Read component thoroughly
- [ ] Create task breakdown

### During (Execution)
- [ ] Create hook file
- [ ] Extract state logic
- [ ] Create subcomponents
- [ ] Create container
- [ ] Write tests
- [ ] Manual testing

### Evening (Validation)
- [ ] Run all tests
- [ ] Performance check
- [ ] Commit changes
- [ ] Update progress tracker
- [ ] Plan tomorrow

---

## 🎉 **Expected Outcome**

### Before Migration:
```
8 monolithic files (3,380 lines)
❌ Hard to maintain
❌ Hard to test
❌ Hard to understand
❌ Risk of breaking changes
```

### After Migration:
```
48 focused components (~1,200 lines)
✅ Easy to maintain (< 50 lines each)
✅ Easy to test (isolated logic)
✅ Easy to understand (single responsibility)
✅ Safe to change (tested + feature flags)
```

---

## 📊 **Progress Tracker**

Track daily progress:
```
Week 1: [▱▱▱▱▱] 0/5 hooks extracted
Week 2: [▱▱▱▱▱] 0/5 UI components created
Week 3: [▱▱▱▱▱] 0/5 components refactored
Week 4: [▱▱▱▱▱] 0/5 components refactored
Week 5: [▱▱▱▱▱] 0/5 sections refactored
Week 6: [▱▱▱▱▱] 0/5 tests/integration
Week 7: [▱▱▱▱▱] 0/5 rollout stages
Week 8: [▱▱▱▱▱] 0/5 cleanup tasks
```

**Current**: Week 0 - Preparing to start

---

**This is the REAL work. Foundation is done. Now we build.** 🏗️
