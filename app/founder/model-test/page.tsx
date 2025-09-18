'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Brain,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Rocket,
  BarChart3,
  Lightbulb
} from 'lucide-react'

interface ModelResult {
  modelName: string
  response: string
  responseTime: number
  error?: string
}

export default function ModelTest() {
  const [prompt, setPrompt] = useState('')
  const [results, setResults] = useState<ModelResult[]>([])
  const [isTestingModels, setIsTestingModels] = useState(false)
  const [quickEval, setQuickEval] = useState<{
    score: number
    verdict: string
    keyInsights: string[]
  } | null>(null)

  const handleTestModels = async () => {
    if (!prompt.trim()) return

    setIsTestingModels(true)
    setResults([])

    try {
      const response = await fetch('/api/test-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      })

      if (!response.ok) throw new Error('Failed to test models')

      const data = await response.json()
      setResults(data.results)
    } catch (error) {
      console.error('Model test error:', error)
    } finally {
      setIsTestingModels(false)
    }
  }

  const handleQuickEval = async () => {
    if (!prompt.trim()) return

    try {
      const response = await fetch('/api/quick-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: prompt.trim() })
      })

      if (!response.ok) throw new Error('Failed to evaluate')

      const evaluation = await response.json()
      setQuickEval(evaluation)
    } catch (error) {
      console.error('Quick eval error:', error)
    }
  }

  const getSamplePrompts = () => [
    "Analyze the future of AI in healthcare and provide 3 key predictions.",
    "What are the biggest challenges facing fintech startups in 2024?",
    "Evaluate this startup idea: AI-powered personal finance coach for millennials.",
    "Compare the pros and cons of remote work vs hybrid work models.",
    "What makes a successful B2B SaaS product in today's market?"
  ]

  const getSpeedBadge = (time: number) => {
    if (time < 1000) return <Badge className="bg-green-500">Ultra Fast</Badge>
    if (time < 2000) return <Badge className="bg-blue-500">Fast</Badge>
    if (time < 4000) return <Badge className="bg-yellow-500">Medium</Badge>
    return <Badge className="bg-red-500">Slow</Badge>
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Groq Model Testing Lab</h1>
          <p className="text-gray-600 text-lg">Compare different AI models with the same prompt</p>
        </div>

        {/* Available Models Info */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Rocket className="w-5 h-5 mr-2" />
              Available Groq Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <Zap className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <div className="font-semibold text-sm">Llama-3.1-8B-Instant</div>
                <div className="text-xs text-gray-500">Ultra Fast</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <Clock className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <div className="font-semibold text-sm">Llama-3-8B</div>
                <div className="text-xs text-gray-500">Fast & Reliable</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <Brain className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                <div className="font-semibold text-sm">Llama-3-70B</div>
                <div className="text-xs text-gray-500">High Quality</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <BarChart3 className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                <div className="font-semibold text-sm">Mixtral-8x7B</div>
                <div className="text-xs text-gray-500">Analytical</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Test Your Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Textarea
                placeholder="Enter your prompt to test across different models..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-500">{prompt.length} characters</span>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleQuickEval}
                    disabled={!prompt.trim()}
                  >
                    <Lightbulb className="w-4 h-4 mr-1" />
                    Quick Eval
                  </Button>
                  <Button
                    onClick={handleTestModels}
                    disabled={!prompt.trim() || isTestingModels}
                    className="bg-gradient-to-r from-purple-600 to-blue-600"
                  >
                    {isTestingModels ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Test All Models
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Sample Prompts */}
            <div>
              <h4 className="font-medium mb-2 text-sm">Sample Prompts:</h4>
              <div className="flex flex-wrap gap-2">
                {getSamplePrompts().map((sample, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(sample)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-left"
                  >
                    {sample.length > 50 ? sample.substring(0, 50) + '...' : sample}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Evaluation Result */}
        {quickEval && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <Zap className="w-5 h-5 mr-2" />
                Quick Evaluation (Llama-3.1-8B-Instant)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{quickEval.score}/10</div>
                  <div className="text-sm text-gray-600">Score</div>
                </div>
                <div className="md:col-span-2">
                  <div className="font-medium mb-2">Verdict:</div>
                  <p className="text-gray-700 mb-3">{quickEval.verdict}</p>
                  <div className="font-medium mb-1">Key Insights:</div>
                  <ul className="space-y-1">
                    {quickEval.keyInsights.map((insight, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Model Comparison Results */}
        {results.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-6">
            {results.map((result, index) => (
              <Card key={index} className={result.error ? 'border-red-200' : 'border-green-200'}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      {result.error ? (
                        <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                      ) : (
                        <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                      )}
                      {result.modelName}
                    </span>
                    {!result.error && (
                      <div className="flex items-center space-x-2">
                        {getSpeedBadge(result.responseTime)}
                        <span className="text-sm text-gray-500">{result.responseTime}ms</span>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.error ? (
                    <div className="text-red-600 bg-red-50 p-3 rounded">
                      <strong>Error:</strong> {result.error}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap">{result.response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Loading State */}
        {isTestingModels && (
          <div className="text-center py-12">
            <div className="inline-flex items-center space-x-2 text-blue-600">
              <Clock className="w-5 h-5 animate-spin" />
              <span>Testing models... This may take a few moments</span>
            </div>
            <div className="mt-4 max-w-md mx-auto">
              <Progress value={33} className="mb-2" />
              <p className="text-sm text-gray-500">Comparing responses across 4 different models</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}