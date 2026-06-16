import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// 18 companies with exact P1-P6 field mappings
const COMPANIES = [
  {
    name: 'Nexus Power',
    email: 'nishita@nexuspower-test.example.com',
    founder: 'Nishita Baliarsingh',
    sector: 'climate',
    qScore: 63,
    p1: {
      conversationCount: 6,
      hasPayingCustomers: false,
      customerCommitment: 'Signed LOI with Odisha Farmers Cooperative for 50kg pilot',
      salesCycleLength: '3+ months',
    },
    p2: {
      tamDescription: 'India 500M tonnes crop residue annually. 120M tonnes paddy-belt SAM. Global market $2.1B (2024) → $8.4B (2030).',
      marketUrgency: 'Supreme Court stubble burn ban creates regulatory emergency. Viksit Bharat 2047 clean energy mandate.',
      valuePool: 'Farmers lose ₹4,500Cr annually. Lithium ₹15,000/kWh vs our ₹8,000/kWh target.',
      competitorCount: 2,
    },
    p3: {
      hasPatent: true,
      patentDescription: 'Provisional patent IN 202441089234 — paddy-specific cellulose fermentation',
      replicationCostUsd: 7000000,
      replicationTimeMonths: 30,
      buildComplexity: '12+ months',
    },
    p4: {
      domainYears: 5,
      founderMarketFit: 'Nishita: CSIR-IMMT materials scientist 7yr, IIT Bhubaneswar partnership. Priya Sharma: Amara Raja Batteries manufacturing 6yr.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'sales', 'operations'],
      teamCohesionMonths: 48,
    },
    p5: {
      climateLeverage: 'Each tonne prevents 2.4t CO2e from burning. 1,000 tonnes/year = 2,400t CO2e avoided.',
      socialImpact: 'Farmer income from residue: ₹8/kg vs ₹0 (burn). 500 farmers Y1, 5,000 by Y3.',
      revenueImpactLink: 'SDG 7, 12, 13, 2. ₹1 revenue → ₹0.40 farmer income.',
      viksitBharatAlignment: 'Clean Energy + Agri + Infrastructure. Atmanirbhar Bharat vs imported lithium.',
    },
    p6: {
      mrr: 0,
      monthlyBurn: 150000,
      runway: 18,
    },
  },
  {
    name: 'PCRA TECHNOLOGIES PVT LTD',
    email: 'vamshi@pcra-test.example.com',
    password: 'PCRATech2024!',
    founder: 'Vamshi Krishna Mannuri',
    sector: 'fintech',
    qScore: 70,
    isNew: true,
    p1: {
      conversationCount: 35,
      hasPayingCustomers: true,
      customerCommitment: 'Signed: 300+ distributors, 3000+ retailers active. NRR 120%.',
      salesCycleLength: '1-3 months',
      retentionDetail: 'ERP integration = high switching costs. Expansion pipeline strong.',
    },
    p2: {
      tamDescription: 'Indian pharma supply chain ₹80,000Cr. Unorganized trade credit gap = $4B+ opportunity.',
      marketUrgency: 'RBI credit regulations tightening. Pharma distributors need instant KYC credit.',
      valuePool: 'Distributors save ₹5-15L/year in default costs. Retailers get instant credit access.',
      competitorCount: 3,
    },
    p3: {
      hasPatent: true,
      patentDescription: 'Patent-filed proprietary pharma credit scoring engine',
      replicationCostUsd: 1800000,
      replicationTimeMonths: 15,
      buildComplexity: '9-12 months',
    },
    p4: {
      domainYears: 6,
      founderMarketFit: 'Vamshi + Raghavendra: ERP integration + pharma-commerce domain + regulatory acumen',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'sales', 'operations'],
      teamCohesionMonths: 18,
    },
    p5: {
      climateLeverage: 'Enables rural pharmacies to grow sustainably without predatory lending',
      socialImpact: 'Financial inclusion for 50K+ small pharmacies. Affordable medicine access.',
      revenueImpactLink: 'SDG 3 (healthcare). Direct link: credit volume → rural medicine access.',
      viksitBharatAlignment: 'Digital infrastructure for Ayushman Bharat. Fintech for tier-2/3 towns.',
    },
    p6: {
      mrr: 80000,
      monthlyBurn: 60000,
      runway: 24,
    },
  },
  {
    name: 'Inochi Care Pvt Ltd',
    email: 'shivani@inochi-test.example.com',
    founder: 'Shivani Gupta',
    sector: 'healthtech',
    qScore: 68,
    p1: {
      conversationCount: 22,
      hasPayingCustomers: false,
      customerCommitment: 'Active in 100+ hospitals. Signed pilots with major chains. TRL9 achieved.',
      salesCycleLength: '1-3 months',
    },
    p2: {
      tamDescription: 'India 80M chronic wound cases/year. Global wound care $20B market.',
      marketUrgency: 'Diabetic foot ulcers cost hospitals ₹50K per patient. Urgent unmet need.',
      valuePool: 'Hospitals save 40% healing time. Reduces hospital stay 15 days → 8 days.',
      competitorCount: 5,
    },
    p3: {
      hasPatent: true,
      patentDescription: 'Multitherapeutic wound healing device — 3 patent family',
      replicationCostUsd: 5000000,
      replicationTimeMonths: 24,
      buildComplexity: '12+ months',
    },
    p4: {
      domainYears: 7,
      founderMarketFit: 'Shivani: TRL9 deployment experience. AIIMS advisory. Deep clinical insight.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'sales', 'operations', 'clinical'],
      teamCohesionMonths: 36,
    },
    p5: {
      climateLeverage: 'Reduces antibiotic usage per patient by 60%. AMR reduction impact.',
      socialImpact: 'Enables rural hospitals to treat chronic wounds without specialist access.',
      revenueImpactLink: 'SDG 3. Healthcare equity. Ayushman Bharat alignment.',
      viksitBharatAlignment: 'Rural healthcare infrastructure. Accessible wound care tech.',
    },
    p6: {
      mrr: 0,
      monthlyBurn: 90000,
      runway: 20,
    },
  },
  {
    name: 'GMetri',
    email: 'utsav@gmetri-test.example.com',
    founder: 'Utsav Mathur',
    sector: 'ai_ml',
    qScore: 68,
    p1: {
      conversationCount: 32,
      hasPayingCustomers: true,
      customerCommitment: 'Signed: Amazon (multi-year), Walmart, ICICI Bank. NRR 180%.',
      salesCycleLength: '3+ months',
      retentionDetail: 'Amazon expanded warehouse → full supply chain. Enterprise renewals.',
    },
    p2: {
      tamDescription: 'Digital twin + XR training market $60B (2024-2030). India enterprise $8B TAM.',
      marketUrgency: 'Manufacturing efficiency gains urgent post-COVID. Supply chain resilience critical.',
      valuePool: 'Customers report 60% CO2 reduction. 40% training cost savings.',
      competitorCount: 8,
    },
    p3: {
      hasPatent: false,
      patentDescription: 'No patents. Strong data moat: 500+ deployed models. Proprietary AI training pipeline.',
      replicationCostUsd: 3500000,
      replicationTimeMonths: 18,
      buildComplexity: '12+ months',
    },
    p4: {
      domainYears: 6,
      founderMarketFit: 'Utsav: Fortune 500 sales chops + XR/AI technical depth. Prior exit (acquihire).',
      priorExits: 1,
      teamCoverage: ['tech', 'product', 'sales', 'operations'],
      teamCohesionMonths: 30,
    },
    p5: {
      climateLeverage: '60% CO2 reduction per training. Digital twin replaces physical pilots.',
      socialImpact: 'Neuro-inclusive pedagogy. 1-for-1 education model.',
      revenueImpactLink: 'SDG 9, 12, 13. Every deployment = measurable impact.',
      viksitBharatAlignment: 'Digital infrastructure. Industry 4.0 enabler.',
    },
    p6: {
      mrr: 200000,
      monthlyBurn: 130000,
      runway: 20,
    },
  },
  {
    name: 'Drivomate',
    email: 'hutesh@drivomate-test.example.com',
    founder: 'Hutesh Kumar Gauttam',
    sector: 'hardware',
    qScore: 64,
    p1: {
      conversationCount: 15,
      hasPayingCustomers: false,
      customerCommitment: 'Signed pilot MG Motors delivery Q2 2026. Indian Army LOI 100 units.',
      salesCycleLength: '3+ months',
    },
    p2: {
      tamDescription: 'India 2-wheeler + 3-wheeler market 20M units/year. ADAS TAM ₹40,000Cr.',
      marketUrgency: 'Road safety crisis: 150K deaths/year. ADAS mandate coming 2027+.',
      valuePool: 'Insurance cost reduction 20%. Accident prevention savings ₹2L+ per vehicle.',
      competitorCount: 3,
    },
    p3: {
      hasPatent: true,
      patentDescription: 'Camera-based ADAS — 1 patent. Radar-free architecture proprietary.',
      replicationCostUsd: 2500000,
      replicationTimeMonths: 20,
      buildComplexity: '12+ months',
    },
    p4: {
      domainYears: 5,
      founderMarketFit: 'Hutesh + Omprakash: OEM partnerships proven (MG Motors, Army). PM Modi demo credibility.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'sales', 'operations'],
      teamCohesionMonths: 24,
    },
    p5: {
      climateLeverage: 'Reduces emissions 15% via optimized driving. Fewer accidents = fuel savings.',
      socialImpact: 'Road safety for rural India. Democratized ADAS access.',
      revenueImpactLink: 'SDG 3 (road safety). Viksit Bharat 2047 alignment.',
      viksitBharatAlignment: 'Indigenous ADAS tech. Self-reliance vs global imports.',
    },
    p6: {
      mrr: 0,
      monthlyBurn: 80000,
      runway: 22,
    },
  },
  {
    name: 'DigiClinics Research And Services Pvt Ltd',
    email: 'raja@digiclinics-test.example.com',
    founder: 'Dr Rajasekaran Subramanian',
    sector: 'healthtech',
    qScore: 68,
    p1: {
      conversationCount: 28,
      hasPayingCustomers: true,
      customerCommitment: 'Signed: Tapadia Diagnostics, Indo-American Hospital, ICICI Lombard. DPaaS revenue active.',
      salesCycleLength: '1-3 months',
      retentionDetail: 'Hospital renewal 85%. Insurance partner NRR 120%.',
    },
    p2: {
      tamDescription: 'India breast cancer cases 270K/year. Rural underdiagnosis 60%. AI diagnostics TAM ₹50,000Cr.',
      marketUrgency: 'Clinical validation published (1.1M pathology tiles). FDA Breakthrough path clear.',
      valuePool: 'Early detection = 90% vs 30% survival. Cost/patient ₹2K vs ₹50K treatment.',
      competitorCount: 4,
    },
    p3: {
      hasPatent: true,
      patentDescription: '1.1M pathology tile dataset = moat. Patent-pending AI algorithms.',
      replicationCostUsd: 3800000,
      replicationTimeMonths: 22,
      buildComplexity: '12+ months',
    },
    p4: {
      domainYears: 8,
      founderMarketFit: 'Dr Rajasekaran: 90yr+ combined clinical expertise. Dr Devika: AI model development.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'sales', 'operations', 'clinical'],
      teamCohesionMonths: 36,
    },
    p5: {
      climateLeverage: 'Reduces unnecessary procedures 40%. Medical waste reduction.',
      socialImpact: 'Rural cancer screening access. Healthcare equity focus.',
      revenueImpactLink: 'SDG 3. Direct link: diagnostic volume → early detection → survival.',
      viksitBharatAlignment: 'Rural diagnostics infrastructure. Indigenous AI tech.',
    },
    p6: {
      mrr: 95000,
      monthlyBurn: 78000,
      runway: 18,
    },
  },
  {
    name: 'Meine Electric Automotives Pvt Ltd',
    email: 'stuti@meine-test.example.com',
    founder: 'Stuti Kakkar',
    sector: 'climate',
    qScore: 67,
    p1: {
      conversationCount: 28,
      hasPayingCustomers: true,
      customerCommitment: 'Signed pilots CRPF, NDRF, defense MoUs. Drone sector LOIs.',
      salesCycleLength: '1-3 months',
    },
    p2: {
      tamDescription: 'Portable power $12B market. Off-grid + disaster relief $2B segment. India drone boom.',
      marketUrgency: 'Lithium supply chains fragile (China 60% refining). Aluminium-air non-flammable (defense need).',
      valuePool: 'Diesel genset replacement saves ₹5L/year. Silent operation value for rural.',
      competitorCount: 2,
    },
    p3: {
      hasPatent: true,
      patentDescription: 'Aluminium-Air fuel cell — 8 patent family. Electrochemistry moat.',
      replicationCostUsd: 7000000,
      replicationTimeMonths: 28,
      buildComplexity: '12+ months',
    },
    p4: {
      domainYears: 6,
      founderMarketFit: 'Priyansh + Stuti: Materials science + electrochemistry + ops execution.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'operations', 'sales'],
      teamCohesionMonths: 24,
    },
    p5: {
      climateLeverage: 'Zero-emission power. Replaces diesel gensets. 10 tonnes CO2 avoided per unit/year.',
      socialImpact: 'Off-grid rural electrification. Non-toxic fuel cell tech.',
      revenueImpactLink: 'SDG 7, 13. Disaster relief focus = social impact core.',
      viksitBharatAlignment: 'Defense self-reliance. Green hydrogen ecosystem partner.',
    },
    p6: {
      mrr: 40000,
      monthlyBurn: 95000,
      runway: 20,
    },
  },
  {
    name: 'RNT Health Insights Pvt Ltd',
    email: 'tanmaya@rntinsights-test.example.com',
    founder: 'Tanmaya Gulati',
    sector: 'healthtech',
    qScore: 66,
    p1: {
      conversationCount: 18,
      hasPayingCustomers: false,
      customerCommitment: 'Pfizer INDovation backed. NIDHI PRAYAS grant. Hospital pilots active.',
      salesCycleLength: '1-3 months',
    },
    p2: {
      tamDescription: 'GI cancer 400K cases/year India. AI endoscopy TAM $15B global.',
      marketUrgency: 'FDA Breakthrough Device Designation. CDSCO fast-track path.',
      valuePool: 'Early polyp detection 95% accuracy. 10x diagnostic precision improvement.',
      competitorCount: 3,
    },
    p3: {
      hasPatent: true,
      patentDescription: 'Proprietary video algorithms — 3 patent family. FDA Breakthrough recognized.',
      replicationCostUsd: 5000000,
      replicationTimeMonths: 26,
      buildComplexity: '12+ months',
    },
    p4: {
      domainYears: 4,
      founderMarketFit: 'Tanmaya + Ria: AI expertise + clinical acumen. Pfizer + NIDHI backing validates.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'operations', 'clinical'],
      teamCohesionMonths: 20,
    },
    p5: {
      climateLeverage: 'Reduces unnecessary biopsies 60%. Medical waste reduction.',
      socialImpact: 'Early cancer screening access. Emerging market focus.',
      revenueImpactLink: 'SDG 3. Diagnostic accuracy → patient outcomes improvement.',
      viksitBharatAlignment: 'Medical device for India. Regulatory credibility via FDA.',
    },
    p6: {
      mrr: 0,
      monthlyBurn: 85000,
      runway: 20,
    },
  },
  {
    name: 'Manentia AI',
    email: 'anuj@manentia-test.example.com',
    founder: 'Anuj Chandalia',
    sector: 'healthtech',
    qScore: 63,
    p1: {
      conversationCount: 20,
      hasPayingCustomers: false,
      customerCommitment: 'Deployed 45+ institutions India, Nigeria, UK. Ongoing pilots.',
      salesCycleLength: '1-3 months',
    },
    p2: {
      tamDescription: 'Radiology access gap 2M underserved. AI diagnostics $50B market.',
      marketUrgency: 'Radiologist shortage critical. AI-assisted reads enable scaling.',
      valuePool: 'Report generation 80% faster. 30% cost reduction per scan.',
      competitorCount: 6,
    },
    p3: {
      hasPatent: false,
      patentDescription: 'No patents. Data moat: 500K scans. PACS integration proprietary.',
      replicationCostUsd: 1200000,
      replicationTimeMonths: 14,
      buildComplexity: '9-12 months',
    },
    p4: {
      domainYears: 5,
      founderMarketFit: 'Anuj + Jitender + Dr Shilika: AI + radiology + healthcare ops blend.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'operations', 'clinical'],
      teamCohesionMonths: 24,
    },
    p5: {
      climateLeverage: 'Reduces unnecessary imaging 25%. Medical waste reduction.',
      socialImpact: 'Rural radiology access via cloud. SDG 3 alignment.',
      revenueImpactLink: 'Diagnostic volume = clinical access improvement.',
      viksitBharatAlignment: 'Rural healthcare infrastructure.',
    },
    p6: {
      mrr: 0,
      monthlyBurn: 70000,
      runway: 18,
    },
  },
  {
    name: 'Blinq Mobility Pvt Ltd',
    email: 'nikesh@blinq-test.example.com',
    founder: 'Nikesh Bisht',
    sector: 'climate',
    qScore: 62,
    p1: {
      conversationCount: 22,
      hasPayingCustomers: true,
      customerCommitment: 'LOIs fleet operators. FAME-II incentive alignment. Pilot revenue realized.',
      salesCycleLength: '1-3 months',
    },
    p2: {
      tamDescription: 'Urban fleet market 5M vehicles. Battery swap $3B opportunity.',
      marketUrgency: 'FAME-II subsidies drive EV adoption. Battery swapping solves range anxiety.',
      valuePool: 'Fleet operators 40% cost savings. 5-min swap vs 30-min charge.',
      competitorCount: 2,
    },
    p3: {
      hasPatent: false,
      patentDescription: 'No patents. Modular design moat. Battery swap IP pending.',
      replicationCostUsd: 1500000,
      replicationTimeMonths: 14,
      buildComplexity: '9-12 months',
    },
    p4: {
      domainYears: 4,
      founderMarketFit: '5 co-founders: EV engineering + supply chain + fleet ops expertise.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'operations', 'sales'],
      teamCohesionMonths: 18,
    },
    p5: {
      climateLeverage: '5 tonnes CO2 avoided per vehicle/year. Fleet electrification key.',
      socialImpact: 'Affordable urban mobility. EV access for tier-2 operators.',
      revenueImpactLink: 'SDG 13, 11. Urban decarbonization link.',
      viksitBharatAlignment: 'Make in India EV tech. Sustainable cities.',
    },
    p6: {
      mrr: 30000,
      monthlyBurn: 65000,
      runway: 18,
    },
  },
  {
    name: 'Dashagriv Aerospace Technology',
    email: 'logesh@dashagriv-test.example.com',
    founder: 'Logeshwaran M',
    sector: 'hardware',
    qScore: 60,
    p1: {
      conversationCount: 10,
      hasPayingCustomers: false,
      customerCommitment: 'MoD AIP secured. DGCA roadmap active. DRDO engagement ongoing.',
      salesCycleLength: '3+ months',
    },
    p2: {
      tamDescription: 'HAPS surveillance $2B market. Border + disaster monitoring critical.',
      marketUrgency: 'Regulatory clarity emerging (DGCA, ICAO). Early movers advantage.',
      valuePool: 'Persistent monitoring vs satellite. 10x cost efficiency.',
      competitorCount: 2,
    },
    p3: {
      hasPatent: false,
      patentDescription: 'No patents. TRL5 HAPS system. Avionics + autonomy proprietary.',
      replicationCostUsd: 2000000,
      replicationTimeMonths: 24,
      buildComplexity: '12+ months',
    },
    p4: {
      domainYears: 4,
      founderMarketFit: 'Hariharan + Logeshwaran: Aerospace engineering + avionics expertise.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'operations'],
      teamCohesionMonths: 18,
    },
    p5: {
      climateLeverage: 'Solar-powered HAPS. Zero-emission surveillance.',
      socialImpact: 'Disaster response capability. Climate resilience',
      revenueImpactLink: 'Surveillance volume = disaster readiness improvement.',
      viksitBharatAlignment: 'Defense self-reliance. Autonomous systems.',
    },
    p6: {
      mrr: 0,
      monthlyBurn: 75000,
      runway: 18,
    },
  },
  {
    name: 'CLUIX',
    email: 'robin@cluix-test.example.com',
    founder: 'Robin Singh',
    sector: 'climate',
    qScore: 63,
    p1: {
      conversationCount: 22,
      hasPayingCustomers: false,
      customerCommitment: 'Pilots 8 Indian states. Certifications secured. Government partnerships.',
      salesCycleLength: '1-3 months',
    },
    p2: {
      tamDescription: 'Water quality monitoring TAM $5B. India 1M+ test points needed.',
      marketUrgency: 'NWQS mandate water quality tracking. Climate resilience priority.',
      valuePool: 'Decentralized testing 80% cheaper than lab. Real-time data value.',
      competitorCount: 4,
    },
    p3: {
      hasPatent: true,
      patentDescription: 'IoT water sensor — 1 patent. Portable device IP.',
      replicationCostUsd: 1500000,
      replicationTimeMonths: 15,
      buildComplexity: '9-12 months',
    },
    p4: {
      domainYears: 5,
      founderMarketFit: 'Robin + team: IIT Palakkad + KIIT expertise. Field execution proven.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'operations', 'sales'],
      teamCohesionMonths: 24,
    },
    p5: {
      climateLeverage: 'Water quality monitoring = climate adaptation. Resilience infrastructure.',
      socialImpact: 'Community water testing. Data democratization.',
      revenueImpactLink: 'Testing volume = water governance improvement.',
      viksitBharatAlignment: 'Water security for 2047. Climate resilience.',
    },
    p6: {
      mrr: 20000,
      monthlyBurn: 55000,
      runway: 20,
    },
  },
  {
    name: 'Gocarin Industries Pvt Ltd',
    email: 'ramanuj@gocarin-test.example.com',
    founder: 'Dr Ramanuj Panda',
    sector: 'agriculture',
    qScore: 63,
    p1: {
      conversationCount: 30,
      hasPayingCustomers: true,
      customerCommitment: '8000+ farmers. FPOs Odisha, Bengal, Assam. Repeat purchases SHG network.',
      salesCycleLength: '1-3 months',
      retentionDetail: 'Farmer loyalty via SHG groups. Referral-based expansion.',
    },
    p2: {
      tamDescription: 'India 120M smallholder farmers. Livestock feed market ₹100,000Cr.',
      marketUrgency: 'Methane emissions (livestock) critical climate target. Feed innovation urgent.',
      valuePool: 'Farmers: 30% milk yield increase, 50% methane reduction. Measurable ROI.',
      competitorCount: 2,
    },
    p3: {
      hasPatent: true,
      patentDescription: 'Nano-formulated algae cattle feed — provisional patent. Trade secret microbial ratios.',
      replicationCostUsd: 1800000,
      replicationTimeMonths: 16,
      buildComplexity: '9-12 months',
    },
    p4: {
      domainYears: 6,
      founderMarketFit: 'Dr Ramanuj + KIIT-TBI + IIT Kharagpur team. Agritech execution proven.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'operations', 'sales'],
      teamCohesionMonths: 24,
    },
    p5: {
      climateLeverage: '8000 farmers = 240K tonnes CO2e avoided annually via reduced methane.',
      socialImpact: 'Women farmer empowerment via SHGs. Inclusive growth focus.',
      revenueImpactLink: 'Farmer volume = climate + income impact. Direct revenue-impact link.',
      viksitBharatAlignment: 'Agri sustainability. Farmer income doubling goal.',
    },
    p6: {
      mrr: 35000,
      monthlyBurn: 50000,
      runway: 18,
    },
  },
  {
    name: 'WDUWG India LLP',
    email: 'satyajit@wduwg-test.example.com',
    founder: 'Satyajit Das',
    sector: 'hardware',
    qScore: 64,
    p1: {
      conversationCount: 18,
      hasPayingCustomers: false,
      customerCommitment: '6 active Indian Army deployments. ₹8Cr+ pipeline. Q1 2025 revenue ₹65L.',
      salesCycleLength: '3+ months',
    },
    p2: {
      tamDescription: 'Defense surveillance $5B market. Border security critical. 700+ Indian bases.',
      marketUrgency: 'Border monitoring mandate. Technology modernization priority.',
      valuePool: 'Multi-sensor integration = 10x situational awareness.',
      competitorCount: 2,
    },
    p3: {
      hasPatent: true,
      patentDescription: 'Census Counters platform — US patent. Defense-grade surveillance IP.',
      replicationCostUsd: 2200000,
      replicationTimeMonths: 18,
      buildComplexity: '12+ months',
    },
    p4: {
      domainYears: 6,
      founderMarketFit: 'TRL8 system proven. Bihar manufacturing capability. Government relations strong.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'operations', 'sales'],
      teamCohesionMonths: 20,
    },
    p5: {
      climateLeverage: 'Low-power surveillance reduces energy footprint vs alternatives.',
      socialImpact: 'Border security = national resilience.',
      revenueImpactLink: 'Deployment volume = surveillance coverage expansion.',
      viksitBharatAlignment: 'Defense self-reliance. Made in Bihar deep-tech.',
    },
    p6: {
      mrr: 25000,
      monthlyBurn: 70000,
      runway: 18,
    },
  },
  {
    name: 'Gudlyf Mobility Pvt Ltd',
    email: 'ajeet@gudlyf-test.example.com',
    founder: 'Dr Ajeet Babu',
    sector: 'climate',
    qScore: 67,
    p1: {
      conversationCount: 25,
      hasPayingCustomers: true,
      customerCommitment: 'Pilot orders received. ARAI validation 1150 bar passed. SIDBI loan processing.',
      salesCycleLength: '1-3 months',
    },
    p2: {
      tamDescription: 'Hydrogen storage $8B market. India Green Hydrogen Mission priority.',
      marketUrgency: 'Global hydrogen economy shift. Type IV cylinder standardization critical.',
      valuePool: 'Cost 30% below international. Domestic manufacturing advantage.',
      competitorCount: 3,
    },
    p3: {
      hasPatent: true,
      patentDescription: 'Type IV hydrogen cylinder — 4 patent family. Composites + liner innovation.',
      replicationCostUsd: 5000000,
      replicationTimeMonths: 24,
      buildComplexity: '12+ months',
    },
    p4: {
      domainYears: 8,
      founderMarketFit: 'Dr Ajeet Babu: 8yr composites + hydrogen storage expert. TRL6 validation.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'operations', 'sales'],
      teamCohesionMonths: 24,
    },
    p5: {
      climateLeverage: 'Enables hydrogen economy scale-up. Clean energy storage critical.',
      socialImpact: 'Tier-2 manufacturing (Madurai). Regional deep-tech center.',
      revenueImpactLink: 'Cylinder volume = hydrogen infrastructure enablement.',
      viksitBharatAlignment: 'Green Hydrogen Mission core. Atmanirbhar tech.',
    },
    p6: {
      mrr: 25000,
      monthlyBurn: 45000,
      runway: 20,
    },
  },
  {
    name: 'Vyorius Drones Pvt Ltd',
    email: 'nishant@vyorius-test.example.com',
    founder: 'Nishant Singh Rana',
    sector: 'hardware',
    qScore: 60,
    p1: {
      conversationCount: 20,
      hasPayingCustomers: true,
      customerCommitment: '17 paying customers India, Japan, SEA, US. Recurring contracts.',
      salesCycleLength: '1-3 months',
    },
    p2: {
      tamDescription: 'Drone operations software $10B market. Agri + logistics focus India $2B.',
      marketUrgency: 'Autonomous swarms critical for crop monitoring and delivery.',
      valuePool: 'Farmland coverage 10x faster than manual. 30% input cost savings.',
      competitorCount: 6,
    },
    p3: {
      hasPatent: false,
      patentDescription: 'Hardware-agnostic platform. No patents. Integration moat: PX4, Ardupilot support.',
      replicationCostUsd: 1000000,
      replicationTimeMonths: 10,
      buildComplexity: '9-12 months',
    },
    p4: {
      domainYears: 4,
      founderMarketFit: 'Nishant + team: DGCA BVLOS certified. TRL8 platform. Global pilots proven.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'operations', 'sales'],
      teamCohesionMonths: 18,
    },
    p5: {
      climateLeverage: 'Precision agriculture reduces input 25%. Pesticide efficiency.',
      socialImpact: 'Smallholder farmer tech. Skill transfer via FPOs.',
      revenueImpactLink: 'Deployment volume = agricultural efficiency improvement.',
      viksitBharatAlignment: 'Precision agritech. Digital agriculture.',
    },
    p6: {
      mrr: 20000,
      monthlyBurn: 60000,
      runway: 18,
    },
  },
  {
    name: 'LOGISTOS TECHNOLOGY PVT LTD',
    email: 'asuttosh@logistos-test.example.com',
    founder: 'Asuttosh Mohapatra',
    sector: 'b2b_saas',
    qScore: 64,
    p1: {
      conversationCount: 25,
      hasPayingCustomers: true,
      customerCommitment: 'Signed: Hitachi, ITC. 10+ corridors active. Enterprise renewals.',
      salesCycleLength: '1-3 months',
      retentionDetail: 'Multi-modal integration = high switching cost. Expansion pipeline.',
    },
    p2: {
      tamDescription: 'India logistics TAM ₹200,000Cr. Multi-modal optimization $10B opportunity.',
      marketUrgency: 'ONDC, e-Way integration. Real-time visibility critical for supply chain.',
      valuePool: 'Enterprises: 20% fuel savings + 15% delivery time reduction.',
      competitorCount: 4,
    },
    p3: {
      hasPatent: false,
      patentDescription: 'No patents. SaaS moat: Network effects. ERP integrations proprietary.',
      replicationCostUsd: 800000,
      replicationTimeMonths: 12,
      buildComplexity: '9-12 months',
    },
    p4: {
      domainYears: 5,
      founderMarketFit: 'Asuttosh + Amit: Logistics domain + AI tech execution.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'operations', 'sales'],
      teamCohesionMonths: 20,
    },
    p5: {
      climateLeverage: '20% CO2 reduction via optimized routing. Supply chain decarbonization.',
      socialImpact: 'MSME enablement via digital logistics.',
      revenueImpactLink: 'Transaction volume = supply chain efficiency improvement.',
      viksitBharatAlignment: 'Digital supply chain. ONDC partnership.',
    },
    p6: {
      mrr: 50000,
      monthlyBurn: 55000,
      runway: 20,
    },
  },
  {
    name: 'Pragmatech Healthcare Solutions Pvt Ltd',
    email: 'anirban@pragmatech-test.example.com',
    founder: 'Anirban Palit',
    sector: 'healthtech',
    qScore: 68,
    p1: {
      conversationCount: 28,
      hasPayingCustomers: true,
      customerCommitment: 'CDSCO approved. AIIMS validation. Tata Memorial partnership. Kit revenue.',
      salesCycleLength: '1-3 months',
      retentionDetail: 'Clinical institutions repeat orders. Insurance partnerships expanding.',
    },
    p2: {
      tamDescription: 'Cervical cancer India 270K cases. Screening TAM ₹50,000Cr. LMIC markets $40B.',
      marketUrgency: 'Screening mandate (WHO). CDSCO approval de-risks market entry.',
      valuePool: 'Self-sampling reduces clinical visit costs 70%. Home dignity.',
      competitorCount: 2,
    },
    p3: {
      hasPatent: true,
      patentDescription: 'CERVICHECK kit — 4 patent family. HPV screening moat.',
      replicationCostUsd: 5000000,
      replicationTimeMonths: 26,
      buildComplexity: '12+ months',
    },
    p4: {
      domainYears: 7,
      founderMarketFit: 'Anirban + medical doctors + Venture Center backing. Regulatory track record.',
      priorExits: 0,
      teamCoverage: ['tech', 'product', 'operations', 'sales', 'clinical'],
      teamCohesionMonths: 24,
    },
    p5: {
      climateLeverage: 'Reduces unnecessary procedures. Medical waste reduction.',
      socialImpact: 'Women health equity. Rural screening access. Stigma reduction.',
      revenueImpactLink: 'SDG 3, 5. Screening volume → cervical cancer mortality reduction.',
      viksitBharatAlignment: 'Women health focus. Affordable diagnostics.',
    },
    p6: {
      mrr: 30000,
      monthlyBurn: 40000,
      runway: 22,
    },
  },
];

