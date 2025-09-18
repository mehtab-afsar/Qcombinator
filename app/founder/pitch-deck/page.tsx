'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  FileText,
  Brain,
  Eye,
  Download,
  Share,
  CheckCircle,
  AlertTriangle,
  Star,
  Clock,
  Users,
  BarChart3,
  Target,
  Zap,
  Play,
  Edit,
  Trash2
} from 'lucide-react'

interface PitchDeck {
  id: string
  name: string
  uploadDate: string
  size: string
  status: 'analyzing' | 'ready' | 'needs_review'
  aiScore: number
  slides: number
  views: number
  feedback: {
    overall: string
    strengths: string[]
    improvements: string[]
    score: number
  }
}

export default function PitchDeck() {
  const [activeTab, setActiveTab] = useState('upload')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const mockDecks: PitchDeck[] = [
    {
      id: '1',
      name: 'TechFlow - Series A Pitch Deck v3.2',
      uploadDate: '2024-01-15',
      size: '12.4 MB',
      status: 'ready',
      aiScore: 8.7,
      slides: 14,
      views: 23,
      feedback: {
        overall: 'Strong pitch with clear value proposition and solid market analysis',
        strengths: ['Clear problem definition', 'Strong traction metrics', 'Compelling team section'],
        improvements: ['Add more competitive analysis', 'Include customer testimonials', 'Clarify revenue model'],
        score: 8.7
      }
    },
    {
      id: '2',
      name: 'TechFlow - Demo Day Presentation',
      uploadDate: '2024-01-10',
      size: '8.9 MB',
      status: 'needs_review',
      aiScore: 7.2,
      slides: 10,
      views: 45,
      feedback: {
        overall: 'Good foundation but needs refinement in financial projections',
        strengths: ['Engaging opening', 'Clear product demo', 'Good use of visuals'],
        improvements: ['Add financial projections', 'Include go-to-market strategy', 'Strengthen conclusion'],
        score: 7.2
      }
    }
  ]

  const handleFileUpload = () => {
    setIsUploading(true)
    setUploadProgress(0)

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const renderUploadSection = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
        <CardContent className="p-12 text-center">
          <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Your Pitch Deck</h3>
          <p className="text-gray-600 mb-6">
            Get instant AI feedback and optimization suggestions for your presentation
          </p>

          {isUploading ? (
            <div className="space-y-4">
              <Progress value={uploadProgress} className="w-64 mx-auto" />
              <p className="text-sm text-gray-600">Analyzing your pitch deck...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Button onClick={handleFileUpload} size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Upload className="w-5 h-5 mr-2" />
                Choose File to Upload
              </Button>
              <p className="text-sm text-gray-500">
                Supports PDF, PPTX, KEY files up to 50MB
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Brain className="h-10 w-10 text-purple-600 mx-auto mb-4" />
            <h4 className="font-semibold mb-2">AI Analysis</h4>
            <p className="text-sm text-gray-600">
              Get detailed feedback on content, structure, and storytelling
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-10 w-10 text-blue-600 mx-auto mb-4" />
            <h4 className="font-semibold mb-2">Performance Scoring</h4>
            <p className="text-sm text-gray-600">
              Receive scores for each section and overall presentation quality
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-10 w-10 text-green-600 mx-auto mb-4" />
            <h4 className="font-semibold mb-2">Optimization Tips</h4>
            <p className="text-sm text-gray-600">
              Get actionable suggestions to improve your pitch effectiveness
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderMyDecks = () => (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Pitch Decks</h2>
        <Button onClick={() => setActiveTab('upload')}>
          <Upload className="w-4 h-4 mr-2" />
          Upload New Deck
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {mockDecks.map((deck) => (
          <Card key={deck.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{deck.name}</h3>
                    <p className="text-sm text-gray-500">
                      {deck.slides} slides • {deck.size} • {deck.uploadDate}
                    </p>
                  </div>
                </div>
                <Badge
                  className={
                    deck.status === 'ready' ? 'bg-green-100 text-green-800' :
                    deck.status === 'analyzing' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }
                >
                  {deck.status === 'ready' ? 'Ready' :
                   deck.status === 'analyzing' ? 'Analyzing' : 'Needs Review'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{deck.aiScore}/10</div>
                  <div className="text-xs text-gray-500">AI Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{deck.views}</div>
                  <div className="text-xs text-gray-500">Views</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{deck.slides}</div>
                  <div className="text-xs text-gray-500">Slides</div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">AI Feedback</h4>
                <p className="text-sm text-gray-600 mb-3">{deck.feedback.overall}</p>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-medium text-green-700 mb-1">Strengths</div>
                    <ul className="space-y-1">
                      {deck.feedback.strengths.slice(0, 2).map((strength, i) => (
                        <li key={i} className="text-green-600">• {strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-orange-700 mb-1">Improvements</div>
                    <ul className="space-y-1">
                      {deck.feedback.improvements.slice(0, 2).map((improvement, i) => (
                        <li key={i} className="text-orange-600">• {improvement}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex space-x-2">
                  <Button size="sm" variant="ghost">
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Share className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Brain className="w-4 h-4 mr-1" />
                    Re-analyze
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockDecks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pitch decks yet</h3>
            <p className="text-gray-600 mb-6">Upload your first pitch deck to get started with AI analysis</p>
            <Button onClick={() => setActiveTab('upload')}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First Deck
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderAnalytics = () => (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Pitch Analytics</h2>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">68</div>
            <div className="text-gray-600">Total Views</div>
            <div className="text-sm text-green-600 mt-1">+12 this week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">8.2</div>
            <div className="text-gray-600">Avg AI Score</div>
            <div className="text-sm text-green-600 mt-1">+0.5 improvement</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">2</div>
            <div className="text-gray-600">Active Decks</div>
            <div className="text-sm text-gray-500 mt-1">Ready to share</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Detailed Analytics Coming Soon</h3>
            <p>Track viewer engagement, slide performance, and feedback trends</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pitch Deck Manager</h1>
        <p className="text-gray-600 text-lg">Upload, analyze, and optimize your pitch presentations</p>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="decks">
              <FileText className="w-4 h-4 mr-2" />
              My Decks ({mockDecks.length})
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="upload">
          {renderUploadSection()}
        </TabsContent>

        <TabsContent value="decks">
          {renderMyDecks()}
        </TabsContent>

        <TabsContent value="analytics">
          {renderAnalytics()}
        </TabsContent>
      </Tabs>
    </div>
  )
}