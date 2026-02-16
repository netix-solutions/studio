'use client';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LeadScoreGaugeProps {
  score: number | undefined;
  breakdown?: {
    engagement: number;
    profile: number;
    recency: number;
    source: number;
  };
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreStroke(score: number): string {
  if (score >= 70) return '#16a34a';
  if (score >= 40) return '#ca8a04';
  return '#dc2626';
}

function getScoreLabel(score: number): string {
  if (score >= 70) return 'Hot Lead';
  if (score >= 40) return 'Warm Lead';
  return 'Cold Lead';
}

export function LeadScoreGauge({ score, breakdown, className }: LeadScoreGaugeProps) {
  if (score === undefined || score === null) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="relative h-16 w-16">
          <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-400">--</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Lead Score</p>
          <p className="text-lg font-bold text-gray-400">Not scored</p>
        </div>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 15.5;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-3 cursor-default', className)}>
            <div className="relative h-16 w-16">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke={getScoreStroke(score)}
                  strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn('text-sm font-bold', getScoreColor(score))}>{score}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lead Score</p>
              <p className={cn('text-lg font-bold', getScoreColor(score))}>
                {getScoreLabel(score)}
              </p>
            </div>
          </div>
        </TooltipTrigger>
        {breakdown && (
          <TooltipContent className="w-48">
            <p className="font-semibold mb-2">Score Breakdown</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Engagement</span>
                <span className="font-medium">{breakdown.engagement}</span>
              </div>
              <div className="flex justify-between">
                <span>Profile</span>
                <span className="font-medium">{breakdown.profile}</span>
              </div>
              <div className="flex justify-between">
                <span>Recency</span>
                <span className="font-medium">{breakdown.recency}</span>
              </div>
              <div className="flex justify-between">
                <span>Source</span>
                <span className="font-medium">{breakdown.source}</span>
              </div>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
