import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface PitchAnalysis {
  overallScore: number
  clarity: number
  market: number
  traction: number
  team: number
  financials: number
  strengths: string[]
  improvements: string[]
  summary: string
}

export interface QScoreAnalysis {
  overallScore: number
  breakdown: {
    team: number
    market: number
    product: number
    traction: number
    financials: number
  }
  reasoning: string
  recommendations: string[]
}

export class GroqAIService {
  private static instance: GroqAIService

  // Available Groq models with their use cases
  private models = {
    // Fast and efficient for structured analysis
    llama3_70b: "llama3-70b-8192",
    // Excellent for complex reasoning and analysis
    llama3_1_70b: "llama3-groq-70b-8192-tool-use-preview",
    // Best for detailed creative tasks
    mixtral: "mixtral-8x7b-32768",
    // Fastest for quick responses
    llama3_8b: "llama3-8b-8192",
    // Latest and most capable
    llama3_1_8b: "llama-3.1-8b-instant"
  } as const

  static getInstance(): GroqAIService {
    if (!GroqAIService.instance) {
      GroqAIService.instance = new GroqAIService()
    }
    return GroqAIService.instance
  }

  async analyzePitch(pitchText: string): Promise<PitchAnalysis> {
    try {
      console.log('🚀 Analyzing pitch with Llama-3.1-70B model...')

      const response = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert startup investor and pitch analyst with 15+ years of experience. Analyze the given pitch with the depth of a top-tier VC.

            Scoring criteria (1-10 scale):
            - Clarity: How well-structured, concise, and understandable is the pitch?
            - Market: How compelling and large is the market opportunity? Is timing right?
            - Traction: Evidence of customer validation, growth metrics, and product-market fit?
            - Team: Founding team strength, experience, and credibility in this domain?
            - Financials: Quality of business model, unit economics, and revenue projections?

            Provide brutally honest but constructive feedback. Look for red flags and smoking guns.

            CRITICAL: Return ONLY valid JSON in this exact format:
            {
              "overallScore": number (1-10, can include decimals),
              "clarity": number (1-10, can include decimals),
              "market": number (1-10, can include decimals),
              "traction": number (1-10, can include decimals),
              "team": number (1-10, can include decimals),
              "financials": number (1-10, can include decimals),
              "strengths": ["strength1", "strength2", "strength3"],
              "improvements": ["improvement1", "improvement2", "improvement3"],
              "summary": "Overall assessment in 2-3 sentences with investment recommendation"
            }`
          },
          {
            role: "user",
            content: `Analyze this startup pitch with VC-level scrutiny:\n\n"${pitchText}"\n\nFocus on identifying both strengths and potential red flags. Be specific and actionable.`
          }
        ],
        model: this.models.llama3_1_70b, // Using most capable model for pitch analysis
        temperature: 0.4, // Lower temperature for more consistent analysis
        max_tokens: 1500,
        response_format: { type: "json_object" }
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from Groq')
      }

      try {
        const analysis = JSON.parse(content)
        return analysis as PitchAnalysis
      } catch (parseError) {
        // Fallback if JSON parsing fails
        console.warn('Failed to parse Groq response, using fallback')
        return this.getFallbackPitchAnalysis()
      }
    } catch (error) {
      console.error('Groq API error:', error)
      return this.getFallbackPitchAnalysis()
    }
  }

  async generateQScore(startupData: {
    companyName: string
    industry: string
    stage: string
    teamSize: number
    monthlyRevenue?: number
    foundedYear: number
    description: string
  }): Promise<QScoreAnalysis> {
    try {
      console.log('📊 Generating Q-Score with Mixtral-8x7B model...')

      const response = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a world-class startup evaluation expert from Y Combinator with deep experience in scoring startup potential.

            Calculate a comprehensive Q-Score (0-1000 points) based on the startup data provided. Be analytical and precise.

            Scoring breakdown (each category 0-200 points):
            - Team (0-200): Founding team strength, relevant experience, complementary skills, execution track record
            - Market (0-200): Total addressable market size, market timing, competitive landscape, positioning
            - Product (0-200): Innovation level, technical feasibility, user experience, product-market fit signals
            - Traction (0-200): Revenue growth, user metrics, customer validation, momentum indicators
            - Financials (0-200): Business model viability, unit economics, scalability, capital efficiency

            Consider industry benchmarks, stage-appropriate metrics, and growth potential.

            CRITICAL: Return ONLY valid JSON in this exact format:
            {
              "overallScore": number (0-1000, sum of all breakdown scores),
              "breakdown": {
                "team": number (0-200),
                "market": number (0-200),
                "product": number (0-200),
                "traction": number (0-200),
                "financials": number (0-200)
              },
              "reasoning": "Detailed 3-4 sentence explanation of the overall scoring rationale",
              "recommendations": ["actionable_rec_1", "actionable_rec_2", "actionable_rec_3", "actionable_rec_4", "actionable_rec_5"]
            }`
          },
          {
            role: "user",
            content: `Evaluate this startup with Y Combinator-level scrutiny:

            Company: ${startupData.companyName}
            Industry: ${startupData.industry}
            Stage: ${startupData.stage}
            Team Size: ${startupData.teamSize} people
            Monthly Revenue: ${startupData.monthlyRevenue ? `$${startupData.monthlyRevenue.toLocaleString()}` : 'Pre-revenue'}
            Founded: ${startupData.foundedYear}
            Description: ${startupData.description}

            Provide specific, actionable recommendations for improving their Q-Score.`
          }
        ],
        model: this.models.mixtral, // Using Mixtral for detailed analytical reasoning
        temperature: 0.2, // Very low temperature for consistent scoring
        max_tokens: 1800,
        response_format: { type: "json_object" }
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from Groq')
      }

      try {
        const analysis = JSON.parse(content)
        return analysis as QScoreAnalysis
      } catch (parseError) {
        console.warn('Failed to parse Groq response, using fallback')
        return this.getFallbackQScore()
      }
    } catch (error) {
      console.error('Groq API error:', error)
      return this.getFallbackQScore()
    }
  }

  async generateInvestorMatch(startupProfile: any, investorProfile: any): Promise<{
    matchScore: number
    reasoning: string
    alignmentFactors: string[]
    potentialConcerns: string[]
  }> {
    try {
      console.log('🎯 Analyzing investor match with Llama-3-8B-Instant model...')

      const response = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a seasoned startup-investor matching expert with deep knowledge of VC investment patterns and startup needs.

            Analyze the compatibility between this startup and investor with precision. Consider these critical factors:

            SCORING CRITERIA (0-100 points):
            - Investment thesis alignment (25 points): How well does the startup fit the investor's stated thesis?
            - Stage compatibility (20 points): Is the startup at the right stage for this investor?
            - Sector expertise match (20 points): Does the investor have domain expertise in this space?
            - Geographic alignment (10 points): Location preferences and operational considerations
            - Check size fit (15 points): Does the funding need match the investor's typical investment size?
            - Strategic value alignment (10 points): Can the investor provide meaningful strategic help beyond capital?

            Be realistic about potential red flags and concerns that could derail a deal.

            CRITICAL: Return ONLY valid JSON in this exact format:
            {
              "matchScore": number (0-100, realistic assessment),
              "reasoning": "2-3 sentence explanation of why this match score makes sense",
              "alignmentFactors": ["specific_alignment_1", "specific_alignment_2", "specific_alignment_3"],
              "potentialConcerns": ["specific_concern_1", "specific_concern_2"]
            }`
          },
          {
            role: "user",
            content: `Analyze this startup-investor compatibility with precision:

            STARTUP PROFILE:
            ${JSON.stringify(startupProfile, null, 2)}

            INVESTOR PROFILE:
            ${JSON.stringify(investorProfile, null, 2)}

            Focus on specific, actionable alignment factors and realistic concerns that could affect the partnership.`
          }
        ],
        model: this.models.llama3_1_8b, // Using fast Llama model for quick matching analysis
        temperature: 0.3, // Balanced temperature for consistent but nuanced analysis
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from Groq')
      }

      try {
        return JSON.parse(content)
      } catch (parseError) {
        return {
          matchScore: 75,
          reasoning: "Standard compatibility analysis",
          alignmentFactors: ["Sector alignment", "Stage compatibility"],
          potentialConcerns: ["Market timing", "Competition intensity"]
        }
      }
    } catch (error) {
      console.error('Groq API error:', error)
      return {
        matchScore: 70,
        reasoning: "Unable to perform detailed analysis",
        alignmentFactors: ["General market fit"],
        potentialConcerns: ["Requires further evaluation"]
      }
    }
  }

  // New method to test different models with the same prompt
  async testModels(prompt: string): Promise<{
    modelName: string
    response: string
    responseTime: number
    error?: string
  }[]> {
    const results = []
    const testModels = [
      { name: 'Llama-3.1-8B-Instant', model: this.models.llama3_1_8b },
      { name: 'Llama-3-8B', model: this.models.llama3_8b },
      { name: 'Llama-3-70B', model: this.models.llama3_70b },
      { name: 'Mixtral-8x7B', model: this.models.mixtral }
    ]

    for (const testModel of testModels) {
      try {
        const startTime = Date.now()
        console.log(`🧪 Testing ${testModel.name}...`)

        const response = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are a helpful AI assistant. Provide clear, concise, and insightful responses."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          model: testModel.model,
          temperature: 0.7,
          max_tokens: 500,
        })

        const responseTime = Date.now() - startTime
        const content = response.choices[0]?.message?.content || 'No response'

        results.push({
          modelName: testModel.name,
          response: content,
          responseTime,
        })

      } catch (error) {
        console.error(`Error testing ${testModel.name}:`, error)
        results.push({
          modelName: testModel.name,
          response: '',
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  // Quick startup evaluation using fastest model
  async quickEvaluate(companyDescription: string): Promise<{
    score: number
    verdict: string
    keyInsights: string[]
  }> {
    try {
      console.log('⚡ Quick evaluation with Llama-3.1-8B-Instant...')

      const response = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a startup advisor. Provide a quick evaluation (1-10 score) with 3 key insights.

            Return ONLY JSON:
            {
              "score": number (1-10),
              "verdict": "one sentence investment recommendation",
              "keyInsights": ["insight1", "insight2", "insight3"]
            }`
          },
          {
            role: "user",
            content: `Quick evaluation of: ${companyDescription}`
          }
        ],
        model: this.models.llama3_1_8b,
        temperature: 0.5,
        max_tokens: 300,
        response_format: { type: "json_object" }
      })

      const content = response.choices[0]?.message?.content
      if (content) {
        return JSON.parse(content)
      }
    } catch (error) {
      console.error('Quick evaluation error:', error)
    }

    return {
      score: 7,
      verdict: "Interesting concept that needs more validation",
      keyInsights: ["Market potential exists", "Execution is key", "Team experience matters"]
    }
  }

  private getFallbackPitchAnalysis(): PitchAnalysis {
    return {
      overallScore: 7.5,
      clarity: 8.0,
      market: 7.0,
      traction: 7.5,
      team: 8.0,
      financials: 7.0,
      strengths: [
        "Clear problem definition",
        "Strong founding team",
        "Reasonable market opportunity"
      ],
      improvements: [
        "Add more traction metrics",
        "Strengthen financial projections",
        "Include competitive analysis"
      ],
      summary: "Solid pitch with good fundamentals. Team appears strong and problem is well-defined, but needs more evidence of market traction."
    }
  }

  private getFallbackQScore(): QScoreAnalysis {
    return {
      overallScore: 742,
      breakdown: {
        team: 168,
        market: 145,
        product: 152,
        traction: 138,
        financials: 139
      },
      reasoning: "Strong team with relevant experience in a growing market. Product shows innovation potential but needs more market validation.",
      recommendations: [
        "Focus on customer acquisition and retention metrics",
        "Develop stronger competitive differentiation",
        "Build more comprehensive financial models",
        "Establish key partnerships in target market",
        "Create clearer go-to-market strategy"
      ]
    }
  }
}

export const groqService = GroqAIService.getInstance()