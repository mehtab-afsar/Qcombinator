'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { type PitchAnalysis } from "@/lib/groq"
import {
  Brain,
  CheckCircle,
  AlertTriangle,
  FileText,
  Video,
  Mic,
  Loader2
} from 'lucide-react'

export default function PitchAnalyzer() {
  const [analysisStep, setAnalysisStep] = useState<'upload' | 'analyzing' | 'results'>('upload')
  const [pitchText, setPitchText] = useState('')
  const [analysis, setAnalysis] = useState<PitchAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyzePitch = async () => {
    if (!pitchText.trim()) return

    setAnalysisStep('analyzing')
    setIsAnalyzing(true)
    setError(null)

    try {
      // Call Groq API for real analysis
      const result = await fetch('/api/analyze-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitchText: pitchText.trim() })
      })

      if (!result.ok) {
        throw new Error('Failed to analyze pitch')
      }

      const analysisResult = await result.json()
      setAnalysis(analysisResult)
      setAnalysisStep('results')
    } catch (err) {
      console.error('Analysis error:', err)
      setError('Failed to analyze pitch. Please try again.')
      // No fallback - show error state
      setAnalysisStep('results')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const renderUploadStep = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Pitch Analyzer</h1>
        <p className="text-gray-600 text-lg">Get instant feedback on your pitch with advanced AI analysis</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Text Pitch</h3>
            <p className="text-sm text-gray-600">Paste your written pitch</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Video className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Video Pitch</h3>
            <p className="text-sm text-gray-600">Upload a video presentation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Mic className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Audio Pitch</h3>
            <p className="text-sm text-gray-600">Record or upload audio</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter Your Pitch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your elevator pitch or startup description here. Include your problem statement, solution, market opportunity, and traction..."
            value={pitchText}
            onChange={(e) => setPitchText(e.target.value)}
            rows={8}
            className="resize-none"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{pitchText.length} characters</span>
            <Button
              onClick={handleAnalyzePitch}
              disabled={pitchText.length < 100}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              <Brain className="w-4 h-4 mr-2" />
              Analyze Pitch
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderAnalyzing = () => (
    <div className="max-w-2xl mx-auto text-center space-y-6">
      <div className="h-20 w-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
        <Loader2 className="h-10 w-10 text-white animate-spin" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Analyzing Your Pitch with AI</h2>
      <p className="text-gray-600">Groq AI is evaluating your pitch across multiple dimensions</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <AlertTriangle className="w-5 h-5 inline-block mr-2" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Processing pitch content</span>
          {isAnalyzing ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">AI market analysis</span>
          {isAnalyzing ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Generating recommendations</span>
          {isAnalyzing ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
        </div>
      </div>
    </div>
  )

  const renderResults = () => {
    if (error && !analysis) {
      return (
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Analysis Failed</h2>
          <p className="text-gray-600">{error}</p>
          <Button variant="outline" onClick={() => setAnalysisStep('upload')}>
            Try Again
          </Button>
        </div>
      )
    }

    if (!analysis) {
      return (
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <Brain className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">No Analysis Available</h2>
          <p className="text-gray-600">Please try again or check your connection</p>
          <Button variant="outline" onClick={() => setAnalysisStep('upload')}>
            Back to Upload
          </Button>
        </div>
      )
    }

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Pitch Analysis Results</h1>
          <p className="text-gray-600">Here&apos;s how your pitch performed across key areas</p>
        </div>

        {/* Overall Score */}
        <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{analysis.overallScore}/10</div>
            <div className="text-lg font-semibold text-gray-900 mb-2">Overall Pitch Score</div>
            <div className="text-green-700">AI Analysis Complete</div>
          </CardContent>
        </Card>

      {/* Detailed Scores */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Clarity & Structure</h3>
              <div className="text-xl font-bold text-blue-600">{analysis.clarity}</div>
            </div>
            <Progress value={analysis.clarity * 10} className="mb-2" />
            <p className="text-sm text-gray-600">Your pitch is well-structured and easy to follow</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Market Opportunity</h3>
              <div className="text-xl font-bold text-blue-600">{analysis.market}</div>
            </div>
            <Progress value={analysis.market * 10} className="mb-2" />
            <p className="text-sm text-gray-600">Market size and opportunity clearly defined</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Traction & Validation</h3>
              <div className="text-xl font-bold text-blue-600">{analysis.traction}</div>
            </div>
            <Progress value={analysis.traction * 10} className="mb-2" />
            <p className="text-sm text-gray-600">Strong evidence of market validation</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Team Strength</h3>
              <div className="text-xl font-bold text-blue-600">{analysis.team}</div>
            </div>
            <Progress value={analysis.team * 10} className="mb-2" />
            <p className="text-sm text-gray-600">Team credentials well presented</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Financial Projections</h3>
              <div className="text-xl font-bold text-blue-600">{analysis.financials}</div>
            </div>
            <Progress value={analysis.financials * 10} className="mb-2" />
            <p className="text-sm text-gray-600">Financial model needs more detail</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-blue-600" />
            AI Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{analysis.summary}</p>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-700">
              <CheckCircle className="w-5 h-5 mr-2" />
              Identified Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.strengths.map((strength, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span className="text-sm text-gray-700">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-orange-700">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Improvement Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <span className="text-sm text-gray-700">{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center space-x-4">
        <Button variant="outline" onClick={() => setAnalysisStep('upload')}>
          Analyze Another Pitch
        </Button>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
          Save & Share Results
        </Button>
      </div>
    </div>
  )
}

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {analysisStep === 'upload' && renderUploadStep()}
      {analysisStep === 'analyzing' && renderAnalyzing()}
      {analysisStep === 'results' && renderResults()}
    </div>
  )
}