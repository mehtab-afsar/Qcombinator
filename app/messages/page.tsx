'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Star,
  Archive,
  Trash2,
  Filter,
  MessageCircle,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Building2,
  TrendingUp
} from 'lucide-react'

interface Message {
  id: string
  content: string
  timestamp: string
  sender: 'user' | 'other'
  type: 'text' | 'document' | 'meeting-request'
  attachments?: Array<{
    name: string
    type: string
    size: string
  }>
}

interface Conversation {
  id: string
  participant: {
    name: string
    title: string
    company: string
    avatar: string
    type: 'founder' | 'investor'
  }
  lastMessage: string
  timestamp: string
  unread: number
  status: 'active' | 'archived' | 'important'
  messages: Message[]
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    participant: {
      name: 'Sarah Chen',
      title: 'CEO & Co-founder',
      company: 'TechFlow AI',
      avatar: '/api/placeholder/40/40',
      type: 'founder'
    },
    lastMessage: 'Thanks for the interest! I\'d love to schedule a call to discuss our Series A round.',
    timestamp: '2 hours ago',
    unread: 2,
    status: 'important',
    messages: [
      {
        id: '1',
        content: 'Hi! I noticed your interest in TechFlow AI from our Q Combinator profile. I\'d love to connect and discuss our Series A fundraising round.',
        timestamp: '10:30 AM',
        sender: 'other',
        type: 'text'
      },
      {
        id: '2',
        content: 'Hello Sarah, thank you for reaching out. I\'ve reviewed your company profile and I\'m very impressed with your traction and team. I\'d be interested in learning more about your current funding round.',
        timestamp: '11:45 AM',
        sender: 'user',
        type: 'text'
      },
      {
        id: '3',
        content: 'That\'s great to hear! We\'re raising $5M for our Series A at a $25M pre-money valuation. Would you be available for a call this week?',
        timestamp: '2:15 PM',
        sender: 'other',
        type: 'text'
      },
      {
        id: '4',
        content: 'I\'d like to schedule a meeting to discuss this further. Here are my available times.',
        timestamp: '2:16 PM',
        sender: 'other',
        type: 'meeting-request'
      }
    ]
  },
  {
    id: '2',
    participant: {
      name: 'Dr. Michael Rodriguez',
      title: 'CEO',
      company: 'HealthSync',
      avatar: '/api/placeholder/40/40',
      type: 'founder'
    },
    lastMessage: 'I\'ve attached our updated pitch deck with the latest metrics.',
    timestamp: '1 day ago',
    unread: 0,
    status: 'active',
    messages: [
      {
        id: '1',
        content: 'Thank you for expressing interest in HealthSync. I\'ve attached our latest pitch deck.',
        timestamp: 'Yesterday 3:20 PM',
        sender: 'other',
        type: 'document',
        attachments: [
          {
            name: 'HealthSync_Pitch_Deck_Jan_2024.pdf',
            type: 'PDF',
            size: '8.2 MB'
          }
        ]
      }
    ]
  },
  {
    id: '3',
    participant: {
      name: 'Alex Thompson',
      title: 'CEO',
      company: 'GreenLogistics',
      avatar: '/api/placeholder/40/40',
      type: 'founder'
    },
    lastMessage: 'Looking forward to our call tomorrow at 2 PM.',
    timestamp: '2 days ago',
    unread: 0,
    status: 'active',
    messages: [
      {
        id: '1',
        content: 'Great meeting you at the virtual pitch event! As discussed, I\'m sending over our investor materials.',
        timestamp: '2 days ago 4:30 PM',
        sender: 'other',
        type: 'text'
      }
    ]
  }
]

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    mockConversations[0]
  )
  const [messageInput, setMessageInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'important' | 'archived'>('all')

  const filteredConversations = mockConversations.filter(conv => {
    if (filter === 'unread' && conv.unread === 0) return false
    if (filter === 'important' && conv.status !== 'important') return false
    if (filter === 'archived' && conv.status !== 'archived') return false
    if (searchTerm && !conv.participant.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !conv.participant.company.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: messageInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'user',
      type: 'text'
    }

    selectedConversation.messages.push(newMessage)
    setMessageInput('')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'important':
        return <Star className="w-4 h-4 text-yellow-500" />
      case 'archived':
        return <Archive className="w-4 h-4 text-gray-500" />
      default:
        return null
    }
  }

  const renderMessage = (message: Message) => {
    const isUser = message.sender === 'user'

    if (message.type === 'meeting-request') {
      return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Meeting Request</span>
            </div>
            <p className="text-sm mb-3">Available times this week:</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Wed, Jan 17 - 2:00 PM PST</span>
                <Button size="sm" variant={isUser ? "secondary" : "outline"} className="text-xs">
                  Accept
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span>Thu, Jan 18 - 10:00 AM PST</span>
                <Button size="sm" variant={isUser ? "secondary" : "outline"} className="text-xs">
                  Accept
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span>Fri, Jan 19 - 3:00 PM PST</span>
                <Button size="sm" variant={isUser ? "secondary" : "outline"} className="text-xs">
                  Accept
                </Button>
              </div>
            </div>
            <div className="text-xs mt-2 opacity-75">{message.timestamp}</div>
          </div>
        </div>
      )
    }

    if (message.type === 'document') {
      return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200'
          }`}>
            <p className="mb-3">{message.content}</p>
            {message.attachments?.map((attachment, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg mb-2">
                <Paperclip className="w-4 h-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{attachment.name}</div>
                  <div className="text-xs text-gray-500">{attachment.type} • {attachment.size}</div>
                </div>
                <Button size="sm" variant="ghost" className="text-xs">
                  Download
                </Button>
              </div>
            ))}
            <div className="text-xs mt-2 opacity-75">{message.timestamp}</div>
          </div>
        </div>
      )
    }

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-gray-200'
        }`}>
          <p>{message.content}</p>
          <div className="text-xs mt-1 opacity-75">{message.timestamp}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar - Conversations List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold mb-4">Messages</h1>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-2">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
            <Button
              variant={filter === 'important' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('important')}
            >
              Important
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => setSelectedConversation(conversation)}
            >
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.participant.avatar} />
                    <AvatarFallback>
                      {conversation.participant.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.participant.type === 'founder' ? (
                    <User className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 text-white rounded-full p-0.5" />
                  ) : (
                    <Building2 className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 text-white rounded-full p-0.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-sm truncate">
                        {conversation.participant.name}
                      </h3>
                      {getStatusIcon(conversation.status)}
                    </div>
                    <div className="flex items-center space-x-2">
                      {conversation.unread > 0 && (
                        <Badge variant="default" className="text-xs px-1.5 py-0.5 min-w-5 h-5">
                          {conversation.unread}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 mb-1">
                    {conversation.participant.title} at {conversation.participant.company}
                  </div>

                  <p className="text-sm text-gray-600 truncate">
                    {conversation.lastMessage}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConversation.participant.avatar} />
                    <AvatarFallback>
                      {selectedConversation.participant.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-medium">{selectedConversation.participant.name}</h2>
                    <p className="text-sm text-gray-600">
                      {selectedConversation.participant.title} at {selectedConversation.participant.company}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {selectedConversation.participant.type}
                  </Badge>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Company Quick Info */}
            <div className="bg-blue-50 border-b border-blue-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-sm">
                    <span className="font-medium">Q Score:</span>
                    <span className="text-blue-600 font-bold ml-1">847</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Stage:</span>
                    <span className="ml-1">Series A</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Seeking:</span>
                    <span className="ml-1">$5M</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Full Profile
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {selectedConversation.messages.map((message) => renderMessage(message))}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end space-x-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <Textarea
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="min-h-[40px] max-h-32 resize-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                </div>
                <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>Press Enter to send, Shift + Enter for new line</span>
                <div className="flex items-center space-x-2">
                  <span>AI-powered communication insights coming soon</span>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-600">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}