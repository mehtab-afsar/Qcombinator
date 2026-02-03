"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, X } from "lucide-react";

interface ConnectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  investorName: string;
  startupOneLiner: string;
  keyMetrics: string[];
  matchReason: string;
}

export function ConnectionRequestModal({
  isOpen,
  onClose,
  onSubmit,
  investorName,
  startupOneLiner,
  keyMetrics,
  matchReason
}: ConnectionRequestModalProps) {
  const [personalMessage, setPersonalMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    setIsSending(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSubmit(personalMessage);
    setIsSending(false);
    setPersonalMessage("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            Connect with {investorName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Auto-Generated Pitch Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-5 border border-blue-200">
            <div className="flex items-center mb-3">
              <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
              <h3 className="font-semibold text-gray-900">Auto-Generated Pitch Summary</h3>
              <Badge variant="outline" className="ml-2 text-xs">AI-Powered</Badge>
            </div>

            <div className="space-y-3">
              {/* One-Liner */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Your Startup:</p>
                <p className="text-gray-900">{startupOneLiner}</p>
              </div>

              {/* Key Metrics */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Key Metrics:</p>
                <ul className="space-y-1">
                  {keyMetrics.map((metric, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      {metric}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Match Reason */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Why this match makes sense:</p>
                <p className="text-sm text-gray-700">{matchReason}</p>
              </div>
            </div>
          </div>

          {/* Personal Message */}
          <div>
            <label htmlFor="personal-message" className="block text-sm font-medium text-gray-700 mb-2">
              Personal Message <span className="text-gray-500">(optional)</span>
            </label>
            <Textarea
              id="personal-message"
              placeholder="Add a personal note to introduce yourself or highlight specific synergies..."
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              rows={4}
              className="w-full"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {personalMessage.length}/500 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isSending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Connection Request
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
