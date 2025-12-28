'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  UserPlus,
  Building2,
  CreditCard,
  Megaphone,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Globe,
  FileText,
  Palette,
  Calendar,
} from 'lucide-react';
import {
  AD_STATUSES,
  AD_STATUS_LABELS,
  BILLING_PERIOD_LABELS,
  PAYMENT_METHOD_LABELS,
  type BillingPeriod,
  type PaymentMethod,
  type AdStatus,
} from '@/lib/types';

interface FormData {
  // Customer info
  email: string;
  contactName: string;
  firstName: string;
  lastName: string;
  businessName: string;
  phone: string;

  // Subscription info
  planName: string;
  amount: string;
  billingPeriod: BillingPeriod;
  startDate: string;
  endDate: string;
  paymentMethod: PaymentMethod;
  paymentNotes: string;

  // Advertisement info
  adWebsiteUrl: string;
  adText: string;
  adNotes: string;

  // Design preferences
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontStyle: string;
  designNotes: string;

  // Options
  createAdvertisement: boolean;
  sendWelcomeEmail: boolean;
  initialAdStatus: AdStatus;
}

const initialFormData: FormData = {
  email: '',
  contactName: '',
  firstName: '',
  lastName: '',
  businessName: '',
  phone: '',

  planName: 'Community Ad',
  amount: '',
  billingPeriod: 'monthly',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  paymentMethod: 'other',
  paymentNotes: '',

  adWebsiteUrl: '',
  adText: '',
  adNotes: '',

  primaryColor: '#0284c7',
  secondaryColor: '#64748b',
  backgroundColor: '#ffffff',
  textColor: '#1e293b',
  fontStyle: 'modern',
  designNotes: '',

  createAdvertisement: true,
  sendWelcomeEmail: false,
  initialAdStatus: 'pending_info',
};