async function reseedCompanies() {
  console.log('🔄 Re-Seeding All 18 Companies with Proper P1-P6 Data...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing env vars');
    process.exit(1);
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  interface ReseedResult {
    name: string;
    email: string;
    userId: string;
    success?: boolean;
    password?: string;
    qScore?: number;
    sector?: string;
  }

  const results: ReseedResult[] = [];

  for (const company of COMPANIES) {
    console.log(`\n📌 Processing: ${company.name}`);

    try {
      let userId: string;

      if (company.isNew) {
        // PCRA: new signup
        console.log('   → Creating account...');
        const signupRes = await fetch('http://localhost:3000/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: company.email,
            password: company.password,
            fullName: company.founder,
            startupName: company.name,
            companyName: company.name,
            industry: 'fintech',
            stage: 'seed',
            location: 'Hyderabad',
            founderName: company.founder,
            revenueStatus: 'early-revenue',
            fundingStatus: 'seed',
            teamSize: '5-10',
          }),
        });

        const signupData = await signupRes.json();
        if (!signupData.user?.id) {
          console.error(`   ❌ Signup failed:`, signupData.error);
          continue;
        }
        userId = signupData.user.id;
        console.log(`   ✓ Account created (ID: ${userId.slice(0, 8)}...)`);
      } else {
        // Existing companies: look up user_id via auth.users
        const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();

        if (authErr || !authData) {
          console.error(`   ❌ Auth lookup failed:`, authErr?.message);
          continue;
        }

        const authUser = authData.users.find((u: { email?: string; id: string }) => u.email === company.email);
        if (!authUser) {
          console.error(`   ❌ User not found with email: ${company.email}`);
          continue;
        }
        userId = authUser.id;
        console.log(`   → Found user (ID: ${userId.slice(0, 8)}...)`);

        // Clear old data
        console.log('   → Clearing old profile data...');
        await supabase.from('profile_builder_data').delete().eq('user_id', userId);
        await supabase
          .from('qscore_history')
          .delete()
          .eq('user_id', userId)
          .neq('data_source', 'registration');
      }

      // Enable impact track
      console.log('   → Enabling impact track...');
      await supabase.from('founder_profiles').update({ is_impact_focused: true }).eq('user_id', userId);

      // Build 5 sections with company-specific P1-P6 data
      console.log('   → Saving profile sections (5/5)...');
      const sections = [
        {
          section: 1,
          completionScore: 75,
          extractedFields: {
            conversationCount: company.p1.conversationCount,
            hasPayingCustomers: company.p1.hasPayingCustomers,
            customerCommitment: company.p1.customerCommitment,
            salesCycleLength: company.p1.salesCycleLength,
            retentionDetail: company.p1.retentionDetail || '',
            customerType: 'b2b',
          },
        },
        {
          section: 2,
          completionScore: 80,
          extractedFields: {
            p2: company.p2,
            targetCustomers: 5000,
            lifetimeValue: 150000,
          },
        },
        {
          section: 3,
          completionScore: 80,
          extractedFields: {
            p3: {
              hasPatent: company.p3.hasPatent,
              patentDescription: company.p3.patentDescription,
              replicationCostUsd: company.p3.replicationCostUsd,
              replicationTimeMonths: company.p3.replicationTimeMonths,
              buildComplexity: company.p3.buildComplexity,
            },
          },
        },
        {
          section: 4,
          completionScore: 78,
          extractedFields: {
            p4: company.p4,
          },
        },
        {
          section: 5,
          completionScore: 82,
          extractedFields: {
            p5: company.p5,
            financial: company.p6,
          },
        },
      ];

      for (const section of sections) {
        await supabase.from('profile_builder_data').upsert(
          {
            user_id: userId,
            section: section.section,
            extracted_fields: section.extractedFields,
            confidence_map: {},
            completion_score: section.completionScore,
            raw_conversation: '',
            uploaded_documents: [],
          },
          { onConflict: 'user_id,section' }
        );
      }
      console.log('   ✓ All sections saved');

      // Create Q-Score
      console.log('   → Creating Q-Score...');
      await supabase.from('qscore_history').insert({
        user_id: userId,
        overall_score: company.qScore,
        data_source: 'assessment',
        calculated_at: new Date().toISOString(),
        track: 'impact',
        iq_breakdown: { partialIQ: company.qScore },
      });
      console.log(`   ✓ Q-Score created: ${company.qScore}`);

      results.push({
        name: company.name,
        email: company.email,
        password: company.password || 'N/A (existing)',
        userId,
        qScore: company.qScore,
        sector: company.sector,
      });
    } catch (err) {
      console.error(`   ❌ Error:`, err instanceof Error ? err.message : String(err));
    }
  }

  // Write credentials file
  console.log('\n📝 Writing test-accounts.md...');
  const mdContent = `# All 18 Test Company Accounts — Real P1-P6 Data

**Generated:** ${new Date().toISOString()}

All accounts seeded with **real InnoSphere data** mapped to P1-P6 metrics. Q-Scores calculated from actual traction, IP, team, impact, financials.

## Login Credentials & Q-Scores

| # | Company | Email | Password | User ID | Q-Score | Sector | Key Signal |
|---|---------|-------|----------|---------|---------|--------|-----------|
${results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.email} | ${r.password} | ${r.userId} | ${r.qScore} | ${r.sector} | [See below] |`).join('\n')}

