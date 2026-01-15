"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Users,
  Star,
  Brain,
  Target,
  Search,
  Filter,
  ChevronDown,
  MapPin,
  DollarSign,
  BarChart3,
  Mail,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Menu,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const fadeInLeft = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 }
};

const fadeInRight = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};


// Sample investor data - Extended with more realistic data
const sampleInvestors = [
  {
    name: "Sequoia Capital",
    type: "VC firm",
    logo: "S",
    logoColor: "from-red-500 to-orange-500",
    countries: ["USA", "India", "China"],
    checkSize: "$1M to $50M",
    stages: ["Seed", "Series A", "Series B"],
    industries: ["SaaS", "AI/ML", "Fintech"],
    openRate: 95,
    verified: true,
    portfolio: ["Stripe", "Airbnb", "DoorDash"]
  },
  {
    name: "Andreessen Horowitz",
    type: "VC firm",
    logo: "a16z",
    logoColor: "from-gray-800 to-gray-600",
    countries: ["USA", "UK"],
    checkSize: "$500k to $100M",
    stages: ["Seed", "Series A", "Growth"],
    industries: ["Enterprise", "Crypto", "AI"],
    openRate: 88,
    verified: true,
    portfolio: ["Coinbase", "GitHub", "Instacart"]
  },
  {
    name: "Y Combinator",
    type: "Accelerator",
    logo: "YC",
    logoColor: "from-orange-500 to-red-500",
    countries: ["USA", "Global"],
    checkSize: "$500k",
    stages: ["Pre-seed", "Seed"],
    industries: ["All sectors"],
    openRate: 100,
    verified: true,
    portfolio: ["Stripe", "Airbnb", "Dropbox"]
  },
  {
    name: "Accel",
    type: "VC firm",
    logo: "A",
    logoColor: "from-blue-600 to-blue-400",
    countries: ["USA", "India", "Europe"],
    checkSize: "$1M to $30M",
    stages: ["Seed", "Series A"],
    industries: ["SaaS", "Consumer", "Fintech"],
    openRate: 92,
    verified: true,
    portfolio: ["Slack", "Spotify", "Dropbox"]
  },
  {
    name: "Index Ventures",
    type: "VC firm",
    logo: "IX",
    logoColor: "from-teal-500 to-green-500",
    countries: ["UK", "USA", "Europe"],
    checkSize: "$2M to $50M",
    stages: ["Series A", "Series B"],
    industries: ["Marketplace", "Fintech", "Gaming"],
    openRate: 85,
    verified: true,
    portfolio: ["Discord", "Figma", "Notion"]
  },
  {
    name: "Lightspeed Venture",
    type: "VC firm",
    logo: "LS",
    logoColor: "from-yellow-500 to-amber-500",
    countries: ["USA", "India", "Israel"],
    checkSize: "$500k to $25M",
    stages: ["Seed", "Series A"],
    industries: ["Enterprise", "Consumer", "Crypto"],
    openRate: 78,
    verified: true,
    portfolio: ["Snap", "Affirm", "Epic Games"]
  },
  {
    name: "Greylock Partners",
    type: "VC firm",
    logo: "GL",
    logoColor: "from-slate-600 to-slate-400",
    countries: ["USA"],
    checkSize: "$1M to $50M",
    stages: ["Seed", "Series A", "Series B"],
    industries: ["Enterprise", "Consumer", "AI"],
    openRate: 82,
    verified: true,
    portfolio: ["LinkedIn", "Discord", "Figma"]
  },
  {
    name: "Benchmark",
    type: "VC firm",
    logo: "BM",
    logoColor: "from-emerald-600 to-emerald-400",
    countries: ["USA"],
    checkSize: "$5M to $50M",
    stages: ["Series A", "Series B"],
    industries: ["Marketplace", "Consumer", "Enterprise"],
    openRate: 75,
    verified: true,
    portfolio: ["Uber", "Twitter", "Snapchat"]
  }
];

