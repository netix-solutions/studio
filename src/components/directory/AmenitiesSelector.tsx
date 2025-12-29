'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import {
  type BusinessAmenity,
  BUSINESS_AMENITIES,
  BUSINESS_AMENITY_LABELS,
  BUSINESS_AMENITY_ICONS,
} from '@/lib/types';
import { cn } from '@/lib/utils';

interface AmenitiesSelectorProps {
  amenities: BusinessAmenity[];
  onChange: (amenities: BusinessAmenity[]) => void;
  showOnCard: boolean;
  onShowOnCardChange: (show: boolean) => void;
  disabled?: boolean;
}

// Group amenities by category
const AMENITY_GROUPS = {
  'Convenience': ['wifi', 'parking', 'wheelchair_accessible'] as BusinessAmenity[],
  'Service Options': ['delivery', 'pickup', 'curbside', 'appointment_required', 'walk_ins_welcome'] as BusinessAmenity[],
  'Atmosphere': ['pet_friendly', 'outdoor_seating', 'family_friendly'] as BusinessAmenity[],
  'Special Discounts': ['senior_discount', 'military_discount'] as BusinessAmenity[],
  'Business Identity': ['veteran_owned', 'women_owned', 'minority_owned', 'locally_owned'] as BusinessAmenity[],
  'Certifications': ['eco_friendly', 'certified_organic', 'licensed_insured'] as BusinessAmenity[],
};

export function AmenitiesSelector({
  amenities = [],
  onChange,
  showOnCard,
  onShowOnCardChange,
  disabled = false,
}: AmenitiesSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAmenity = (amenity: BusinessAmenity) => {
    if (amenities.includes(amenity)) {
      onChange(amenities.filter(a => a !== amenity));
    } else {
      onChange([...amenities, amenity]);
    }
  };

  const selectAll = () => {
    onChange(Object.values(BUSINESS_AMENITIES) as BusinessAmenity[]);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5" />
                  Features & Amenities
                  {amenities.length > 0 && (
                    <Badge variant="secondary">
                      {amenities.length} selected
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Highlight what makes your business special
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Label htmlFor="showAmenities" className="text-sm cursor-pointer">
                    Show on card
                  </Label>
                  <Switch
                    id="showAmenities"
                    checked={showOnCard}
                    onCheckedChange={onShowOnCardChange}
                    disabled={disabled}
                  />
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={disabled}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={disabled || amenities.length === 0}
              >
                Clear All
              </Button>
            </div>

            {/* Amenity Groups */}
            {Object.entries(AMENITY_GROUPS).map(([groupName, groupAmenities]) => (
              <div key={groupName}>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  {groupName}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {groupAmenities.map((amenity) => {
                    const isSelected = amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        disabled={disabled}
                        className={cn(
                          'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                          'border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background border-border hover:bg-muted',
                          disabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <span className="text-base">{BUSINESS_AMENITY_ICONS[amenity]}</span>
                        <span>{BUSINESS_AMENITY_LABELS[amenity]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Selected Summary */}
            {amenities.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Selected Features ({amenities.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {amenities.map((amenity) => (
                    <Badge
                      key={amenity}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/10"
                      onClick={() => !disabled && toggleAmenity(amenity)}
                    >
                      {BUSINESS_AMENITY_ICONS[amenity]} {BUSINESS_AMENITY_LABELS[amenity]}
                      <span className="ml-1 opacity-50">×</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default AmenitiesSelector;
