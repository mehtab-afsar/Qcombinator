#!/bin/bash
set -e

# Fix startup-profile/page.tsx - line 69 and 205
perl -i -pe 's/coFounders: any\[\];/coFounders: Array<{ name: string; role: string; linkedin?: string; equity: number }>;/' app/founder/startup-profile/page.tsx
perl -i -pe 's/const updateData = \(field: keyof StartupData, value: any\)/const updateData = (field: keyof StartupData, value: string | number | string[])/' app/founder/startup-profile/page.tsx

# Fix investor/onboarding/page.tsx - line 88
perl -i -pe 's/const updateData = \(field: string, value: any\)/const updateData = (field: string, value: string | number | string[])/' app/investor/onboarding/page.tsx

# Fix all remaining unescaped quotes
perl -i -pe "s/What's/What\&apos;s/g" app/founder/dashboard/page.tsx app/founder/startup-profile/page.tsx app/investor/onboarding/page.tsx
perl -i -pe "s/Let's/Let\&apos;s/g" app/founder/matching/page.tsx app/founder/onboarding/page.tsx
perl -i -pe "s/Don't/Don\&apos;t/g" app/founder/startup-profile/page.tsx
perl -i -pe "s/you're/you\&apos;re/g" app/founder/startup-profile/page.tsx app/investor/onboarding/page.tsx
perl -i -pe "s/we're/we\&apos;re/g" app/founder/startup-profile/page.tsx
perl -i -pe "s/Who's/Who\&apos;s/g" app/founder/startup-profile/page.tsx app/investor/onboarding/page.tsx
perl -i -pe "s/Edge's/Edge\&apos;s/g" app/page.tsx
perl -i -pe "s/that's/that\&apos;s/g" app/page.tsx
perl -i -pe "s/We're/We\&apos;re/g" app/page.tsx
perl -i -pe "s/You're/You\&apos;re/g" src/components/features/assessment/resilience/ResilienceContainer.tsx
perl -i -pe "s/aren't/aren\&apos;t/g" src/components/features/assessment/resilience/ResilienceContainer.tsx
perl -i -pe "s/That's/That\&apos;s/g" src/components/features/assessment/resilience/ResilienceContainer.tsx
perl -i -pe 's/"unique"/"unique"/g; s/"unfair"/"unfair"/g' src/components/features/assessment/unique-advantage/UniqueAdvantageContainer.tsx

echo "All fixes applied successfully!"
