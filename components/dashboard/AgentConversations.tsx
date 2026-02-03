import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

interface AgentConversation {
  id: string;
  agentId: string;
  agentName: string;
  agentSpecialty: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
}

interface AgentConversationsProps {
  conversations?: AgentConversation[];
}

export function AgentConversations({ conversations = [] }: AgentConversationsProps) {
  // Mock data if no conversations provided
  const displayConversations: AgentConversation[] = conversations.length > 0
    ? conversations
    : [
        {
          id: 'conv-1',
          agentId: 'jocelyn',
          agentName: 'Jocelyn',
          agentSpecialty: 'Go-to-Market Strategy',
          lastMessage: 'Here\'s your 90-day GTM plan. Focus on these 3 channels first...',
          timestamp: '2 hours ago',
          unread: false
        },
        {
          id: 'conv-2',
          agentId: 'sam',
          agentName: 'Sam',
          agentSpecialty: 'Financial Modeling',
          lastMessage: 'Your unit economics look good! Let\'s work on extending runway...',
          timestamp: '1 day ago',
          unread: false
        }
      ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Recent Agent Conversations</h2>
        <Link href="/founder/agents">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      {displayConversations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-sm text-gray-600 mb-4">
              Start chatting with AI agents to get personalized advice
            </p>
            <Link href="/founder/agents">
              <Button>
                Browse AI Agents
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayConversations.slice(0, 2).map((conv) => (
            <Card key={conv.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {conv.agentName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-semibold text-gray-900">{conv.agentName}</h3>
                        <p className="text-xs text-gray-500">{conv.agentSpecialty}</p>
                      </div>
                      {conv.unread && (
                        <Badge className="bg-blue-500 text-white">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {conv.lastMessage}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {conv.timestamp}
                      </span>
                      <Link href={`/founder/agents/${conv.agentId}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          Continue
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
