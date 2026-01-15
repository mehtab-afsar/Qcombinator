/**
 * QuitScaleSlider Component
 * Clean component: ~48 lines, single responsibility
 * Displays quit scale slider with visual feedback
 */

import { Label } from '@/components/ui/label';
import { Flame } from 'lucide-react';
import type { QuitScaleDescription } from '@/src/hooks/use-resilience';

interface QuitScaleSliderProps {
  value: number;
  onChange: (value: number) => void;
  description: QuitScaleDescription;
}

export function QuitScaleSlider({ value, onChange, description }: QuitScaleSliderProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="quit-scale">
        On a scale of 1-10, how close did you come to quitting? *
      </Label>
      <p className="text-xs text-gray-600 mt-1 mb-3">
        1 = Never considered it, 10 = Had one foot out the door
      </p>
      <div className="space-y-3">
        <input
          type="range"
          id="quit-scale"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className={`text-4xl font-bold ${description.color}`}>{value}</span>
            <div>
              <p className={`text-lg font-medium ${description.color}`}>
                {description.emoji} {description.text}
              </p>
              {value >= 7 && (
                <p className="text-xs text-green-600 mt-1">
                  <Flame className="h-3 w-3 inline mr-1" />
                  Facing near-quit moments and pushing through = true determination
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-700">
          <strong>Note:</strong> 7-9 scores highly. It shows you faced real adversity but
          persevered. A score of 1-2 might mean you haven&apos;t been tested yet.
        </p>
      </div>
    </div>
  );
}