// Testimonials data
const testimonials = [
  {
    name: "Sarah Chen",
    role: "Founder, TechFlow",
    image: "SC",
    text: "Edge Alpha completely transformed our fundraising. We connected with the perfect investors in just 2 weeks. The AI matching is incredibly accurate.",
    platform: "twitter"
  },
  {
    name: "Marcus Johnson",
    role: "CEO, DataPipe",
    image: "MJ",
    text: "The Q Score gave us insights we never had before. Investors take us more seriously now. Raised our seed round 3x faster than expected!",
    platform: "twitter"
  },
  {
    name: "Elena Rodriguez",
    role: "Partner, Vertex Capital",
    image: "ER",
    text: "As an investor, Edge Alpha saves me hours every week. The pre-vetted deals with Q Scores mean I focus only on the best opportunities.",
    platform: "twitter"
  },
  {
    name: "David Park",
    role: "Founder, CloudStack",
    image: "DP",
    text: "We found our lead investor through Edge Alpha. The platform matched us with funds that truly understood our market. Game changer!",
    platform: "twitter"
  },
  {
    name: "Amanda Foster",
    role: "GP, Horizon Ventures",
    image: "AF",
    text: "More than half my deal flow now comes from Edge Alpha. The quality of founders on this platform is exceptional.",
    platform: "twitter"
  },
  {
    name: "James Liu",
    role: "Founder, AIBotics",
    image: "JL",
    text: "The behavioral analysis feature helped us understand what investors really look for. Closed our Series A in record time!",
    platform: "twitter"
  }
];

// Feature tabs data
const featureTabs = [
  {
    id: "investor-list",
    label: "Investor List",
    title: "Find the perfect investors for you",
    description: "Browse 500+ verified investors by check size, thesis preferences, and 10+ advanced filters",
    cta: "Start for free"
  },
  {
    id: "q-score",
    label: "Q Score",
    title: "Understand your funding readiness",
    description: "Get your proprietary Q Score that measures team strength, market opportunity, and investor appeal",
    cta: "Calculate my score"
  },
  {
    id: "matching",
    label: "AI Matching",
    title: "Thesis-aligned recommendations",
    description: "Our AI analyzes your startup profile and matches you with investors whose thesis aligns perfectly",
    cta: "See my matches"
  },
  {
    id: "analytics",
    label: "Analytics",
    title: "Track your fundraising progress",
    description: "Monitor investor engagement, track conversations, and optimize your outreach strategy",
    cta: "View demo"
  }
];

// Resources dropdown items
const resourcesMenu = [
  { label: "Blog", href: "#", icon: "📚" },
  { label: "Guides", href: "#", icon: "📖" },
  { label: "Podcast", href: "#", icon: "🎙" },
  { label: "Newsletter", href: "#", icon: "💌" },
  { label: "Masterclass", href: "#", icon: "🤓" },
  { label: "Wall of Love", href: "#", icon: "❤️" },
];

// Filter options
const countryOptions = ["USA", "UK", "India", "Germany", "France", "China", "Singapore", "Canada", "Australia", "Israel"];
const stageOptions = ["Pre-seed", "Seed", "Series A", "Series B", "Series C", "Growth"];
const roundSizeOptions = ["< $500k", "$500k - $1M", "$1M - $5M", "$5M - $10M", "$10M - $50M", "$50M+"];

