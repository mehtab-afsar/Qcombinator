"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, CheckCircle, AlertCircle, Calendar } from "lucide-react";

interface CustomerEvidenceFormProps {
  data: {
    customerType: string;
    conversationDate: Date | null;
    customerQuote: string;
    customerSurprise: string;
    customerCommitment: string;
    conversationCount: number;
    customerList: string[];
  };
  onChange: (field: string, value: any) => void;
}

export function CustomerEvidenceForm({ data, onChange }: CustomerEvidenceFormProps) {
  const [newCustomer, setNewCustomer] = useState("");

  const quoteWordCount = data.customerQuote.trim().split(/\s+/).filter(w => w.length > 0).length;
  const surpriseWordCount = data.customerSurprise.trim().split(/\s+/).filter(w => w.length > 0).length;

  const addCustomer = () => {
    if (newCustomer.trim()) {
      onChange('customerList', [...data.customerList, newCustomer.trim()]);
      setNewCustomer("");
    }
  };

  const removeCustomer = (index: number) => {
    const updated = data.customerList.filter((_, i) => i !== index);
    onChange('customerList', updated);
  };

  const getDaysAgo = () => {
    if (!data.conversationDate) return null;
    const days = Math.floor((new Date().getTime() - new Date(data.conversationDate).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysAgo = getDaysAgo();

  return (
    <div className="space-y-6">
      {/* Title & Instructions */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Customer Conversation Evidence
        </h3>
        <p className="text-gray-600 text-sm">
          Describe a <strong>specific conversation</strong> with a potential customer.
          Quote them directly and share what surprised you.
        </p>
      </div>

      {/* Example */}
      <details className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <summary className="cursor-pointer font-medium text-purple-900 flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          See an example of strong customer evidence
        </summary>
        <div className="mt-3 text-sm text-purple-800 space-y-2">
          <p><strong>Customer:</strong> Sarah Chen, Head of Finance at 50-person SaaS company</p>
          <p><strong>When:</strong> January 15, 2025</p>
          <p><strong>Quote:</strong> <em>"We're literally paying someone $4,000/month just to reconcile vendor invoices because our AP system doesn't talk to our procurement software. It's insane. If you can cut that time by even 50%, we'd switch immediately."</em></p>
          <p><strong>Surprised me:</strong> <em>I thought the pain point was invoice matching, but it's actually the lack of real-time sync between systems. They don't even care about AI features—they just want automatic data flow.</em></p>
          <p><strong>Commitment:</strong> Yes, she signed an LOI for $500/month once we have a working prototype.</p>
        </div>
      </details>

      {/* Customer Type */}
      <div>
        <Label htmlFor="customer-type">Customer type / role *</Label>
        <Input
          id="customer-type"
          placeholder="e.g., Head of Finance at 50-person SaaS company"
          value={data.customerType}
          onChange={(e) => onChange('customerType', e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Conversation Date */}
      <div>
        <Label htmlFor="conversation-date">When did you talk to them? *</Label>
        <div className="flex items-center space-x-3 mt-1">
          <Calendar className="h-4 w-4 text-gray-400" />
          <Input
            id="conversation-date"
            type="date"
            max={new Date().toISOString().split('T')[0]}
            value={data.conversationDate ? new Date(data.conversationDate).toISOString().split('T')[0] : ''}
            onChange={(e) => onChange('conversationDate', e.target.value ? new Date(e.target.value) : null)}
            className="flex-1"
          />
        </div>
        {daysAgo !== null && (
          <p className={`text-xs mt-1 ${
            daysAgo <= 30 ? 'text-green-600' :
            daysAgo <= 90 ? 'text-yellow-600' :
            'text-orange-600'
          }`}>
            {daysAgo === 0 ? 'Today' :
             daysAgo === 1 ? 'Yesterday' :
             `${daysAgo} days ago`}
            {daysAgo > 90 && ' (conversations within 90 days score higher)'}
          </p>
        )}
      </div>

      {/* Direct Quote */}
      <div>
        <Label htmlFor="customer-quote">Direct quote from customer *</Label>
        <Textarea
          id="customer-quote"
          placeholder="What did they say? Use their exact words... 'We spend 40 hours a month on this nightmare...'"
          value={data.customerQuote}
          onChange={(e) => onChange('customerQuote', e.target.value)}
          className="mt-1 min-h-[120px]"
          rows={6}
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-sm ${
            quoteWordCount >= 50 ? 'text-green-600' :
            quoteWordCount >= 30 ? 'text-yellow-600' :
            'text-gray-500'
          }`}>
            {quoteWordCount} words
            {quoteWordCount < 50 && ` • ${50 - quoteWordCount} more for good score`}
          </span>
          {quoteWordCount >= 50 && <CheckCircle className="h-4 w-4 text-green-600" />}
        </div>
      </div>

      {/* Pain Intensity Indicator */}
      {data.customerQuote.length > 20 && (
        <div>
          {/nightmare|terrible|hate|frustrated|expensive|waste|insane|killing|painful/i.test(data.customerQuote) ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Strong pain signal detected!</strong> Customers using words like "nightmare" or "insane"
                indicate deep frustration - exactly what investors look for.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> Include emotional language from the customer if they expressed frustration.
                Strong pain = strong opportunity.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* What Surprised You */}
      <div>
        <Label htmlFor="customer-surprise">What surprised you in this conversation? *</Label>
        <Textarea
          id="customer-surprise"
          placeholder="What did you learn that you didn't expect? Did they care about something different than you thought?"
          value={data.customerSurprise}
          onChange={(e) => onChange('customerSurprise', e.target.value)}
          className="mt-1 min-h-[100px]"
          rows={5}
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-sm ${
            surpriseWordCount >= 25 ? 'text-green-600' :
            surpriseWordCount >= 15 ? 'text-yellow-600' :
            'text-gray-500'
          }`}>
            {surpriseWordCount} words
          </span>
        </div>
      </div>

      {/* Commitment Level */}
      <div>
        <Label htmlFor="customer-commitment">Did they offer to pay or commit? *</Label>
        <select
          id="customer-commitment"
          value={data.customerCommitment}
          onChange={(e) => onChange('customerCommitment', e.target.value)}
          className="w-full mt-1 p-2 border border-gray-300 rounded-md"
        >
          <option value="">Select commitment level...</option>
          <option value="signed-loi">✅ Yes - Signed LOI or contract (strongest!)</option>
          <option value="will-pay">💰 Yes - Verbally committed to pay</option>
          <option value="switch">🔄 Said they would switch from current solution</option>
          <option value="interested">👀 Interested but no commitment</option>
          <option value="maybe">🤔 Maybe/need to think about it</option>
          <option value="no">❌ No commitment discussed</option>
        </select>

        {data.customerCommitment === 'signed-loi' && (
          <Alert className="bg-green-50 border-green-200 mt-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Exceptional!</strong> Signed commitments before building = top 1% of founders
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Conversation Count */}
      <div>
        <Label htmlFor="conversation-count">
          How many potential customers have you had substantive conversations with? *
        </Label>
        <p className="text-xs text-gray-600 mt-1 mb-2">
          (10+ minute discussions, not surveys or brief chats)
        </p>
        <div className="space-y-3">
          <input
            type="range"
            id="conversation-count"
            min="0"
            max="100"
            value={data.conversationCount}
            onChange={(e) => onChange('conversationCount', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold ${
              data.conversationCount >= 50 ? 'text-green-600' :
              data.conversationCount >= 20 ? 'text-blue-600' :
              data.conversationCount >= 10 ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {data.conversationCount}+
            </span>
            <span className="text-sm text-gray-600">
              {data.conversationCount >= 50 ? '🔥 Exceptional' :
               data.conversationCount >= 20 ? '✅ Strong' :
               data.conversationCount >= 10 ? '👍 Good start' :
               data.conversationCount >= 5 ? '📈 Building momentum' :
               data.conversationCount > 0 ? '🌱 Just starting' :
               '⚠️ Talk to customers!'}
            </span>
          </div>
        </div>
        {data.conversationCount < 10 && (
          <Alert className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Successful founders typically have 50+ conversations before launch.
              This is the #1 predictor of finding product-market fit.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Customer Names (Optional) */}
      <div>
        <Label htmlFor="customer-names">
          Customer names/companies (optional - for credibility)
        </Label>
        <p className="text-xs text-gray-600 mt-1 mb-2">
          Not displayed publicly. Helps verify your customer discovery work.
        </p>
        <div className="flex space-x-2">
          <Input
            id="customer-names"
            placeholder="e.g., Sarah Chen at Acme Corp"
            value={newCustomer}
            onChange={(e) => setNewCustomer(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCustomer()}
          />
          <button
            onClick={addCustomer}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        {data.customerList.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {data.customerList.map((customer, index) => (
              <span
                key={index}
                className="inline-flex items-center bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full"
              >
                {customer}
                <button
                  onClick={() => removeCustomer(index)}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Why we ask */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Why we ask this:</strong> First Round Capital's
          analysis of 300+ investments found that founders who talk to 50+ customers before
          building have a 3.5x higher survival rate. Detailed customer evidence separates
          real founders from "idea people."
        </p>
      </div>
    </div>
  );
}
