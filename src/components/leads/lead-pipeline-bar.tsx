'use client';

import { cn } from '@/lib/utils';
import { LEAD_STAGE_ORDER, LEAD_STAGE_LABELS, LEAD_STAGE_COLORS, type LeadStage } from '@/lib/types';
import { Check } from 'lucide-react';

interface LeadPipelineBarProps {
  currentStage: LeadStage;
  className?: string;
}

export function LeadPipelineBar({ currentStage, className }: LeadPipelineBarProps) {
  if (currentStage === 'lost') {
    return (
      <div className={cn('flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200', className)}>
        <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">X</span>
        </div>
        <span className="text-sm font-medium text-red-700">Lost</span>
      </div>
    );
  }

  const currentIndex = LEAD_STAGE_ORDER.indexOf(currentStage);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {LEAD_STAGE_ORDER.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const colors = LEAD_STAGE_COLORS[stage];

        return (
          <div key={stage} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                  isCompleted && 'bg-green-500 text-white',
                  isCurrent && cn(colors.bg, colors.text, 'ring-2 ring-offset-1', colors.border.replace('border-', 'ring-')),
                  !isCompleted && !isCurrent && 'bg-gray-100 text-gray-400'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] mt-1 text-center leading-tight hidden sm:block',
                  isCurrent ? 'font-semibold text-gray-900' : 'text-gray-500'
                )}
              >
                {LEAD_STAGE_LABELS[stage]}
              </span>
            </div>
            {index < LEAD_STAGE_ORDER.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-1 mt-[-16px] sm:mt-0',
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