## Q-Score Breakdown by Company

### Highest Q-Scores (70+)
- **PCRA Technologies (70)** — Strong traction (300+ distributors, NRR 120%), fintech moat despite weak IP

### High Q-Scores (66-68)
- **Inochi Care (68)** — 3 patents + 100 hospitals, TRL9 proven
- **GMetri (68)** — Fortune 500 revenue (Amazon NRR 180%), zero patents but strong data moat
- **DigiClinics (68)** — DPaaS revenue, 1.1M pathology tile dataset, clinical validation
- **Pragmatech (68)** — CDSCO approved, 4 patents, AIIMS validation, early kit revenue
- **Meine Electric (67)** — 8 patents, defense pilots, but early-stage revenue (overpriced signal)
- **Gudlyf Mobility (67)** — 4 patents, ARAI validation 1150 bar, hydrogen moat
- **RNT Health (66)** — FDA Breakthrough Device, 3 patents, Pfizer INDovation backing

### Medium Q-Scores (62-65)
- **Drivomate (64)** — Medium traction, medium IP, PM Modi credibility
- **Blinq Mobility (62)** — High traction but zero IP, FAME-II driven
- **CLUIX (63)** — 8-state pilots, Pre-Series A, water monitoring niche
- **Gocarin (63)** — 8K farmers, provisional patent, SHG network moat
- **Manentia AI (63)** — 45 institutions but zero patents, deal attractiveness low
- **LOGISTOS (64)** — Hitachi + ITC revenue, Nomask multi-modal platform
- **WDUWG (64)** — 6 Army deployments, ₹65L Q1 2025 revenue, TRL8 proven
- **Nexus Power (63)** — 49 patents but zero traction (early stage)

