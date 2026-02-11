"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageSquare, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getAgentsByPillar, getPillarName, getPillarColor } from "@/features/agents/data/agents";
import { generateAgentRecommendations } from "@/features/qscore/utils/recommendations";
import { Agent } from "@/features/agents/types/agent.types";
import { useQScore } from "@/features/qscore/hooks/useQScore";
import { QScore } from "@/features/qscore/types/qscore.types";

export default function AgentsHub() {
  const { qScore } = useQScore();

  const agentRecommendations = qScore
    ? generateAgentRecommendations(qScore as unknown as QScore)
    : [];
  const [_activePillar, setActivePillar] = useState<Agent['pillar']>('sales-marketing');

  const salesMarketingAgents = getAgentsByPillar('sales-marketing');
  const operationsFinanceAgents = getAgentsByPillar('operations-finance');
  const productStrategyAgents = getAgentsByPillar('product-strategy');

  // Agent Card Component
  const AgentCard = ({ agent }: { agent: Agent }) => {
    const colors = getPillarColor(agent.pillar);

    return (
      <Card className={`hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-2 ${colors.border}`}>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            {/* Agent Avatar */}
            <div className={`h-16 w-16 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center font-bold text-2xl flex-shrink-0`}>
              {agent.name[0]}
            </div>

            {/* Agent Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{agent.name}</h3>
                  <p className="text-sm text-gray-600">{agent.specialty}</p>
                </div>
                <Badge variant="outline" className={colors.text}>
                  {agent.pillar === 'sales-marketing' ? 'Sales/Marketing' :
                   agent.pillar === 'operations-finance' ? 'Ops/Finance' :
                   'Product/Strategy'}
                </Badge>
              </div>

              <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                {agent.description}
              </p>

              {/* Improves Score Badge */}
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs text-gray-600">
                  Improves <span className="font-medium text-green-600 capitalize">{agent.improvesScore === 'goToMarket' ? 'GTM' : agent.improvesScore}</span> Score
                </span>
              </div>

              {/* Chat Button */}
              <Link href={`/founder/agents/${agent.id}`}>
                <Button className="w-full" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat with {agent.name}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Brain className="h-8 w-8 mr-3 text-purple-600" />
            AI Agents Hub
          </h1>
          <p className="text-gray-600 mt-1">Get personalized advice from 9 specialized AI advisors</p>
        </div>

        {/* Q-Score Quick View */}
        <Card className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{qScore?.overall ?? '—'}</div>
              <div className="text-xs opacity-75">Your Q-Score</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Recommendations */}
      {agentRecommendations.length > 0 && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Recommended for You</h3>
                {agentRecommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-700">
                      {rec.message}
                    </p>
                    <Link href={`/founder/agents/${rec.agent.id}`}>
                      <Button size="sm" variant="outline" className="ml-4">
                        Chat Now
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agents by Pillar - Tabbed Interface */}
      <Tabs defaultValue="sales-marketing" className="w-full" onValueChange={(value) => setActivePillar(value as Agent['pillar'])}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales-marketing" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            {getPillarName('sales-marketing')}
          </TabsTrigger>
          <TabsTrigger value="operations-finance" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            {getPillarName('operations-finance')}
          </TabsTrigger>
          <TabsTrigger value="product-strategy" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            {getPillarName('product-strategy')}
          </TabsTrigger>
        </TabsList>

        {/* Sales & Marketing Agents */}
        <TabsContent value="sales-marketing" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salesMarketingAgents.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </TabsContent>

        {/* Operations & Finance Agents */}
        <TabsContent value="operations-finance" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {operationsFinanceAgents.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </TabsContent>

        {/* Product & Strategy Agents */}
        <TabsContent value="product-strategy" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productStrategyAgents.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-2">💡 How AI Agents Work</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Each agent specializes in a specific startup domain</li>
            <li>• Get personalized advice, frameworks, and actionable playbooks</li>
            <li>• Upload documents for context-aware recommendations</li>
            <li>• Save conversations and track improvements to your Q-Score</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
