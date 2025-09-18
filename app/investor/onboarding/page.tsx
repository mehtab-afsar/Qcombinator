'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Shield,
  Building2,
  Target,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Upload,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  MapPin,
  Globe
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface FormData {
  // Personal Info
  firstName: string
  lastName: string
  email: string
  phone: string
  linkedin: string

  // Firm Information
  firmName: string
  firmType: string
  firmSize: string
  aum: string
  website: string
  location: string

  // Investment Profile
  checkSize: string[]
  stages: string[]
  sectors: string[]
  geography: string[]

  // Investment Thesis
  thesis: string
  dealFlow: string
  decisionProcess: string
  timeline: string
}

export default function InvestorOnboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedin: '',
    firmName: '',
    firmType: '',
    firmSize: '',
    aum: '',
    website: '',
    location: '',
    checkSize: [],
    stages: [],
    sectors: [],
    geography: [],
    thesis: '',
    dealFlow: '',
    decisionProcess: '',
    timeline: ''
  })
  const [isVerifying, setIsVerifying] = useState(false)
  const router = useRouter()

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleArrayValue = (field: keyof FormData, value: string) => {
    const currentArray = formData[field] as string[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]
    updateFormData(field, newArray)
  }

  const handleVerifyFirm = async () => {
    setIsVerifying(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsVerifying(false)
    setCurrentStep(2)
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      router.push('/investor/dashboard')
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
            i + 1 <= currentStep
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-500'
          }`}>
            {i + 1 <= currentStep ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
          </div>
          {i < totalSteps - 1 && (
            <div className={`w-8 h-0.5 mx-2 ${
              i + 1 < currentStep ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  const renderPersonalInfo = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">Welcome to Q Combinator</CardTitle>
        <p className="text-gray-600">Let's verify your investor credentials and get you started</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => updateFormData('firstName', e.target.value)}
              placeholder="John"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => updateFormData('lastName', e.target.value)}
              placeholder="Smith"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Work Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            placeholder="john@venturetech.com"
          />
        </div>

        <div>
          <Label htmlFor="linkedin">LinkedIn Profile</Label>
          <Input
            id="linkedin"
            value={formData.linkedin}
            onChange={(e) => updateFormData('linkedin', e.target.value)}
            placeholder="https://linkedin.com/in/johnsmith"
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <Shield className="w-4 h-4 inline mr-2" />
            We verify all investor accounts to maintain platform quality and prevent spam.
          </p>
        </div>

        <Button onClick={handleVerifyFirm} disabled={isVerifying} className="w-full">
          {isVerifying ? 'Verifying...' : 'Verify & Continue'}
        </Button>
      </CardContent>
    </Card>
  )

  const renderFirmInfo = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl">Firm Information</CardTitle>
        <p className="text-gray-600">Tell us about your investment firm</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="firmName">Firm Name</Label>
          <Input
            id="firmName"
            value={formData.firmName}
            onChange={(e) => updateFormData('firmName', e.target.value)}
            placeholder="Acme Ventures"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Firm Type</Label>
            <Select value={formData.firmType} onValueChange={(value) => updateFormData('firmType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vc">Venture Capital</SelectItem>
                <SelectItem value="pe">Private Equity</SelectItem>
                <SelectItem value="angel">Angel Group</SelectItem>
                <SelectItem value="family-office">Family Office</SelectItem>
                <SelectItem value="corporate">Corporate VC</SelectItem>
                <SelectItem value="accelerator">Accelerator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Firm Size</Label>
            <Select value={formData.firmSize} onValueChange={(value) => updateFormData('firmSize', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-5">1-5 people</SelectItem>
                <SelectItem value="6-20">6-20 people</SelectItem>
                <SelectItem value="21-50">21-50 people</SelectItem>
                <SelectItem value="50+">50+ people</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Assets Under Management</Label>
          <Select value={formData.aum} onValueChange={(value) => updateFormData('aum', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select AUM range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="<10m">Under $10M</SelectItem>
              <SelectItem value="10-50m">$10M - $50M</SelectItem>
              <SelectItem value="50-100m">$50M - $100M</SelectItem>
              <SelectItem value="100-500m">$100M - $500M</SelectItem>
              <SelectItem value="500m-1b">$500M - $1B</SelectItem>
              <SelectItem value=">1b">$1B+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="website">Firm Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => updateFormData('website', e.target.value)}
              placeholder="https://acmeventures.com"
            />
          </div>

          <div>
            <Label htmlFor="location">Primary Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => updateFormData('location', e.target.value)}
              placeholder="San Francisco, CA"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
          <Button onClick={handleNext} className="flex-1">
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderInvestmentProfile = () => {
    const checkSizes = ['$25K-$100K', '$100K-$500K', '$500K-$1M', '$1M-$5M', '$5M-$25M', '$25M+']
    const stages = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth']
    const sectors = ['AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'Marketplace', 'DeepTech', 'Consumer', 'Enterprise', 'Climate', 'Crypto/Web3', 'EdTech']
    const geographies = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Global']

    return (
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-purple-600" />
          </div>
          <CardTitle className="text-2xl">Investment Profile</CardTitle>
          <p className="text-gray-600">Define your investment criteria and preferences</p>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <Label className="text-base font-medium flex items-center mb-4">
              <DollarSign className="w-4 h-4 mr-2" />
              Typical Check Size
            </Label>
            <div className="flex flex-wrap gap-2">
              {checkSizes.map(size => (
                <Badge
                  key={size}
                  variant={formData.checkSize.includes(size) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayValue('checkSize', size)}
                >
                  {size}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-base font-medium flex items-center mb-4">
              <TrendingUp className="w-4 h-4 mr-2" />
              Investment Stages
            </Label>
            <div className="flex flex-wrap gap-2">
              {stages.map(stage => (
                <Badge
                  key={stage}
                  variant={formData.stages.includes(stage) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayValue('stages', stage)}
                >
                  {stage}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-base font-medium flex items-center mb-4">
              <Users className="w-4 h-4 mr-2" />
              Preferred Sectors
            </Label>
            <div className="flex flex-wrap gap-2">
              {sectors.map(sector => (
                <Badge
                  key={sector}
                  variant={formData.sectors.includes(sector) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayValue('sectors', sector)}
                >
                  {sector}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-base font-medium flex items-center mb-4">
              <Globe className="w-4 h-4 mr-2" />
              Geographic Focus
            </Label>
            <div className="flex flex-wrap gap-2">
              {geographies.map(geo => (
                <Badge
                  key={geo}
                  variant={formData.geography.includes(geo) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayValue('geography', geo)}
                >
                  {geo}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
            <Button onClick={handleNext} className="flex-1">
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderInvestmentThesis = () => (
    <Card className="max-w-3xl mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-orange-600" />
        </div>
        <CardTitle className="text-2xl">Investment Thesis & Process</CardTitle>
        <p className="text-gray-600">Help us understand your investment philosophy and decision-making process</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="thesis" className="text-base font-medium">
            Investment Thesis
          </Label>
          <p className="text-sm text-gray-600 mb-2">
            What types of companies and opportunities excite you? What's your core investment philosophy?
          </p>
          <Textarea
            id="thesis"
            rows={4}
            value={formData.thesis}
            onChange={(e) => updateFormData('thesis', e.target.value)}
            placeholder="We invest in early-stage B2B SaaS companies that are solving complex workflow problems for large enterprises. We particularly focus on AI-powered solutions that can demonstrate clear ROI and have strong network effects..."
          />
        </div>

        <div>
          <Label htmlFor="dealFlow" className="text-base font-medium">
            Deal Sourcing Strategy
          </Label>
          <p className="text-sm text-gray-600 mb-2">
            How do you typically discover and source new investment opportunities?
          </p>
          <Textarea
            id="dealFlow"
            rows={3}
            value={formData.dealFlow}
            onChange={(e) => updateFormData('dealFlow', e.target.value)}
            placeholder="We source deals primarily through our portfolio company referrals, university networks, and industry connections. We also work with select accelerators and maintain relationships with other VCs for co-investment opportunities..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="decisionProcess" className="text-base font-medium">
              Decision Process
            </Label>
            <p className="text-sm text-gray-600 mb-2">
              What's your typical investment decision timeline?
            </p>
            <Select value={formData.decisionProcess} onValueChange={(value) => updateFormData('decisionProcess', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select timeline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-2weeks">1-2 weeks</SelectItem>
                <SelectItem value="2-4weeks">2-4 weeks</SelectItem>
                <SelectItem value="1-2months">1-2 months</SelectItem>
                <SelectItem value="2-3months">2-3 months</SelectItem>
                <SelectItem value="3+months">3+ months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="timeline" className="text-base font-medium">
              Current Activity Level
            </Label>
            <p className="text-sm text-gray-600 mb-2">
              How many deals do you typically review monthly?
            </p>
            <Select value={formData.timeline} onValueChange={(value) => updateFormData('timeline', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select volume" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-5">1-5 deals</SelectItem>
                <SelectItem value="6-15">6-15 deals</SelectItem>
                <SelectItem value="16-30">16-30 deals</SelectItem>
                <SelectItem value="30+">30+ deals</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">🎯 AI-Powered Matching</h4>
          <p className="text-sm text-gray-600">
            Based on your preferences, our AI will surface the most relevant startups and provide compatibility scores.
            You'll receive personalized deal flow that matches your thesis and criteria.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
          <Button onClick={handleNext} className="flex-1">
            Complete Setup <CheckCircle2 className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Investor Onboarding</h1>
          <p className="text-gray-600">Complete your profile to start discovering high-potential startups</p>
          <Progress value={progress} className="max-w-md mx-auto mt-4" />
        </div>

        {renderStepIndicator()}

        {currentStep === 1 && renderPersonalInfo()}
        {currentStep === 2 && renderFirmInfo()}
        {currentStep === 3 && renderInvestmentProfile()}
        {currentStep === 4 && renderInvestmentThesis()}
      </div>
    </div>
  )
}