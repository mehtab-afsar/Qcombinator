# Q Combinator 2.0 Setup Guide 🚀

## Quick Start

### 1. Get Your Groq API Key
1. Visit [console.groq.com](https://console.groq.com/)
2. Sign up for a free account
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `gsk_...`)

### 2. Configure Environment
```bash
# Open .env.local file
# Replace "your_groq_api_key_here" with your actual API key
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
```

### 3. Install & Run
```bash
npm install
npm run dev
```

### 4. Test AI Features
1. Go to http://localhost:3000
2. Choose **Founder**
3. Navigate to **AI Pitch Analyzer**
4. Paste this sample pitch:

```
We're building TechFlow, an AI-powered workflow automation platform for mid-market companies.
Our solution reduces manual data entry by 80% and increases team productivity by 40%.

We've validated the problem through 200+ customer interviews. Our target market is $50B+ and growing 15% annually.
Our team includes former executives from Salesforce and Microsoft with deep enterprise software experience.

We currently have 1,200 beta users, $25K MRR, and growing 20% month-over-month.
We're raising $2M to expand our sales team and accelerate product development.
```

5. Click **Analyze Pitch** to see real AI analysis!

## What You'll See

- **Real-time AI analysis** of your pitch
- **Detailed scoring** across 5 key areas
- **Actionable recommendations** for improvement
- **Q Score generation** based on startup data
- **Investor matching** with compatibility scores

## Troubleshooting

**API Key Issues:**
- Make sure your key starts with `gsk_`
- Check that `.env.local` is in the root directory
- Restart the dev server after adding the key

**Rate Limits:**
- Groq has generous free tier limits
- Fallback data will show if API fails

**Build Errors:**
- Run `npm install` to ensure all dependencies are installed
- Check that Node.js version is 18+

## Ready to Test! 🎉

The project is now fully integrated with Groq AI. You can test all the AI features including pitch analysis, Q Score generation, and investor matching with real AI-powered responses.