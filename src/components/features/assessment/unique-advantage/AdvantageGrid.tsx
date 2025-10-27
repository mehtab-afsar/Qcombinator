/**
 * AdvantageGrid Component
 * Clean component: ~40 lines, single responsibility
 * Displays advantage selection grid with checkboxes
 */

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { AdvantageOption } from '@/src/hooks/use-unique-advantage';

interface AdvantageGridProps {
  options: AdvantageOption[];
  selected: string[];
  onToggle: (id: string) => void;
}

export function AdvantageGrid({ options, selected, onToggle }: AdvantageGridProps) {
  return (
    <div>
      <Label className="text-base font-medium mb-3 block">
        Check all that apply (be honest - this helps us match you with the right investors)
      </Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((advantage) => (
          <div
            key={advantage.id}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selected.includes(advantage.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onToggle(advantage.id)}
          >
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={selected.includes(advantage.id)}
                onCheckedChange={() => onToggle(advantage.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{advantage.label}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      advantage.weight === 'Highest Impact'
                        ? 'bg-green-100 text-green-700'
                        : advantage.weight === 'High Impact'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {advantage.weight}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{advantage.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
