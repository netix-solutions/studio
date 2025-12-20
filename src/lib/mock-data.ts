export type Subscription = {
  id: string;
  customerName: string;
  customerEmail: string;
  website: string;
  plan: 'Monthly' | 'Quarterly' | 'Yearly';
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expired' | 'Cancelled';
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

export const mockSubscriptions: Subscription[] = [
  {
    id: 'SUB001',
    customerName: 'Alice Johnson',
    customerEmail: 'alice.j@example.com',
    website: 'sunset-community.com',
    plan: 'Quarterly',
    startDate: '2024-04-01',
    endDate: '2024-07-01',
    status: 'Active',
    amount: 270,
  },
  {
    id: 'SUB002',
    customerName: 'Bob Williams',
    customerEmail: 'bob.w@example.com',
    website: 'riverdale-news.com',
    plan: 'Monthly',
    startDate: '2024-06-15',
    endDate: '2024-07-15',
    status: 'Active',
    amount: 50,
  },
  {
    id: 'SUB003',
    customerName: 'Charlie Brown',
    customerEmail: 'charlie.b@example.com',
    website: 'mountain-view.org',
    plan: 'Yearly',
    startDate: '2024-01-01',
    endDate: '2025-01-01',
    status: 'Active',
    amount: 960,
  },
  {
    id: 'SUB004',
    customerName: 'Diana Prince',
    customerEmail: 'diana.p@example.com',
    website: 'sunset-community.com',
    plan: 'Monthly',
    startDate: '2024-05-01',
    endDate: '2024-06-01',
    status: 'Expired',
    amount: 100,
  },
    {
    id: 'SUB005',
    customerName: 'Ethan Hunt',
    customerEmail: 'ethan.h@example.com',
    website: 'lakeside-gazette.net',
    plan: 'Yearly',
    startDate: '2023-09-01',
    endDate: '2024-09-01',
    status: 'Active',
    amount: 480,
  },
];

export const mockPricings: Pricing[] = [
  {
    id: 'PRICE01',
    website: 'sunset-community.com',
    monthly: 100,
    quarterly: 270,
    yearly: 960,
  },
  {
    id: 'PRICE02',
    website: 'riverdale-news.com',
    monthly: 50,
    quarterly: 135,
    yearly: 480,
  },
  {
    id: 'PRICE03',
    website: 'mountain-view.org',
    monthly: 75,
    quarterly: 200,
    yearly: 720,
  },
    {
    id: 'PRICE04',
    website: 'lakeside-gazette.net',
    monthly: 45,
    quarterly: 120,
    yearly: 430,
  },
];

export const mockDiscounts: Discount[] = [
  {
    id: 'DISC01',
    code: 'NEW20',
    percentage: 20,
    status: 'Active',
    applicableTo: ['Monthly', 'Quarterly'],
    redemptions: 42,
  },
  {
    id: 'DISC02',
    code: 'YEARLY50',
    percentage: 50,
    status: 'Active',
    applicableTo: ['Yearly'],
    redemptions: 15,
  },
  {
    id: 'DISC03',
    code: 'SUMMER10',
    percentage: 10,
    status: 'Expired',
    applicableTo: ['Monthly'],
    redemptions: 120,
  },
];

export const subscriptionDataByMonth = [
    { month: 'Jan', new: 15, total: 50 },
    { month: 'Feb', new: 20, total: 65 },
    { month: 'Mar', new: 18, total: 80 },
    { month: 'Apr', new: 25, total: 100 },
    { month: 'May', new: 22, total: 118 },
    { month: 'Jun', new: 30, total: 140 },
];
