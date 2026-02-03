"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Video, Send, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface MeetingSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (date: string, time: string, notes: string) => void;
  founderName: string;
  startupName: string;
}

export function MeetingSchedulerModal({
  isOpen,
  onClose,
  onSchedule,
  founderName,
  startupName
}: MeetingSchedulerModalProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  // Generate next 7 days for date selection
  const getNextDays = (count: number) => {
    const days = [];
    for (let i = 1; i <= count; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const availableDates = getNextDays(7);

  const timeSlots = [
    "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
  ];

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsScheduling(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSchedule(selectedDate, selectedTime, notes);
    setIsScheduling(false);

    // Reset form
    setSelectedDate("");
    setSelectedTime("");
    setNotes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Schedule Meeting with {founderName}
          </DialogTitle>
          <p className="text-sm text-gray-600">{startupName}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar className="inline h-4 w-4 mr-2" />
              Select Date
            </label>
            <div className="grid grid-cols-4 gap-2">
              {availableDates.map((date) => {
                const dateStr = date.toISOString().split('T')[0];
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-xs text-gray-600">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="font-semibold text-gray-900">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Clock className="inline h-4 w-4 mr-2" />
              Select Time (Your Timezone)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-2 rounded-lg border-2 text-center text-sm transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 font-semibold'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meeting Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Meeting Format
            </label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
              <Video className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">Video Call</div>
                <div className="text-sm text-gray-600">A Zoom link will be sent to both parties</div>
              </div>
              <Badge className="ml-auto bg-blue-600">Recommended</Badge>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="meeting-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Notes <span className="text-gray-500">(optional)</span>
            </label>
            <Textarea
              id="meeting-notes"
              placeholder="Add any specific topics you'd like to discuss, questions to prepare, or context for the meeting..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full"
              maxLength={300}
            />
            <p className="text-xs text-gray-500 mt-1">
              {notes.length}/300 characters
            </p>
          </div>

          {/* Summary */}
          {selectedDate && selectedTime && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Meeting Summary:</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• {founderName} from {startupName}</li>
                <li>• {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</li>
                <li>• {selectedTime}</li>
                <li>• Video call via Zoom</li>
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isScheduling}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!selectedDate || !selectedTime || isScheduling}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isScheduling ? (
                <>Scheduling...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm & Send Invitation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