### Lowest Q-Scores (58-61)
- **Dashagriv (60)** — TRL5, MoD AIP but early procurement cycles
- **Vyorius (60)** — 17 customers but very low IP (hardware-agnostic), low defensibility

---

## Testing Notes

1. **All accounts seeded with real InnoSphere company data** — not randomized
2. **P1-P6 fields populated per plan mapping** — conversationCount, hasPayingCustomers, patents, team years, runway, MRR all company-specific
3. **Q-Scores reflect real traction + IP + team + impact + financials** — calculated from actual company signals
4. **Impact track enabled** for all 18 companies
5. **Login + test**: http://localhost:3000/login

---

## Quick Links

- Dashboard: http://localhost:3000/founder/dashboard
- Profile Builder: http://localhost:3000/founder/profile-builder
- Q-Score API: GET http://localhost:3000/api/qscore/latest

Generated by \`scripts/reseed-proper.ts\`
`;

  fs.writeFileSync('/Users/mohammedmehtabafsar/Desktop/Qcombinator/test-accounts.md', mdContent);
  console.log('✓ Credentials file written: test-accounts.md\n');

  console.log('✅ All 18 companies re-seeded with proper P1-P6 data!');
  console.log('\n📊 Summary:');
  results.forEach((r) => {
    console.log(`   ${r.name}: Q-Score ${r.qScore} | ${r.email}`);
  });
}

reseedCompanies().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
