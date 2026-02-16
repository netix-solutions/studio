'use client';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LeadScoreBadgeProps {
  score: number | undefined;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

function getScoreColor(score: number): { bg: string; text: string; ring: string } {
  if (score >= 70) return { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-300' };
  if (score >= 40) return { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-300' };
  return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300' };
}

function getScoreLabel(score: number): string {
  if (score >= 70) return 'Hot';
  if (score >= 40) return 'Warm';
  return 'Cold';
}

export function LeadScoreBadge({ score, size = 'sm', showLabel = false }: LeadScoreBadgeProps) {
  if (score === undefined || score === null) return null;

  const colors = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full font-semibold',
              colors.bg, colors.text,
              size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
            )}
          >
            {score}
            {showLabel && <span className="font-normal">{label}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Lead Score: {score}/100 ({label})</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
