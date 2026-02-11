"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Send } from "lucide-react";

interface DeclineFeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reasons: string[], feedback: string) => void;
  founderName: string;
  startupName: string;
}

export function DeclineFeedbackForm({
  isOpen,
  onClose,
  onSubmit,
  founderName,
  startupName
}: DeclineFeedbackFormProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [additionalFeedback, setAdditionalFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const declineReasons = [
    { id: 'stage', label: 'Not at the right stage for our fund' },
    { id: 'sector', label: 'Outside our investment focus area' },
    { id: 'geography', label: 'Geographic mismatch' },
    { id: 'portfolio', label: 'Conflict with existing portfolio company' },
    { id: 'capacity', label: 'Currently at capacity for new investments' },
    { id: 'thesis', label: 'Does not align with our investment thesis' },
    { id: 'other', label: 'Other reason' }
  ];

  const toggleReason = (reasonId: string) => {
    setSelectedReasons(prev =>
      prev.includes(reasonId)
        ? prev.filter(id => id !== reasonId)
        : [...prev, reasonId]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSubmit(selectedReasons, additionalFeedback);
    setIsSubmitting(false);

    // Reset form
    setSelectedReasons([]);
    setAdditionalFeedback("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Decline Connection Request
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {founderName} from {startupName}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              Optional: Providing feedback helps founders improve their pitch and understand why they may not be a fit.
              Your feedback will be shared anonymously if you choose to provide it.
            </p>
          </div>

          {/* Reasons Checklist */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Reason for Declining <span className="text-gray-500">(optional, select all that apply)</span>
            </label>
            <div className="space-y-3">
              {declineReasons.map((reason) => (
                <div key={reason.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={reason.id}
                    checked={selectedReasons.includes(reason.id)}
                    onCheckedChange={() => toggleReason(reason.id)}
                  />
                  <label
                    htmlFor={reason.id}
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    {reason.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Feedback */}
          <div>
            <label htmlFor="additional-feedback" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Feedback <span className="text-gray-500">(optional)</span>
            </label>
            <Textarea
              id="additional-feedback"
              placeholder="Any constructive feedback that might help the founder in their fundraising journey..."
              value={additionalFeedback}
              onChange={(e) => setAdditionalFeedback(e.target.value)}
              rows={4}
              className="w-full"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {additionalFeedback.length}/500 characters
            </p>
          </div>

          {/* Privacy Notice */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              <strong>Privacy:</strong> Your feedback will be shared anonymously. The founder will not see your name
              or firm, only the reasons and feedback you provide.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                // Skip feedback and decline immediately
                onSubmit([], "");
                setSelectedReasons([]);
                setAdditionalFeedback("");
              }}
              disabled={isSubmitting}
              className="text-gray-600"
            >
              Skip & Decline
            </Button>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Decline with Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
