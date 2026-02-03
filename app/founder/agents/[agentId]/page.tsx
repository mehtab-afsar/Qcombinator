"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Save,
  TrendingUp,
  Sparkles,
  Download,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { getAgentById, getPillarColor } from "@/lib/mock-data/agents";
import { AgentMessage } from "@/app/types/edge-alpha";

export default function AgentChat() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  const agent = getAgentById(agentId);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationSaved, setConversationSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if agent not found
  useEffect(() => {
    if (!agent) {
      router.push('/founder/agents');
    }
  }, [agent, router]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!agent) {
    return null;
  }

  const colors = getPillarColor(agent.pillar);

  // Mock AI response generator
  const generateAgentResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // ICP-related responses
    if (lowerMessage.includes('icp') || lowerMessage.includes('ideal customer')) {
      return `Great question about defining your ICP! Here's a framework I recommend:\n\n**1. Demographic Criteria:**\n- Company size (# employees, revenue)\n- Industry/vertical\n- Geography\n- Technology stack\n\n**2. Psychographic Criteria:**\n- Pain points and challenges\n- Current solutions being used\n- Budget authority\n- Decision-making process\n\n**3. Behavioral Indicators:**\n- Online behavior (what content they consume)\n- Buying signals\n- Engagement patterns\n\nWould you like me to help you fill this out for your specific startup? Tell me more about your product and target market.`;
    }

    // GTM/Channel strategy
    if (lowerMessage.includes('channel') || lowerMessage.includes('acquisition') || lowerMessage.includes('gtm')) {
      return `Let's build your go-to-market strategy! Here's my recommended approach:\n\n**Phase 1: Channel Testing (Months 1-3)**\n- Test 3-4 channels simultaneously\n- Allocate small budget to each ($500-2000)\n- Measure: CAC, conversion rate, time to close\n\n**Top B2B SaaS Channels:**\n1. **Content Marketing** (SEO, blog)\n   - Best for: Educational products, high ACV\n   - Timeline: 6-12 months to see results\n\n2. **LinkedIn Outbound** (cold outreach)\n   - Best for: Enterprise sales, specific ICPs\n   - Timeline: 1-3 months to optimize\n\n3. **Product-Led Growth** (free trial/freemium)\n   - Best for: Low friction products, viral potential\n   - Timeline: 3-6 months to build funnel\n\n4. **Partnerships** (integration, referral)\n   - Best for: Complementary products\n   - Timeline: 3-6 months to establish\n\nWhich channel sounds most promising for your startup?`;
    }

    // Pricing strategy
    if (lowerMessage.includes('pric') || lowerMessage.includes('cost')) {
      return `Pricing is crucial for GTM success! Here's my framework:\n\n**Value-Based Pricing Steps:**\n\n1. **Calculate Your Costs**\n   - Cost to serve one customer (COGS)\n   - Target gross margin (70%+ for SaaS)\n\n2. **Quantify Customer Value**\n   - Time saved × hourly rate\n   - Revenue generated\n   - Cost reduced\n\n3. **Check Competitive Benchmarks**\n   - Research 3-5 competitors\n   - Position premium, at-market, or value\n\n4. **Test with Customers**\n   - "What budget do you have for this?"\n   - Present 3 tiers: Good, Better, Best\n   - Measure price sensitivity\n\n**Pro Tip:** Price 10-20% below perceived value for fast adoption, then increase as you add features and social proof.\n\nWhat's your current pricing model?`;
    }

    // Sales process
    if (lowerMessage.includes('sales') || lowerMessage.includes('demo') || lowerMessage.includes('close')) {
      return `Let me share a proven B2B SaaS sales process:\n\n**The 4-Step Sales Framework:**\n\n**Step 1: Discovery Call (30 min)**\n- Understand their current process\n- Identify pain points (3-5 specific ones)\n- Quantify impact ($, time, efficiency)\n- Qualify: Budget, Authority, Need, Timeline (BANT)\n\n**Step 2: Demo/Solution Presentation (45 min)**\n- Start with THEIR problems (not your features)\n- Show 3 key workflows that solve their pain\n- Use their data/examples if possible\n- End with clear next steps\n\n**Step 3: Proposal & Negotiation (async)**\n- Send within 24 hours\n- Include: Scope, pricing, timeline, success metrics\n- Build in urgency (limited-time offer, cohort deadline)\n\n**Step 4: Close & Onboard (1 week)**\n- Simple contract (no red tape)\n- Kick-off call within 48 hours\n- Quick win in first week\n\nWhat part of your sales process needs the most help right now?`;
    }

    // Financial modeling
    if (agent.id === 'sam' && (lowerMessage.includes('model') || lowerMessage.includes('financial'))) {
      return `Let's build your financial model! Here's what you need:\n\n**Essential Financial Components:**\n\n**1. Revenue Model**\n- Monthly recurring revenue (MRR)\n- Churn rate (target <5% monthly)\n- Expansion revenue\n- Contract values & payment terms\n\n**2. Unit Economics**\n- Customer Acquisition Cost (CAC)\n- Lifetime Value (LTV)\n- LTV:CAC ratio (target 3:1 minimum)\n- Payback period (target <12 months)\n\n**3. Operating Expenses**\n- Team costs (burn rate)\n- Marketing & sales\n- Infrastructure & tools\n- General & admin\n\n**4. Cash Flow & Runway**\n- Monthly burn\n- Runway (months)\n- Revenue milestones\n\nWant me to create a template spreadsheet for you?`;
    }

    // Default response
    return `Thanks for your question! ${agent.name} here. I specialize in ${agent.specialty.toLowerCase()}.\n\nI'd be happy to help you with that. Could you provide more context about:\n- Your current situation\n- What you've tried so far\n- What specific outcome you're looking for\n\nThis will help me give you more personalized advice!`;
  };

  // Send message handler with real Groq API
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessageContent = inputValue;

    // Add user message
    const userMessage: AgentMessage = {
      id: `msg-${Date.now()}`,
      agentId: agent.id,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date()
    };

    setMessages([...messages, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Call Groq API via our endpoint
      const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agent.id,
          message: userMessageContent,
          conversationHistory: messages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add agent response
      const agentResponse: AgentMessage = {
        id: `msg-${Date.now()}-agent`,
        agentId: agent.id,
        role: 'agent',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, agentResponse]);
    } catch (error) {
      console.error('Error getting agent response:', error);

      // Fallback response on error
      const fallbackResponse: AgentMessage = {
        id: `msg-${Date.now()}-agent`,
        agentId: agent.id,
        role: 'agent',
        content: generateAgentResponse(userMessageContent), // Use mock as fallback
        timestamp: new Date()
      };

      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  // Send suggested prompt
  const handleSuggestedPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  // Save conversation
  const handleSave = () => {
    setConversationSaved(true);
    setTimeout(() => setConversationSaved(false), 3000);
  };

  // Export conversation
  const handleExport = () => {
    const conversationText = messages
      .map(msg => `${msg.role === 'user' ? 'You' : agent.name}: ${msg.content}`)
      .join('\n\n');

    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agent.name}-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
    <div className="h-screen flex flex-col max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/founder/agents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agents
            </Button>
          </Link>

          <div className="flex items-center space-x-3">
            <div className={`h-12 w-12 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center font-bold text-xl`}>
              {agent.name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{agent.name}</h1>
              <p className="text-sm text-gray-600">{agent.specialty}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {conversationSaved ? 'Saved!' : 'Save Chat'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Suggested Prompts (shown when no messages) */}
        {messages.length === 0 && (
          <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="max-w-3xl mx-auto">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                Suggested Questions to Get Started
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agent.suggestedPrompts.slice(0, 6).map((prompt, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="text-left h-auto py-3 px-4 hover:bg-white hover:border-purple-300 text-sm"
                    onClick={() => handleSuggestedPrompt(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-3`}>
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-end space-x-2 max-w-5xl mx-auto">
            <Button variant="outline" size="icon" className="mb-1">
              <Paperclip className="h-4 w-4" />
            </Button>

            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Ask ${agent.name} anything about ${agent.specialty.toLowerCase()}...`}
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
              rows={2}
            />

            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="mb-1"
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>

          {/* Feedback Button */}
          {messages.length > 2 && (
            <div className="mt-3 text-center">
              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                <CheckCircle className="h-4 w-4 mr-2" />
                This improved my {agent.improvesScore === 'goToMarket' ? 'GTM' : agent.improvesScore} Score
                <TrendingUp className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tips Card */}
      <Card className="mt-4 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-gray-700">
            <strong className="text-blue-900">💡 Pro Tip:</strong> Be specific about your situation for better advice. You can attach documents using the paperclip icon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
