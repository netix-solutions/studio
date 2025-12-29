'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tag,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Ticket,
  Edit2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { type SpecialOffer, isOfferValid } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SpecialOffersEditorProps {
  offers: SpecialOffer[];
  onChange: (offers: SpecialOffer[]) => void;
  disabled?: boolean;
  maxOffers?: number;
}

const generateId = () => `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function SpecialOffersEditor({
  offers = [],
  onChange,
  disabled = false,
  maxOffers = 5,
}: SpecialOffersEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const addOffer = (offer: SpecialOffer) => {
    onChange([...offers, offer]);
    setDialogOpen(false);
    setEditingOffer(null);
  };

  const updateOffer = (updatedOffer: SpecialOffer) => {
    onChange(offers.map(o => o.id === updatedOffer.id ? updatedOffer : o));
    setDialogOpen(false);
    setEditingOffer(null);
  };

  const deleteOffer = (offerId: string) => {
    onChange(offers.filter(o => o.id !== offerId));
  };

  const toggleOfferActive = (offerId: string) => {
    onChange(offers.map(o => o.id === offerId ? { ...o, isActive: !o.isActive } : o));
  };

  const activeCount = offers.filter(o => o.isActive).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="w-5 h-5" />
                  Special Offers
                  {activeCount > 0 && (
                    <Badge className="bg-green-100 text-green-700">
                      {activeCount} Active
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Add promotions, discounts, or special deals
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
            {/* Existing Offers List */}
            {offers.length > 0 ? (
              <div className="space-y-3">
                {offers.map((offer) => {
                  const valid = isOfferValid(offer);
                  return (
                    <div
                      key={offer.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                        offer.isActive && valid
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                          : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'
                      )}
                    >
                      {/* Toggle */}
                      <Switch
                        checked={offer.isActive}
                        onCheckedChange={() => toggleOfferActive(offer.id)}
                        disabled={disabled}
                        className="mt-1"
                      />

                      {/* Offer Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={cn(
                            'font-medium',
                            !offer.isActive && 'text-muted-foreground'
                          )}>
                            {offer.title}
                          </h4>
                          {offer.code && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {offer.code}
                            </Badge>
                          )}
                          {!valid && offer.isActive && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                        </div>
                        {offer.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {offer.description}
                          </p>
                        )}
                        {(offer.validFrom || offer.validUntil) && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {offer.validFrom && formatDate(offer.validFrom)}
                            {offer.validFrom && offer.validUntil && ' - '}
                            {offer.validUntil && formatDate(offer.validUntil)}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingOffer(offer);
                            setDialogOpen(true);
                          }}
                          disabled={disabled}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteOffer(offer.id)}
                          disabled={disabled}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Ticket className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No special offers yet</p>
                <p className="text-sm">Add a promotion to attract more customers</p>
              </div>
            )}

            {/* Add Offer Button */}
            {offers.length < maxOffers && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={disabled}
                    onClick={() => setEditingOffer(null)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Special Offer
                  </Button>
                </DialogTrigger>
                <OfferDialog
                  offer={editingOffer}
                  onSave={editingOffer ? updateOffer : addOffer}
                  onCancel={() => {
                    setDialogOpen(false);
                    setEditingOffer(null);
                  }}
                />
              </Dialog>
            )}

            {offers.length >= maxOffers && (
              <p className="text-center text-sm text-muted-foreground">
                Maximum of {maxOffers} offers reached
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Offer Dialog Component
function OfferDialog({
  offer,
  onSave,
  onCancel,
}: {
  offer: SpecialOffer | null;
  onSave: (offer: SpecialOffer) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<SpecialOffer>>(
    offer || {
      id: generateId(),
      title: '',
      description: '',
      code: '',
      isActive: true,
      termsAndConditions: '',
    }
  );

  const handleSave = () => {
    if (!formData.title) return;

    onSave({
      id: formData.id || generateId(),
      title: formData.title,
      description: formData.description,
      code: formData.code,
      validFrom: formData.validFrom,
      validUntil: formData.validUntil,
      isActive: formData.isActive ?? true,
      termsAndConditions: formData.termsAndConditions,
    });
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>
          {offer ? 'Edit Special Offer' : 'Add Special Offer'}
        </DialogTitle>
        <DialogDescription>
          Create a promotion or discount to attract more customers
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="offer-title">Offer Title *</Label>
          <Input
            id="offer-title"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., 20% Off First Visit"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="offer-description">Description</Label>
          <Textarea
            id="offer-description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your offer in detail..."
            rows={2}
            maxLength={300}
          />
        </div>

        {/* Promo Code */}
        <div className="space-y-2">
          <Label htmlFor="offer-code">Promo Code (optional)</Label>
          <Input
            id="offer-code"
            value={formData.code || ''}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g., SAVE20"
            maxLength={20}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            If customers need to mention a code, enter it here
          </p>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="offer-valid-from">Valid From</Label>
            <Input
              id="offer-valid-from"
              type="date"
              value={formData.validFrom ? formatDateForInput(formData.validFrom) : ''}
              onChange={(e) => setFormData({
                ...formData,
                validFrom: e.target.value ? new Date(e.target.value) : undefined,
              })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-valid-until">Valid Until</Label>
            <Input
              id="offer-valid-until"
              type="date"
              value={formData.validUntil ? formatDateForInput(formData.validUntil) : ''}
              onChange={(e) => setFormData({
                ...formData,
                validUntil: e.target.value ? new Date(e.target.value) : undefined,
              })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Leave dates empty for an ongoing offer
        </p>

        {/* Terms and Conditions */}
        <div className="space-y-2">
          <Label htmlFor="offer-terms">Terms & Conditions (optional)</Label>
          <Textarea
            id="offer-terms"
            value={formData.termsAndConditions || ''}
            onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
            placeholder="e.g., Cannot be combined with other offers. New customers only."
            rows={2}
            maxLength={500}
          />
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <Label htmlFor="offer-active">Active</Label>
            <p className="text-xs text-muted-foreground">
              Toggle to show or hide this offer
            </p>
          </div>
          <Switch
            id="offer-active"
            checked={formData.isActive ?? true}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!formData.title}>
          <Check className="w-4 h-4 mr-2" />
          {offer ? 'Save Changes' : 'Add Offer'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Helper functions
function formatDate(date: any): string {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateForInput(date: any): string {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toISOString().split('T')[0];
}

export default SpecialOffersEditor;
