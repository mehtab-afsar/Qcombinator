# Edge Alpha - Testing Guide

## Quick Start: Test with Mock Company Data

### Step 1: Load Mock Data

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000 in your browser

3. Open Browser Console:
   - **Mac**: `Cmd + Option + J`
   - **Windows/Linux**: `F12` or `Ctrl + Shift + J`

4. Copy the entire contents of `scripts/setup-mock-company.js` and paste into console

5. Run the setup command:
   ```javascript
   setupMockCompany()
   ```

6. Reload the page (`Cmd+R` or `F5`)

### Step 2: Test Features

#### ✅ Test 1: AI Agents with Context

1. Navigate to `/founder/agents/patel` (GTM Strategy Agent)

2. Ask: **"Help me improve my ICP targeting"**

3. **Expected Result**: Patel should respond with:
   - Reference to your **$6,250 MRR** and **42 customers**
   - Mention your **product-led growth** channel success (CAC: $67)
   - Talk about your **ICP**: PMs at Series B+ companies
   - Specific advice based on your **8.5% conversion rate**

#### ✅ Test 2: Financial Agent (Felix)

1. Navigate to `/founder/agents/felix`

2. Ask: **"Is my burn rate healthy?"**

3. **Expected Result**: Felix should mention your $18,500/month burn, 72% gross margin, and 14 months runway

#### ✅ Test 3: Dashboard Q-Score

1. Navigate to `/founder/dashboard` - Should show Q-Score breakdown

#### ✅ Test 4: Improve Q-Score Page

1. Navigate to `/founder/improve-qscore` - Should show personalized recommendations

---

## Mock Company: TaskFlow

- **Founder**: Sarah Martinez (ex-Atlassian PM)
- **MRR**: $6,250 | **Customers**: 42 | **Burn**: $18,500/mo
- **LTV:CAC**: 40:1 (Excellent!) | **Runway**: 14 months
- **Product**: AI project management intelligence layer

---

## Clear Data

```javascript
clearMockData()  // Then reload
```
