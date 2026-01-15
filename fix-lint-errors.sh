#!/bin/bash

# Fix assessment/page.tsx - line 213 any type
sed -i '' '213s/onChange: (field: string, value: any)/onChange: (field: string, value: string | number | Date | null | string[])/' app/founder/assessment/page.tsx

# Fix dashboard/page.tsx - line 59 any type
sed -i '' '59s/: any/: Record<string, number | string>/' app/founder/dashboard/page.tsx

# Fix dashboard/page.tsx - line 454 unescaped quote
sed -i '' "454s/What's/What\&apos;s/" app/founder/dashboard/page.tsx

# Fix matching/page.tsx - line 321 unescaped quote
sed -i '' "321s/Let's/Let\&apos;s/" app/founder/matching/page.tsx

# Fix onboarding/page.tsx - line 433 unescaped quote
sed -i '' "433s/Let's/Let\&apos;s/" app/founder/onboarding/page.tsx

# Fix startup-profile/page.tsx - any types and quotes
sed -i '' '69s/(value: any)/(value: string | number | string[])/' app/founder/startup-profile/page.tsx
sed -i '' '205s/(updates: any)/(updates: Record<string, string | number>)/' app/founder/startup-profile/page.tsx
sed -i '' "430s/Don't/Don\&apos;t/" app/founder/startup-profile/page.tsx
sed -i '' "686s/you're/you\&apos;re/" app/founder/startup-profile/page.tsx
sed -i '' "901s/we're/we\&apos;re/" app/founder/startup-profile/page.tsx
sed -i '' "1036s/Who's/Who\&apos;s/" app/founder/startup-profile/page.tsx
sed -i '' "1099s/What's/What\&apos;s/" app/founder/startup-profile/page.tsx

# Fix investor/onboarding/page.tsx - any type and quotes
sed -i '' '88s/(field: string, value: any)/(field: string, value: string | number | string[])/' app/investor/onboarding/page.tsx
sed -i '' "150s/What's/What\&apos;s/" app/investor/onboarding/page.tsx
sed -i '' "440s/What's/What\&apos;s/" app/investor/onboarding/page.tsx
sed -i '' "473s/you're/you\&apos;re/" app/investor/onboarding/page.tsx
sed -i '' "514s/Who's/Who\&apos;s/" app/investor/onboarding/page.tsx

# Fix assessment component files
sed -i '' "37s/\"problem\"/\&quot;problem\&quot;/" src/components/features/assessment/problem-origin/ProblemOriginContainer.tsx
sed -i '' "37s/\"solution\"/\&quot;solution\&quot;/" src/components/features/assessment/problem-origin/ProblemOriginContainer.tsx
sed -i '' "37s/isn't/isn\&apos;t/" src/components/features/assessment/problem-origin/ProblemOriginContainer.tsx
sed -i '' "38s/it's/it\&apos;s/" src/components/features/assessment/problem-origin/ProblemOriginContainer.tsx

sed -i '' "57s/haven't/haven\&apos;t/" src/components/features/assessment/resilience/QuitScaleSlider.tsx

sed -i '' "54s/You're/You\&apos;re/" src/components/features/assessment/resilience/ResilienceContainer.tsx
sed -i '' "54s/aren't/aren\&apos;t/" src/components/features/assessment/resilience/ResilienceContainer.tsx
sed -i '' "55s/That's/That\&apos;s/" src/components/features/assessment/resilience/ResilienceContainer.tsx

sed -i '' "28s/didn't/didn\&apos;t/" src/components/features/assessment/resilience/WhatKeptGoingInput.tsx

sed -i '' "30s/you're/you\&apos;re/" src/components/features/assessment/unique-advantage/UniqueAdvantageContainer.tsx
sed -i '' "53s/\"unique\"/\&quot;unique\&quot;/" src/components/features/assessment/unique-advantage/UniqueAdvantageContainer.tsx
sed -i '' "53s/\"unfair\"/\&quot;unfair\&quot;/" src/components/features/assessment/unique-advantage/UniqueAdvantageContainer.tsx

# Fix lib files - any types
sed -i '' '144s/: any/: Record<string, unknown>/' lib/feature-flags.ts
sed -i '' '213s/(error: any)/(error: unknown)/' lib/feature-flags.ts
sed-i '' '217s/: any/: Record<string, unknown>/' lib/feature-flags.ts
sed -i '' '222s/(error: any)/(error: unknown)/' lib/feature-flags.ts

sed -i '' '200s/(input: any, context: any)/(input: Record<string, unknown>, context: Record<string, unknown>)/' lib/groq.ts

sed -i '' '87s/(data: any)/(data: Record<string, unknown>)/' lib/scoring/q-score.ts

echo "Lint fixes applied!"