export default function ManualEntryPage() {
  const { auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ userId: string; subscriptionId: string; advertisementId?: string } | null>(null);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-populate first/last name from contact name
  const handleContactNameChange = (value: string) => {
    updateField('contactName', value);
    const parts = value.trim().split(' ');
    if (parts.length >= 1) {
      updateField('firstName', parts[0]);
    }
    if (parts.length >= 2) {
      updateField('lastName', parts.slice(1).join(' '));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      // Get the current user's ID token
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to perform this action');
      }

      const idToken = await currentUser.getIdToken();

      // Prepare the request body
      const requestBody = {
        email: formData.email.trim().toLowerCase(),
        contactName: formData.contactName.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        businessName: formData.businessName.trim(),
        phone: formData.phone.trim(),

        planName: formData.planName.trim(),
        amount: parseFloat(formData.amount),
        billingPeriod: formData.billingPeriod,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        paymentMethod: formData.paymentMethod,
        paymentNotes: formData.paymentNotes.trim(),

        adWebsiteUrl: formData.adWebsiteUrl.trim(),
        adText: formData.adText.trim(),
        adNotes: formData.adNotes.trim(),

        designPreferences: {
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          backgroundColor: formData.backgroundColor,
          textColor: formData.textColor,
          fontStyle: formData.fontStyle,
          additionalNotes: formData.designNotes.trim(),
        },

        createAdvertisement: formData.createAdvertisement,
        sendWelcomeEmail: formData.sendWelcomeEmail,
        initialAdStatus: formData.initialAdStatus,
      };

      const response = await fetch('/api/admin/manual-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create manual entry');
      }

      setSuccess(result.data);
      toast({
        title: 'Customer Created Successfully',
        description: result.data.message,
      });

      // Reset form for next entry
      setFormData(initialFormData);

    } catch (err: any) {
      console.error('Error creating manual entry:', err);
      setError(err.message || 'An unexpected error occurred');
      toast({
        title: 'Error',
        description: err.message || 'Failed to create manual entry',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewCustomer = () => {
    if (success?.advertisementId) {
      router.push(`/advertisements/${success.advertisementId}?userId=${success.userId}`);
    } else {
      router.push(`/subscriptions/${success?.subscriptionId}?customerId=${success?.userId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Manual Customer Entry</h1>
        <p className="text-muted-foreground">
          Add customers who purchased advertisements through other channels (cash, check, invoice, etc.)
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success!</AlertTitle>
          <AlertDescription className="text-green-700">
            <p>{success.advertisementId ? 'Customer, subscription, and advertisement created.' : 'Customer and subscription created.'}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleViewCustomer}
            >
              View {success.advertisementId ? 'Advertisement' : 'Subscription'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Customer Information
            </CardTitle>
            <CardDescription>
              Enter the customer's contact details. If a user with this email already exists, a new subscription will be added to their account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="customer@example.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  placeholder="John Smith"
                  value={formData.contactName}
                  onChange={(e) => handleContactNameChange(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">
                  <Building2 className="h-4 w-4 inline mr-1" />
                  Business Name
                </Label>
                <Input
                  id="businessName"
                  placeholder="Acme Corp"
                  value={formData.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription / Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription & Payment
            </CardTitle>
            <CardDescription>
              Enter the subscription details and how payment was received.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planName">Plan Name *</Label>
                <Input
                  id="planName"
                  placeholder="Community Ad"
                  value={formData.planName}
                  onChange={(e) => updateField('planName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="99.00"
                  value={formData.amount}
                  onChange={(e) => updateField('amount', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingPeriod">Billing Period *</Label>
                <Select
                  value={formData.billingPeriod}
                  onValueChange={(value) => updateField('billingPeriod', value as BillingPeriod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BILLING_PERIOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Start Date *
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateField('endDate', e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => updateField('paymentMethod', value as PaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentNotes">Payment Notes</Label>
                <Input
                  id="paymentNotes"
                  placeholder="Check #1234, Invoice #5678, etc."
                  value={formData.paymentNotes}
                  onChange={(e) => updateField('paymentNotes', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advertisement Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Advertisement Details
            </CardTitle>
            <CardDescription>
              Enter the advertisement information. This can be updated later by the customer or admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createAdvertisement"
                checked={formData.createAdvertisement}
                onCheckedChange={(checked) => updateField('createAdvertisement', !!checked)}
              />
              <Label htmlFor="createAdvertisement" className="cursor-pointer">
                Create advertisement record
              </Label>
            </div>

            {formData.createAdvertisement && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adWebsiteUrl">
                      <Globe className="h-4 w-4 inline mr-1" />
                      Ad Destination URL
                    </Label>
                    <Input
                      id="adWebsiteUrl"
                      type="url"
                      placeholder="https://example.com"
                      value={formData.adWebsiteUrl}
                      onChange={(e) => updateField('adWebsiteUrl', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initialAdStatus">Initial Ad Status</Label>
                    <Select
                      value={formData.initialAdStatus}
                      onValueChange={(value) => updateField('initialAdStatus', value as AdStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending_info">Awaiting Customer Info</SelectItem>
                        <SelectItem value="pending_internal_review">Under Internal Review</SelectItem>
                        <SelectItem value="pending_ad_creation">Ad Being Created</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adText">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Ad Text / Slogan
                  </Label>
                  <Textarea
                    id="adText"
                    placeholder="Your trusted local business..."
                    value={formData.adText}
                    onChange={(e) => updateField('adText', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adNotes">Additional Notes</Label>
                  <Textarea
                    id="adNotes"
                    placeholder="Special offers, promotions, or other details..."
                    value={formData.adNotes}
                    onChange={(e) => updateField('adNotes', e.target.value)}
                    rows={2}
                  />
                </div>

                <Separator />

                {/* Design Preferences */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Design Preferences
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor" className="text-xs">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={formData.primaryColor}
                          onChange={(e) => updateField('primaryColor', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.primaryColor}
                          onChange={(e) => updateField('primaryColor', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor" className="text-xs">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondaryColor"
                          type="color"
                          value={formData.secondaryColor}
                          onChange={(e) => updateField('secondaryColor', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.secondaryColor}
                          onChange={(e) => updateField('secondaryColor', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backgroundColor" className="text-xs">Background</Label>
                      <div className="flex gap-2">
                        <Input
                          id="backgroundColor"
                          type="color"
                          value={formData.backgroundColor}
                          onChange={(e) => updateField('backgroundColor', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.backgroundColor}
                          onChange={(e) => updateField('backgroundColor', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="textColor" className="text-xs">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="textColor"
                          type="color"
                          value={formData.textColor}
                          onChange={(e) => updateField('textColor', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.textColor}
                          onChange={(e) => updateField('textColor', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fontStyle" className="text-xs">Font Style</Label>
                      <Select
                        value={formData.fontStyle}
                        onValueChange={(value) => updateField('fontStyle', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modern">Modern</SelectItem>
                          <SelectItem value="classic">Classic</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                          <SelectItem value="elegant">Elegant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="designNotes" className="text-xs">Design Notes</Label>
                      <Input
                        id="designNotes"
                        placeholder="Any specific design requirements..."
                        value={formData.designNotes}
                        onChange={(e) => updateField('designNotes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Options & Submit */}
        <Card>
          <CardHeader>
            <CardTitle>Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendWelcomeEmail"
                checked={formData.sendWelcomeEmail}
                onCheckedChange={(checked) => updateField('sendWelcomeEmail', !!checked)}
              />
              <Label htmlFor="sendWelcomeEmail" className="cursor-pointer">
                Send welcome email with password reset link (for new customers)
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData(initialFormData)}
              disabled={isSubmitting}
            >
              Reset Form
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Customer
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
