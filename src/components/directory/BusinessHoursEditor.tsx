'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import {
  type BusinessHours,
  type DayHours,
  createDefaultBusinessHours,
  createStandardBusinessHours,
  formatTime,
} from '@/lib/types';
import { cn } from '@/lib/utils';

interface BusinessHoursEditorProps {
  hours: BusinessHours | undefined;
  onChange: (hours: BusinessHours) => void;
  disabled?: boolean;
}

const DAYS = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
] as const;

type DayKey = typeof DAYS[number]['key'];

const TIME_OPTIONS = generateTimeOptions();

function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time24 = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      const label = `${hour12}:${min.toString().padStart(2, '0')} ${ampm}`;
      options.push({ value: time24, label });
    }
  }
  return options;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
];

export function BusinessHoursEditor({
  hours,
  onChange,
  disabled = false,
}: BusinessHoursEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyFromDay, setCopyFromDay] = useState<DayKey | null>(null);

  // Initialize with default hours if not set
  const currentHours = hours || createDefaultBusinessHours();

  const updateDay = (day: DayKey, updates: Partial<DayHours>) => {
    const newHours = {
      ...currentHours,
      [day]: { ...currentHours[day], ...updates },
    };
    onChange(newHours);
  };

  const copyHoursToAll = (sourceDay: DayKey) => {
    const sourceHours = currentHours[sourceDay];
    const newHours = { ...currentHours };
    DAYS.forEach(({ key }) => {
      if (key !== sourceDay) {
        newHours[key] = { ...sourceHours };
      }
    });
    onChange(newHours);
  };

  const applyPreset = (preset: 'standard' | '24-7' | 'closed') => {
    if (preset === 'standard') {
      onChange(createStandardBusinessHours());
    } else if (preset === '24-7') {
      const allOpen: BusinessHours = {
        ...createDefaultBusinessHours(),
        monday: { isOpen: true, is24Hours: true },
        tuesday: { isOpen: true, is24Hours: true },
        wednesday: { isOpen: true, is24Hours: true },
        thursday: { isOpen: true, is24Hours: true },
        friday: { isOpen: true, is24Hours: true },
        saturday: { isOpen: true, is24Hours: true },
        sunday: { isOpen: true, is24Hours: true },
      };
      onChange(allOpen);
    } else {
      onChange(createDefaultBusinessHours());
    }
  };

  const getOpenDaysCount = () => {
    return DAYS.filter(({ key }) => currentHours[key].isOpen).length;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5" />
                  Business Hours
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  {getOpenDaysCount() > 0 ? (
                    <>
                      Open {getOpenDaysCount()} day{getOpenDaysCount() !== 1 ? 's' : ''} a week
                      <Badge variant="outline" className="text-xs">
                        {currentHours.timezone ? TIMEZONES.find(t => t.value === currentHours.timezone)?.label : 'Eastern'}
                      </Badge>
                    </>
                  ) : (
                    'Set your business hours'
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Presets */}
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              <Label className="w-full text-xs text-muted-foreground mb-1">Quick Presets</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('standard')}
                disabled={disabled}
              >
                Standard (Mon-Fri 9-5)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('24-7')}
                disabled={disabled}
              >
                24/7
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('closed')}
                disabled={disabled}
              >
                All Closed
              </Button>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={currentHours.timezone || 'America/New_York'}
                onValueChange={(value) => onChange({ ...currentHours, timezone: value })}
                disabled={disabled}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Days */}
            <div className="space-y-3">
              {DAYS.map(({ key, label, short }) => {
                const dayHours = currentHours[key];
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg transition-colors',
                      dayHours.isOpen
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-slate-50 dark:bg-slate-800/50'
                    )}
                  >
                    {/* Day Toggle */}
                    <div className="flex items-center gap-3 sm:w-32 shrink-0">
                      <Switch
                        checked={dayHours.isOpen}
                        onCheckedChange={(checked) =>
                          updateDay(key, {
                            isOpen: checked,
                            ...(checked && !dayHours.openTime
                              ? { openTime: '09:00', closeTime: '17:00' }
                              : {}),
                          })
                        }
                        disabled={disabled}
                      />
                      <span className={cn('font-medium', !dayHours.isOpen && 'text-muted-foreground')}>
                        {label}
                      </span>
                    </div>

                    {/* Time Selectors or Closed Label */}
                    {dayHours.isOpen ? (
                      <div className="flex items-center gap-2 flex-1 flex-wrap">
                        {/* 24 Hours Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dayHours.is24Hours || false}
                            onChange={(e) => updateDay(key, { is24Hours: e.target.checked })}
                            disabled={disabled}
                            className="rounded"
                          />
                          <span className="text-sm">24 Hours</span>
                        </label>

                        {!dayHours.is24Hours && (
                          <>
                            <Select
                              value={dayHours.openTime || '09:00'}
                              onValueChange={(value) => updateDay(key, { openTime: value })}
                              disabled={disabled}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {TIME_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground">to</span>
                            <Select
                              value={dayHours.closeTime || '17:00'}
                              onValueChange={(value) => updateDay(key, { closeTime: value })}
                              disabled={disabled}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {TIME_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </>
                        )}

                        {/* Copy to All Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={() => copyHoursToAll(key)}
                          disabled={disabled}
                          title="Copy to all days"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy to all
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Holiday Note */}
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="holidayNote">Holiday Note (optional)</Label>
              <Input
                id="holidayNote"
                value={currentHours.holidayNote || ''}
                onChange={(e) => onChange({ ...currentHours, holidayNote: e.target.value })}
                placeholder="e.g., Hours may vary on holidays"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                This note will appear below your business hours
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default BusinessHoursEditor;
