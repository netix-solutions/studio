export type Subscription = {
  id: string;
  customerName: string;
  customerEmail: string;
  website: string;
  plan: 'Monthly' | 'Quarterly' | 'Yearly' | string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expired' | 'Cancelled' | string;
  amount: number;
};

export type Pricing = {
  id: string;
  website: string;
  monthly: number;
  quarterly: number;
  yearly: number;
};

export type Discount = {
  id: string;
  code: string;
  percentage: number;
  status: 'Active' | 'Expired';
  applicableTo: ('Monthly' | 'Quarterly' | 'Yearly')[];
  redemptions: number;
};

export const mockSubscriptions: Subscription[] = [];

export const mockPricings: Pricing[] = [];

// This is no longer needed as discounts are managed in Stripe
// export const mockDiscounts: Discount[] = [];

export const subscriptionDataByMonth = [
    { month: 'Jan', new: 0, total: 0 },
    { month: 'Feb', new: 0, total: 0 },
    { month: 'Mar', new: 0, total: 0 },
    { month: 'Apr', new: 0, total: 0 },
    { month: 'May', new: 0, total: 0 },
    { month: 'Jun', new: 0, total: 0 },
];

export const sampleAds: { id: number; imageUrl: string; alt: string; imageHint: string; }[] = [];

export const dailyVisitorsData: { day: string; visitors: number; }[] = [];