export default function LandingPage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("investor-list");
  const [searchQuery, setSearchQuery] = useState("");
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [countryFilterOpen, setCountryFilterOpen] = useState(false);
  const [stageFilterOpen, setStageFilterOpen] = useState(false);
  const [roundFilterOpen, setRoundFilterOpen] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);

  // Refs for scroll animations
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const testimonialsRef = useRef(null);
  const tabsRef = useRef(null);

  const heroInView = useInView(heroRef, { once: true, amount: 0.3 });

  // Scroll detection for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleFounderAction = (action: 'evaluate' | 'score') => {
    if (action === 'evaluate') {
      router.push('/founder/onboarding');
    } else {
      router.push('/founder/onboarding?focus=score');
    }
  };

  const handleInvestorAction = () => {
    router.push('/investor/onboarding');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Navigation */}
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-lg"
            : "bg-white/80 backdrop-blur-sm"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              className="flex items-center space-x-3 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              onClick={() => router.push('/')}
            >
              <div className="relative">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <span className="text-white font-black text-[9px] tracking-tighter">EDGE</span>
                </div>
                <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-black text-gray-900 tracking-tight">Edge Alpha</span>
                <div className="text-[10px] text-blue-600 font-semibold tracking-wide">AI-POWERED FUNDING</div>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </a>
              <a href="#investors" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                For Investors
              </a>
              <div
                className="relative"
                onMouseEnter={() => setResourcesOpen(true)}
                onMouseLeave={() => setResourcesOpen(false)}
              >
                <button className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Resources
                  <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {resourcesOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                    >
                      {resourcesMenu.map((item) => (
                        <a
                          key={item.label}
                          href={item.href}
                          className="flex items-center px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                        >
                          <span className="mr-3">{item.icon}</span>
                          {item.label}
                        </a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Button
                onClick={() => handleFounderAction('evaluate')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6"
              >
                Start
              </Button>
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-gray-100 shadow-lg"
            >
              <div className="px-4 py-6 space-y-1">
                <a
                  href="#pricing"
                  className="flex items-center py-3 px-4 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <DollarSign className="h-5 w-5 mr-3 text-gray-400" />
                  Pricing
                </a>
                <a
                  href="#investors"
                  className="flex items-center py-3 px-4 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Users className="h-5 w-5 mr-3 text-gray-400" />
                  For Investors
                </a>
                <div className="py-2">
                  <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Resources</p>
                  <div className="grid grid-cols-2 gap-1">
                    {resourcesMenu.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        className="flex items-center py-2 px-4 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="mr-2">{item.icon}</span>
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <Button
                    onClick={() => {
                      handleFounderAction('evaluate');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6 text-lg font-semibold"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section */}
      <section ref={heroRef} className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Social Proof Avatars */}
          <motion.div
            className="flex justify-center items-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-gray-100">
              <div className="flex -space-x-3">
                {[
                  { gradient: "from-blue-500 to-cyan-400", letter: "J" },
                  { gradient: "from-purple-500 to-pink-400", letter: "S" },
                  { gradient: "from-orange-500 to-yellow-400", letter: "M" },
                  { gradient: "from-green-500 to-emerald-400", letter: "A" },
                  { gradient: "from-red-500 to-rose-400", letter: "K" },
                ].map((avatar, i) => (
                  <motion.div
                    key={i}
                    className={`h-9 w-9 rounded-full bg-gradient-to-br ${avatar.gradient} border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold ring-2 ring-white`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
                  >
                    {avatar.letter}
                  </motion.div>
                ))}
              </div>
              <motion.div
                className="ml-4 flex items-center"
                initial={{ opacity: 0 }}
                animate={heroInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-2" />
                </div>
                <span className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">10,000+</span> founders
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            className="text-center mb-8"
            variants={staggerContainer}
            initial="initial"
            animate={heroInView ? "animate" : "initial"}
          >
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-gray-900 leading-[1.1] mb-6"
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
            >
              <motion.span
                className="block"
                variants={fadeInUp}
                transition={{ delay: 0.1 }}
              >
                Get Your Startup{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Funded
                </span>
              </motion.span>
              <motion.span
                className="block"
                variants={fadeInUp}
                transition={{ delay: 0.2 }}
              >
                by{" "}
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  500+ Investors
                </span>
              </motion.span>
            </motion.h1>

            <motion.p
              className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8"
              variants={fadeInUp}
              transition={{ delay: 0.3 }}
            >
              Find investors, reach out, and get replies - powered by AI
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-wrap justify-center gap-4"
              variants={fadeInUp}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={() => handleFounderAction('evaluate')}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-6 text-lg shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all"
              >
                Sign up free
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-blue-600 hover:text-blue-700 font-semibold px-8 py-6 text-lg"
                onClick={() => document.getElementById('search-module')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Try it first
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Search Module Section */}
      <section id="search-module" className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Search Bar */}
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="SaaS, fintech, AI, climate tech..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>

                {/* Filter Buttons */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap scrollbar-hide">
                  {/* Countries Filter */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setCountryFilterOpen(!countryFilterOpen);
                        setStageFilterOpen(false);
                        setRoundFilterOpen(false);
                      }}
                      className={`flex items-center px-4 py-3 border rounded-xl transition-colors text-sm ${
                        selectedCountries.length > 0
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {selectedCountries.length > 0 ? `${selectedCountries.length} selected` : "Countries"}
                      <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${countryFilterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {countryFilterOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 max-h-64 overflow-y-auto"
                        >
                          {countryOptions.map((country) => (
                            <label
                              key={country}
                              className="flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCountries.includes(country)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCountries([...selectedCountries, country]);
                                  } else {
                                    setSelectedCountries(selectedCountries.filter(c => c !== country));
                                  }
                                }}
                                className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              {country}
                            </label>
                          ))}
                          {selectedCountries.length > 0 && (
                            <button
                              onClick={() => setSelectedCountries([])}
                              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"
                            >
                              Clear all
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Stages Filter */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setStageFilterOpen(!stageFilterOpen);
                        setCountryFilterOpen(false);
                        setRoundFilterOpen(false);
                      }}
                      className={`flex items-center px-4 py-3 border rounded-xl transition-colors text-sm ${
                        selectedStages.length > 0
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {selectedStages.length > 0 ? `${selectedStages.length} selected` : "Stages"}
                      <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${stageFilterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {stageFilterOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                        >
                          {stageOptions.map((stage) => (
                            <label
                              key={stage}
                              className="flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedStages.includes(stage)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStages([...selectedStages, stage]);
                                  } else {
                                    setSelectedStages(selectedStages.filter(s => s !== stage));
                                  }
                                }}
                                className="mr-3 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              {stage}
                            </label>
                          ))}
                          {selectedStages.length > 0 && (
                            <button
                              onClick={() => setSelectedStages([])}
                              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"
                            >
                              Clear all
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Round Size Filter */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setRoundFilterOpen(!roundFilterOpen);
                        setCountryFilterOpen(false);
                        setStageFilterOpen(false);
                      }}
                      className={`flex items-center px-4 py-3 border rounded-xl transition-colors text-sm ${
                        selectedRound
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      {selectedRound || "Round size"}
                      <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${roundFilterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {roundFilterOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                        >
                          {roundSizeOptions.map((size) => (
                            <button
                              key={size}
                              onClick={() => {
                                setSelectedRound(selectedRound === size ? null : size);
                                setRoundFilterOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                                selectedRound === size ? "text-green-700 bg-green-50" : "text-gray-600"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                          {selectedRound && (
                            <button
                              onClick={() => {
                                setSelectedRound(null);
                                setRoundFilterOpen(false);
                              }}
                              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"
                            >
                              Clear
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button className="p-3 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                    <Filter className="h-4 w-4 text-gray-600" />
                  </button>
                </div>

                <Button className="bg-gray-900 hover:bg-gray-800 text-white px-6">
                  Search
                </Button>
              </div>
            </div>

            {/* Results Preview */}
            <div className="px-6 py-2 bg-gray-50 text-sm text-gray-600 flex items-center justify-between">
              <span><span className="font-semibold text-gray-900">500+</span> investors</span>
              <div className="flex items-center gap-4">
                <button className="hover:text-gray-900 transition-colors">Settings</button>
                <button className="hover:text-gray-900 transition-colors">Export</button>
              </div>
            </div>

            {/* Investor Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Investor</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Geography</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Check Size</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stages</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Match Rate</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleInvestors.map((investor, index) => (
                    <motion.tr
                      key={investor.name}
                      className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors cursor-pointer"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${investor.logoColor} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                            {investor.logo}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{investor.name}</span>
                              {investor.verified && (
                                <CheckCircle className="h-4 w-4 text-blue-500" />
                              )}
                            </div>
                            <span className="text-sm text-gray-500">{investor.type}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1">
                          {investor.countries.slice(0, 2).map((country) => (
                            <span key={country} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {country}
                            </span>
                          ))}
                          {investor.countries.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              +{investor.countries.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {investor.checkSize}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1">
                          {investor.stages.slice(0, 2).map((stage) => (
                            <span key={stage} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              {stage}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${investor.openRate >= 90 ? 'bg-green-500' : investor.openRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                          <span className="font-semibold text-gray-900">{investor.openRate}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Button
                          size="sm"
                          className="bg-gray-900 hover:bg-gray-800 text-white"
                          onClick={() => handleFounderAction('evaluate')}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Connect
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* View More */}
            <div className="p-4 text-center border-t border-gray-100">
              <Button
                variant="ghost"
                className="text-blue-600 hover:text-blue-700"
                onClick={() => handleFounderAction('evaluate')}
              >
                See all 500+ investors
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Media/Press Logos */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <motion.p
            className="text-center text-sm text-gray-500 mb-8 uppercase tracking-wider font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Trusted by founders featured in
          </motion.p>
          <motion.div
            className="flex flex-wrap justify-center items-center gap-10 sm:gap-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* TechCrunch */}
            <motion.div
              className="opacity-40 hover:opacity-70 transition-opacity cursor-default"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.4 }}
              whileHover={{ opacity: 0.7 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
            >
              <svg className="h-6" viewBox="0 0 200 28" fill="currentColor">
                <text x="0" y="22" className="text-xl font-bold" style={{ fontFamily: 'system-ui' }}>TechCrunch</text>
              </svg>
            </motion.div>
            {/* Forbes */}
            <motion.div
              className="opacity-40 hover:opacity-70 transition-opacity cursor-default"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.4 }}
              whileHover={{ opacity: 0.7 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <svg className="h-7" viewBox="0 0 100 28" fill="currentColor">
                <text x="0" y="22" className="text-xl font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>Forbes</text>
              </svg>
            </motion.div>
            {/* Bloomberg */}
            <motion.div
              className="opacity-40 hover:opacity-70 transition-opacity cursor-default"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.4 }}
              whileHover={{ opacity: 0.7 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <svg className="h-6" viewBox="0 0 150 28" fill="currentColor">
                <text x="0" y="22" className="text-xl font-bold" style={{ fontFamily: 'system-ui' }}>Bloomberg</text>
              </svg>
            </motion.div>
            {/* The Verge */}
            <motion.div
              className="opacity-40 hover:opacity-70 transition-opacity cursor-default"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.4 }}
              whileHover={{ opacity: 0.7 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <svg className="h-6" viewBox="0 0 120 28" fill="currentColor">
                <text x="0" y="22" className="text-xl font-bold" style={{ fontFamily: 'system-ui' }}>The Verge</text>
              </svg>
            </motion.div>
            {/* Wired */}
            <motion.div
              className="opacity-40 hover:opacity-70 transition-opacity cursor-default"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.4 }}
              whileHover={{ opacity: 0.7 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <svg className="h-6" viewBox="0 0 80 28" fill="currentColor">
                <text x="0" y="22" className="text-xl font-bold" style={{ fontFamily: 'system-ui' }}>WIRED</text>
              </svg>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 3-Step Feature Section */}
      <section ref={featuresRef} className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Raise funds like it&apos;s 2034
          </motion.h2>

          {/* Step 1 */}
          <motion.div
            className="grid lg:grid-cols-2 gap-12 items-center mb-24"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div
              variants={fadeInLeft}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
                <span className="text-blue-600">1.</span> Reach out
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Filter 500+ investors by any criteria. Reach out in seconds with AI-powered introductions and personalized messaging.
              </p>
              <button
                className="text-blue-600 font-medium hover:underline"
                onClick={() => handleFounderAction('evaluate')}
              >
                Message investors today →
              </button>
            </motion.div>

            <motion.div
              className="relative h-80 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl overflow-hidden"
              variants={fadeInRight}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Animated visualization */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="absolute top-1/2 left-1/4 -translate-y-1/2"
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold rounded-full shadow-lg">
                    You
                  </div>
                </motion.div>

                {/* Connection lines and investor nodes */}
                {[
                  { top: "20%", left: "60%", delay: 0.6, name: "Jason" },
                  { top: "50%", left: "70%", delay: 0.8, name: "Sarah" },
                  { top: "75%", left: "55%", delay: 1.0, name: "Michael" }
                ].map((investor, index) => (
                  <motion.div
                    key={investor.name}
                    className="absolute"
                    style={{ top: investor.top, left: investor.left }}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: investor.delay }}
                  >
                    <div className="flex flex-col items-center">
                      <Mail className="h-6 w-6 text-blue-500 mb-1" />
                      <span className="px-2 py-1 bg-white text-xs font-medium rounded shadow-sm">
                        Hey {investor.name}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            className="grid lg:grid-cols-2 gap-12 items-center mb-24"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div
              className="relative h-80 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl overflow-hidden order-2 lg:order-1"
              variants={fadeInLeft}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {/* Animated visualization */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="absolute top-1/2 left-1/4 -translate-y-1/2"
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold rounded-full shadow-lg">
                    You
                  </div>
                </motion.div>

                {/* Response indicators */}
                {[
                  { top: "25%", left: "60%", delay: 0.6, status: "interested", icon: ThumbsUp },
                  { top: "50%", left: "70%", delay: 0.8, status: "declined", icon: ThumbsDown },
                  { top: "75%", left: "55%", delay: 1.0, status: "interested", icon: ThumbsUp }
                ].map((response, index) => (
                  <motion.div
                    key={index}
                    className="absolute"
                    style={{ top: response.top, left: response.left }}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: response.delay }}
                  >
                    <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-md ${
                      response.status === "interested"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-900 text-white"
                    }`}>
                      <response.icon className={`h-4 w-4 ${response.status === "interested" ? "text-green-400" : "text-red-400"}`} />
                      {response.status === "interested" ? "Interested" : "Declined"}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="order-1 lg:order-2"
              variants={fadeInRight}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
                <span className="text-green-600">2.</span> Get replies
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Edge Alpha automatically tracks responses and books meetings in your calendar. Watch as your pipeline fills up on its own.
              </p>
              <button
                className="text-blue-600 font-medium hover:underline"
                onClick={() => handleFounderAction('evaluate')}
              >
                Book meetings effortlessly →
              </button>
            </motion.div>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            className="grid lg:grid-cols-2 gap-12 items-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div
              variants={fadeInLeft}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
                <span className="text-purple-600">3.</span> Close faster
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Secure your lead investors and watch more investors reach out directly to fill your round. Our AI matches you with the perfect co-investors.
              </p>
              <button
                className="text-blue-600 font-medium hover:underline"
                onClick={() => handleFounderAction('evaluate')}
              >
                Turbocharge your raise →
              </button>
            </motion.div>

            <motion.div
              className="relative h-80 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl overflow-hidden"
              variants={fadeInRight}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Animated visualization */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="absolute top-1/2 left-1/4 -translate-y-1/2"
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold rounded-full shadow-lg">
                    You
                  </div>
                </motion.div>

                {/* Investment amounts */}
                {[
                  { top: "15%", left: "50%", delay: 0.5, amount: "$200k" },
                  { top: "30%", left: "65%", delay: 0.6, amount: "$150k" },
                  { top: "45%", left: "75%", delay: 0.7, amount: "$100k" },
                  { top: "55%", left: "60%", delay: 0.8, amount: "$75k" },
                  { top: "70%", left: "70%", delay: 0.9, amount: "$50k" },
                  { top: "80%", left: "55%", delay: 1.0, amount: "$125k" }
                ].map((investment, index) => (
                  <motion.div
                    key={index}
                    className="absolute"
                    style={{ top: investment.top, left: investment.left }}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: investment.delay }}
                  >
                    <div className="px-3 py-1.5 bg-gray-900 text-white text-sm font-semibold rounded-full shadow-md">
                      {investment.amount}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section ref={testimonialsRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Founders & investors{" "}
            <span className="text-blue-600">love</span>{" "}
            Edge Alpha
          </motion.h2>
          <motion.p
            className="text-center text-gray-600 mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Join thousands of successful fundraises
          </motion.p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20, rotate: index % 2 === 0 ? -2 : 2 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ y: -4 }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.image}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {testimonial.text.split("Edge Alpha").map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && <span className="text-blue-600 font-medium">Edge Alpha</span>}
                    </span>
                  ))}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Button variant="ghost" className="text-blue-600">
              More testimonials on our Wall of Love
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Tabbed Features Section */}
      <section ref={tabsRef} className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            All-in-one suite for startup founders
          </motion.h2>

          {/* Tab Navigation */}
          <motion.div
            className="flex flex-wrap justify-center gap-2 mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {featureTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-full font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {featureTabs.map((tab) => (
              tab.id === activeTab && (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="grid lg:grid-cols-2 gap-12 items-center"
                >
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
                      {tab.title}
                    </h3>
                    <p className="text-lg text-gray-600 mb-8">
                      {tab.description}
                    </p>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                      onClick={() => handleFounderAction('evaluate')}
                    >
                      {tab.cta}
                    </Button>
                  </div>

                  <div className="relative h-80 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl overflow-hidden">
                    {/* Placeholder for feature visualization */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          {tab.id === "investor-list" && <Users className="h-10 w-10 text-white" />}
                          {tab.id === "q-score" && <Brain className="h-10 w-10 text-white" />}
                          {tab.id === "matching" && <Target className="h-10 w-10 text-white" />}
                          {tab.id === "analytics" && <BarChart3 className="h-10 w-10 text-white" />}
                        </div>
                        <p className="text-gray-500 text-sm">Interactive demo</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* For Investors Section */}
      <section id="investors" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-600 to-pink-600">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center text-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-black mb-6">For Investors</h2>
            <p className="text-xl text-purple-100 mb-12 max-w-2xl mx-auto">
              Discover high-potential startups through AI-powered deal flow intelligence
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 gap-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="space-y-6">
              {[
                "Pre-vetted deals with Q Scores",
                "Thesis-aligned recommendations",
                "Automated due diligence reports",
                "Competitive intelligence alerts"
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  className="flex items-center gap-3 text-white"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className="h-2 w-2 bg-white rounded-full"></div>
                  <span className="text-lg">{feature}</span>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  size="lg"
                  className="mt-8 bg-white text-purple-600 hover:bg-gray-100 font-semibold shadow-lg"
                  onClick={handleInvestorAction}
                >
                  Start Finding Deals
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </motion.div>
            </div>

            <div className="space-y-4">
              {/* Deal preview cards */}
              {[
                { name: "NeuralTech", score: 891, category: "AI/ML", stage: "Series A", match: 94 },
                { name: "CloudScale", score: 847, category: "DevTools", stage: "Seed", match: 91 }
              ].map((deal, index) => (
                <motion.div
                  key={deal.name}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{deal.name}</span>
                    <span className="px-2 py-1 bg-white/20 rounded-full text-sm text-white">
                      Q: {deal.score}
                    </span>
                  </div>
                  <p className="text-sm text-purple-200">
                    {deal.category} • {deal.stage} • {deal.match}% thesis match
                  </p>
                </motion.div>
              ))}
              <p className="text-center text-purple-200 text-sm">
                + 127 more matches this week
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-600">Start free, upgrade when you&apos;re ready</p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            {/* Free Plan */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Free</h3>
              <p className="text-gray-600 mb-6">Perfect for getting started</p>
              <div className="text-4xl font-black text-gray-900 mb-6">$0</div>
              <ul className="space-y-3 mb-8">
                {["Browse 500+ investors", "Basic Q Score", "5 investor connections/month"].map((feature) => (
                  <li key={feature} className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleFounderAction('evaluate')}
              >
                Get started
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
                MOST POPULAR
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-blue-100 mb-6">For serious fundraisers</p>
              <div className="text-4xl font-black mb-6">$49<span className="text-lg font-normal">/mo</span></div>
              <ul className="space-y-3 mb-8">
                {[
                  "Everything in Free",
                  "Full Q Score analysis",
                  "Unlimited connections",
                  "AI-powered introductions",
                  "Priority support"
                ].map((feature) => (
                  <li key={feature} className="flex items-center text-sm text-blue-100">
                    <CheckCircle className="h-4 w-4 text-white mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => handleFounderAction('evaluate')}
              >
                Start free trial
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600 mb-6">For accelerators & VCs</p>
              <div className="text-4xl font-black text-gray-900 mb-6">Custom</div>
              <ul className="space-y-3 mb-8">
                {[
                  "Everything in Pro",
                  "Custom integrations",
                  "Dedicated success manager",
                  "SLA guarantees"
                ].map((feature) => (
                  <li key={feature} className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full"
              >
                Contact sales
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {[
              { value: "$2.3B+", label: "Funded via Platform" },
              { value: "10,000+", label: "Successful Matches" },
              { value: "500+", label: "Active Investors" },
              { value: "95%", label: "Match Accuracy" }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-2xl sm:text-3xl font-black text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="flex items-center justify-center space-x-4 text-xs text-gray-400 mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <span>Secure</span>
            <span>•</span>
            <span>Private</span>
            <span>•</span>
            <span>AI-Powered</span>
            <span>•</span>
            <span>YC Backed</span>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            className="text-3xl sm:text-4xl font-black text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Ready to get funded?
          </motion.h2>
          <motion.p
            className="text-xl text-blue-100 mb-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Join 10,000+ founders who&apos;ve raised with Edge Alpha
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-12 py-6 text-lg shadow-lg"
              onClick={() => handleFounderAction('evaluate')}
            >
              Get started for free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-[7px]">EDGE</span>
                </div>
                <span className="text-white font-bold">Edge Alpha</span>
              </div>
              <p className="text-sm">The AI-powered platform connecting founders with the right investors.</p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Investor List</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Q Score</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AI Matching</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Analytics</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Guides</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Podcast</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Newsletter</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2024 Edge Alpha. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
