import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  type LiveAd,
  type CommunityWebsiteId,
  type BusinessCategory,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_ICONS,
  BUSINESS_CATEGORIES,
  isDirectoryListingVisible,
} from '@/lib/types';

/**
 * Wesley Chapel Community Business Directory
 *
 * This endpoint serves a complete, self-contained HTML page that displays all
 * active advertisers targeting the Wesley Chapel Community Website as a
 * comprehensive local business directory.
 *
 * Features:
 * - Wesley Chapel Community Website branding and header
 * - Search functionality for finding businesses
 * - Category filtering with visual icons
 * - Featured businesses highlighted
 * - Statistics dashboard
 * - Modern, responsive card-based layout
 * - Light/dark theme support
 * - Click/impression tracking
 * - Mobile-first design
 */

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=300',
  'X-Frame-Options': 'ALLOWALL',
  'Content-Security-Policy': "frame-ancestors *",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

interface SponsorData {
  id: string;
  imageUrl: string;
  targetUrl: string;
  businessName: string;
  tagline?: string;
  description?: string;
  category?: BusinessCategory;
  categoryLabel?: string;
  categoryIcon?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  logoUrl?: string;
  bannerImageUrl?: string;
  yearEstablished?: number;
  showContactInfo: boolean;
  showSocialLinks: boolean;
  showAddress: boolean;
  isFeatured: boolean;
  clickUrl: string;
  impressionUrl: string;
}

export async function GET(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || request.nextUrl.host;
  const baseUrl = `${protocol}://${host}`;

  // Get parameters
  const themeParam = request.nextUrl.searchParams.get('theme') || 'light';

  // Wesley Chapel Community Website URLs
  const wesleyChapelBaseUrl = 'https://www.wesleychapelcommunity.com';

  // Fetch ads targeting Wesley Chapel
  let sponsors: SponsorData[] = [];
  const categoryStats: Record<string, number> = {};

  try {
    const db = getAdminFirestore();
    // Query active listings
    const query = db.collection('live_ads')
      .where('status', '==', 'active');

    const snapshot = await query.get();

    snapshot.forEach((doc) => {
      const ad = { id: doc.id, ...doc.data() } as LiveAd;

      // Check if directory listing is visible (approved)
      if (!isDirectoryListingVisible(ad)) {
        return;
      }

      // IMPORTANT: Only include ads targeting Wesley Chapel
      if (ad.targetWebsites && ad.targetWebsites.length > 0) {
        if (!ad.targetWebsites.includes('wesley-chapel' as CommunityWebsiteId)) {
          return;
        }
      }

      const listing = ad.directoryListing!;
      const category = listing.category;

      // Track category statistics
      if (category) {
        categoryStats[category] = (categoryStats[category] || 0) + 1;
      }

      const categoryLabel = category ? BUSINESS_CATEGORY_LABELS[category] : undefined;
      const categoryIcon = category ? BUSINESS_CATEGORY_ICONS[category] : undefined;

      sponsors.push({
        id: ad.id,
        imageUrl: ad.imageUrl,
        targetUrl: ad.targetUrl,
        businessName: listing.businessName || ad.customerName || ad.name || 'Sponsor',
        tagline: listing.tagline,
        description: listing.description,
        category,
        categoryLabel,
        categoryIcon,
        phone: listing.phone,
        email: listing.email,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        zipCode: listing.zipCode,
        websiteUrl: listing.websiteUrl || ad.targetUrl,
        facebookUrl: listing.facebookUrl,
        instagramUrl: listing.instagramUrl,
        linkedinUrl: listing.linkedinUrl,
        twitterUrl: listing.twitterUrl,
        youtubeUrl: listing.youtubeUrl,
        tiktokUrl: listing.tiktokUrl,
        logoUrl: listing.logoUrl,
        bannerImageUrl: listing.bannerImageUrl,
        yearEstablished: listing.yearEstablished,
        showContactInfo: listing.showContactInfo ?? true,
        showSocialLinks: listing.showSocialLinks ?? true,
        showAddress: listing.showAddress ?? false,
        isFeatured: !!listing.isFeatured,
        clickUrl: `${baseUrl}/api/ads/click?id=${ad.id}`,
        impressionUrl: `${baseUrl}/api/ads/impression?id=${ad.id}`,
      });
    });

    // Sort: featured first, then alphabetically by business name
    sponsors.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return a.businessName.localeCompare(b.businessName);
    });

  } catch (error) {
    console.error('Error fetching Wesley Chapel sponsors:', error);
  }

  // Build category data for the filter
  const categoriesWithCount = Object.entries(BUSINESS_CATEGORIES)
    .map(([, value]) => ({
      id: value,
      label: BUSINESS_CATEGORY_LABELS[value],
      icon: BUSINESS_CATEGORY_ICONS[value],
      count: categoryStats[value] || 0,
    }))
    .filter(cat => cat.count > 0)
    .sort((a, b) => b.count - a.count);

  const featuredSponsors = sponsors.filter(s => s.isFeatured);
  const totalCategories = categoriesWithCount.length;

  // Generate the HTML directory page
  const directoryHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Wesley Chapel Business Directory | Local Businesses & Services</title>
  <meta name="description" content="Discover local businesses and services in Wesley Chapel. Browse our directory of trusted local businesses serving the Wesley Chapel community.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    /* Reset and base styles */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --color-primary: #1e3a5f;
      --color-primary-light: #2d5a87;
      --color-primary-lighter: #3d7ab5;
      --color-accent: #3b82f6;
      --color-accent-hover: #2563eb;
      --color-featured: #f59e0b;
      --color-featured-dark: #d97706;
      --color-success: #10b981;
      --color-bg: #f8fafc;
      --color-bg-card: #ffffff;
      --color-bg-secondary: #f1f5f9;
      --color-text: #1e293b;
      --color-text-secondary: #64748b;
      --color-text-muted: #94a3b8;
      --color-border: #e2e8f0;
      --color-border-light: #f1f5f9;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
      --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --radius-xl: 24px;
    }

    body.theme-dark {
      --color-bg: #0f172a;
      --color-bg-card: #1e293b;
      --color-bg-secondary: #334155;
      --color-text: #f1f5f9;
      --color-text-secondary: #94a3b8;
      --color-text-muted: #64748b;
      --color-border: #334155;
      --color-border-light: #475569;
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.3);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.3);
      --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.4);
    }

    html {
      font-size: 16px;
      scroll-behavior: smooth;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      line-height: 1.6;
      min-height: 100vh;
      background: var(--color-bg);
      color: var(--color-text);
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    img {
      max-width: 100%;
      height: auto;
    }

    /* Wesley Chapel Header */
    .wc-header {
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 50%, var(--color-primary-lighter) 100%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .wc-header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .wc-logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .wc-logo {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .wc-logo img {
      width: 60px;
      height: 60px;
      object-fit: cover;
    }

    .wc-site-name {
      color: white;
    }

    .wc-site-name-main {
      font-size: 1.5rem;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.03em;
      text-shadow: rgba(0, 0, 0, 0.4) 0px 2px 4px;
    }

    .wc-site-name-sub {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      text-shadow: rgba(0, 0, 0, 0.4) 0px 2px 4px;
      color: rgba(255,255,255,0.85);
    }

    .wc-header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .wc-home-btn, .wc-advertise-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .wc-home-btn {
      background: rgba(255,255,255,0.15);
      color: white;
      backdrop-filter: blur(4px);
    }

    .wc-home-btn:hover {
      background: rgba(255,255,255,0.25);
    }

    .wc-advertise-btn {
      background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
      color: white;
    }

    .wc-advertise-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    /* Hero Section */
    .hero {
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
      padding: 48px 24px 64px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
      opacity: 0.5;
    }

    .hero-content {
      max-width: 800px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }

    .hero h1 {
      font-size: 2.5rem;
      font-weight: 800;
      color: white;
      margin-bottom: 12px;
      letter-spacing: -0.02em;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .hero p {
      font-size: 1.125rem;
      color: rgba(255,255,255,0.9);
      max-width: 600px;
      margin: 0 auto 32px;
    }

    /* Search Box */
    .search-container {
      max-width: 600px;
      margin: 0 auto;
      position: relative;
    }

    .search-box {
      display: flex;
      align-items: center;
      background: white;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      overflow: hidden;
    }

    .search-icon {
      padding: 0 16px;
      color: var(--color-text-muted);
    }

    .search-input {
      flex: 1;
      padding: 16px 0;
      border: none;
      outline: none;
      font-size: 1rem;
      font-family: inherit;
      color: var(--color-text);
      background: transparent;
    }

    .search-input::placeholder {
      color: var(--color-text-muted);
    }

    .search-btn {
      padding: 12px 24px;
      margin: 6px;
      background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .search-btn:hover {
      transform: scale(1.02);
    }

    /* Stats Bar */
    .stats-bar {
      display: flex;
      justify-content: center;
      gap: 48px;
      padding: 24px;
      background: var(--color-bg-card);
      border-bottom: 1px solid var(--color-border);
      flex-wrap: wrap;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 800;
      color: var(--color-primary);
      line-height: 1;
    }

    body.theme-dark .stat-value {
      color: var(--color-accent);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 4px;
    }

    /* Main Container */
    .main-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px 48px;
    }

    /* Category Filter */
    .category-section {
      margin-bottom: 32px;
    }

    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .category-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .category-clear {
      font-size: 0.875rem;
      color: var(--color-accent);
      cursor: pointer;
      display: none;
    }

    .category-clear.visible {
      display: block;
    }

    .category-clear:hover {
      text-decoration: underline;
    }

    .category-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .category-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 50px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .category-chip:hover {
      border-color: var(--color-accent);
      background: var(--color-bg-secondary);
    }

    .category-chip.active {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: white;
    }

    .category-chip .icon {
      font-size: 1rem;
    }

    .category-chip .count {
      background: rgba(0,0,0,0.1);
      padding: 2px 8px;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .category-chip.active .count {
      background: rgba(255,255,255,0.25);
    }

    /* Results Header */
    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .results-count {
      font-size: 1rem;
      color: var(--color-text-secondary);
    }

    .results-count strong {
      color: var(--color-text);
    }

    .view-toggle {
      display: flex;
      gap: 4px;
      background: var(--color-bg-secondary);
      padding: 4px;
      border-radius: var(--radius-md);
    }

    .view-btn {
      padding: 8px 12px;
      border: none;
      background: transparent;
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--color-text-secondary);
      transition: all 0.2s;
    }

    .view-btn:hover {
      color: var(--color-text);
    }

    .view-btn.active {
      background: var(--color-bg-card);
      color: var(--color-text);
      box-shadow: var(--shadow-sm);
    }

    /* Featured Section */
    .featured-section {
      margin-bottom: 48px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text);
    }

    .featured-badge-header {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: linear-gradient(135deg, var(--color-featured) 0%, var(--color-featured-dark) 100%);
      color: white;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    /* Business Grid */
    .business-grid {
      display: grid;
      gap: 24px;
    }

    .business-grid.view-grid {
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    }

    .business-grid.view-list {
      grid-template-columns: 1fr;
    }

    /* Business Card */
    .business-card {
      display: flex;
      flex-direction: column;
      background: var(--color-bg-card);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-md);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      text-decoration: none;
      color: inherit;
      position: relative;
    }

    .business-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-xl);
    }

    .view-list .business-card {
      flex-direction: row;
    }

    /* Featured indicator */
    .featured-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: linear-gradient(135deg, var(--color-featured) 0%, var(--color-featured-dark) 100%);
      color: white;
      padding: 6px 12px;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 600;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
    }

    .featured-badge svg {
      width: 14px;
      height: 14px;
    }

    /* Category badge */
    .category-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 6px 12px;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 500;
      z-index: 10;
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Image Container */
    .card-image-container {
      position: relative;
      width: 100%;
      padding-bottom: 50%;
      background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-border) 100%);
      overflow: hidden;
    }

    .view-list .card-image-container {
      width: 280px;
      min-width: 280px;
      padding-bottom: 0;
      height: 200px;
    }

    .card-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.5s ease, transform 0.5s ease;
    }

    .card-image.loaded {
      opacity: 1;
    }

    .business-card:hover .card-image.loaded {
      transform: scale(1.05);
    }

    .card-logo-fallback {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-border-light) 100%);
    }

    .card-logo {
      max-width: 50%;
      max-height: 60%;
      object-fit: contain;
    }

    /* Card Content */
    .card-content {
      padding: 20px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .card-header {
      margin-bottom: 12px;
    }

    .business-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0 0 4px 0;
      line-height: 1.3;
    }

    .business-tagline {
      font-size: 0.875rem;
      color: var(--color-accent);
      font-weight: 500;
      margin: 0;
    }

    .business-description {
      font-size: 0.9rem;
      color: var(--color-text-secondary);
      margin: 0 0 16px 0;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.6;
    }

    .view-list .business-description {
      -webkit-line-clamp: 2;
    }

    /* Card Meta Info */
    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid var(--color-border);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--color-text-secondary);
    }

    .meta-item svg {
      width: 16px;
      height: 16px;
      color: var(--color-text-muted);
    }

    .meta-item a {
      color: var(--color-text-secondary);
      transition: color 0.2s;
    }

    .meta-item a:hover {
      color: var(--color-accent);
    }

    /* Social Links */
    .card-social {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .social-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-bg-secondary);
      color: var(--color-text-secondary);
      transition: all 0.2s;
    }

    .social-link:hover {
      background: var(--color-accent);
      color: white;
      transform: scale(1.1);
    }

    .social-link svg {
      width: 16px;
      height: 16px;
    }

    /* Visit Button */
    .visit-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      margin-top: 16px;
      background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
      color: white;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .visit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .visit-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: var(--color-bg-card);
      border-radius: var(--radius-xl);
      border: 2px dashed var(--color-border);
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      color: var(--color-text-muted);
    }

    .empty-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text);
      margin-bottom: 8px;
    }

    .empty-description {
      font-size: 1rem;
      color: var(--color-text-secondary);
      max-width: 400px;
      margin: 0 auto 24px;
    }

    .empty-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: var(--color-accent);
      color: white;
      border-radius: var(--radius-md);
      font-weight: 600;
      transition: all 0.2s;
    }

    .empty-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    /* No Results */
    .no-results {
      text-align: center;
      padding: 60px 20px;
    }

    .no-results-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      color: var(--color-text-muted);
    }

    .no-results-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 8px;
    }

    .no-results-description {
      color: var(--color-text-secondary);
    }

    /* CTA Section */
    .cta-section {
      text-align: center;
      padding: 64px 24px;
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 50%, var(--color-primary-lighter) 100%);
      border-radius: var(--radius-xl);
      margin-top: 64px;
      position: relative;
      overflow: hidden;
    }

    .cta-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
      opacity: 0.5;
    }

    .cta-content {
      position: relative;
      z-index: 1;
    }

    .cta-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 24px;
      padding: 16px;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      color: white;
    }

    .cta-title {
      font-size: 2rem;
      font-weight: 800;
      color: white;
      margin-bottom: 12px;
    }

    .cta-description {
      font-size: 1.125rem;
      color: rgba(255,255,255,0.9);
      max-width: 500px;
      margin: 0 auto 32px;
    }

    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 16px 32px;
      background: white;
      color: var(--color-primary);
      font-size: 1.125rem;
      font-weight: 700;
      border-radius: var(--radius-lg);
      transition: all 0.2s;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    }

    .cta-button svg {
      width: 20px;
      height: 20px;
    }

    /* Footer */
    .wc-footer {
      text-align: center;
      padding: 32px 24px;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      border-top: 1px solid var(--color-border);
      margin-top: 48px;
    }

    .wc-footer a {
      color: var(--color-accent);
    }

    .wc-footer a:hover {
      text-decoration: underline;
    }

    .footer-links {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    /* Tracking pixel */
    .tracking-pixel {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .hero h1 {
        font-size: 2rem;
      }

      .stats-bar {
        gap: 32px;
      }

      .stat-value {
        font-size: 1.5rem;
      }
    }

    @media (max-width: 768px) {
      .wc-header-top {
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }

      .wc-header-actions {
        width: 100%;
        justify-content: center;
      }

      .hero {
        padding: 32px 16px 48px;
      }

      .hero h1 {
        font-size: 1.75rem;
      }

      .hero p {
        font-size: 1rem;
      }

      .search-btn {
        padding: 10px 16px;
        font-size: 0.875rem;
      }

      .stats-bar {
        gap: 24px;
        padding: 20px 16px;
      }

      .stat-value {
        font-size: 1.25rem;
      }

      .main-container {
        padding: 24px 16px;
      }

      .business-grid.view-grid {
        grid-template-columns: 1fr;
      }

      .view-list .business-card {
        flex-direction: column;
      }

      .view-list .card-image-container {
        width: 100%;
        height: auto;
        padding-bottom: 50%;
      }

      .category-grid {
        overflow-x: auto;
        flex-wrap: nowrap;
        padding-bottom: 8px;
        -webkit-overflow-scrolling: touch;
      }

      .category-chip {
        flex-shrink: 0;
      }

      .results-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    @media (max-width: 480px) {
      .wc-logo {
        width: 48px;
        height: 48px;
      }

      .wc-logo img {
        width: 48px;
        height: 48px;
      }

      .wc-site-name-main {
        font-size: 1.25rem;
      }

      .wc-site-name-sub {
        font-size: 1rem;
      }

      .wc-home-btn, .wc-advertise-btn {
        padding: 8px 12px;
        font-size: 0.8rem;
      }

      .cta-title {
        font-size: 1.5rem;
      }

      .cta-description {
        font-size: 1rem;
      }

      .cta-button {
        padding: 14px 24px;
        font-size: 1rem;
      }
    }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .business-card {
      animation: fadeIn 0.4s ease forwards;
    }

    .business-grid .business-card:nth-child(1) { animation-delay: 0.05s; }
    .business-grid .business-card:nth-child(2) { animation-delay: 0.1s; }
    .business-grid .business-card:nth-child(3) { animation-delay: 0.15s; }
    .business-grid .business-card:nth-child(4) { animation-delay: 0.2s; }
    .business-grid .business-card:nth-child(5) { animation-delay: 0.25s; }
    .business-grid .business-card:nth-child(6) { animation-delay: 0.3s; }
  </style>
</head>
<body class="theme-${themeParam}">
  <!-- Wesley Chapel Header -->
  <header class="wc-header">
    <div class="wc-header-top">
      <a href="${wesleyChapelBaseUrl}" class="wc-logo-container" target="_top">
        <div class="wc-logo">
          <img src="${baseUrl}/WESLEYCHAPEL.png" alt="Wesley Chapel Community" />
        </div>
        <div class="wc-site-name">
          <div class="wc-site-name-main">Wesley Chapel</div>
          <div class="wc-site-name-sub">Community.com</div>
        </div>
      </a>
      <div class="wc-header-actions">
        <a href="${wesleyChapelBaseUrl}" class="wc-home-btn" target="_top">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Home</span>
        </a>
        <a href="https://community-websites.com" class="wc-advertise-btn" target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span>Advertise With Us</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <h1>Wesley Chapel Business Directory</h1>
      <p>Discover trusted local businesses and services serving the Wesley Chapel community</p>
      <div class="search-container">
        <div class="search-box">
          <span class="search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </span>
          <input type="text" class="search-input" id="searchInput" placeholder="Search businesses, services, or categories..." autocomplete="off">
          <button class="search-btn" id="searchBtn">Search</button>
        </div>
      </div>
    </div>
  </section>

  <!-- Stats Bar -->
  <div class="stats-bar">
    <div class="stat-item">
      <div class="stat-value">${sponsors.length}</div>
      <div class="stat-label">Local Businesses</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${featuredSponsors.length}</div>
      <div class="stat-label">Featured</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${totalCategories}</div>
      <div class="stat-label">Categories</div>
    </div>
  </div>

  <main class="main-container">
    ${sponsors.length > 0 ? `
    <!-- Category Filter -->
    ${categoriesWithCount.length > 0 ? `
    <div class="category-section">
      <div class="category-header">
        <h2 class="category-title">Browse by Category</h2>
        <span class="category-clear" id="clearCategory">Clear filter</span>
      </div>
      <div class="category-grid">
        ${categoriesWithCount.map(cat => `
          <button class="category-chip" data-category="${cat.id}">
            <span class="icon">${cat.icon}</span>
            <span>${cat.label}</span>
            <span class="count">${cat.count}</span>
          </button>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Results Header -->
    <div class="results-header">
      <div class="results-count">
        Showing <strong id="resultsCount">${sponsors.length}</strong> businesses
        <span id="categoryFilter"></span>
      </div>
      <div class="view-toggle">
        <button class="view-btn active" data-view="grid" title="Grid view">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
          </svg>
        </button>
        <button class="view-btn" data-view="list" title="List view">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    ${featuredSponsors.length > 0 ? `
    <!-- Featured Section -->
    <section class="featured-section" id="featuredSection">
      <div class="section-header">
        <h2 class="section-title">Featured Businesses</h2>
        <span class="featured-badge-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Featured
        </span>
      </div>
      <div class="business-grid view-grid" id="featuredGrid">
        ${featuredSponsors.map(sponsor => renderBusinessCard(sponsor, true)).join('')}
      </div>
    </section>
    ` : ''}

    <!-- All Businesses -->
    <section id="allBusinessesSection">
      ${featuredSponsors.length > 0 ? `
      <div class="section-header">
        <h2 class="section-title">All Businesses</h2>
      </div>
      ` : ''}
      <div class="business-grid view-grid" id="businessGrid">
        ${sponsors.map(sponsor => renderBusinessCard(sponsor, false)).join('')}
      </div>
      <div class="no-results" id="noResults" style="display: none;">
        <svg class="no-results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
          <path d="M8 8l6 6"/>
          <path d="M14 8l-6 6"/>
        </svg>
        <h3 class="no-results-title">No businesses found</h3>
        <p class="no-results-description">Try adjusting your search or filter criteria</p>
      </div>
    </section>
    ` : renderEmptyState()}

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-content">
        <div class="cta-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h2 class="cta-title">Get Your Business Listed</h2>
        <p class="cta-description">Join our directory and connect with thousands of Wesley Chapel residents looking for local services.</p>
        <a href="https://community-websites.com" class="cta-button" target="_blank" rel="noopener">
          <span>Start Advertising Today</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/>
            <path d="M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="wc-footer">
    <div class="footer-links">
      <a href="${wesleyChapelBaseUrl}" target="_top">Home</a>
      <a href="${wesleyChapelBaseUrl}/news" target="_top">News</a>
      <a href="${wesleyChapelBaseUrl}/pictures" target="_top">Pictures</a>
      <a href="${wesleyChapelBaseUrl}/neighborhoods" target="_top">Neighborhoods</a>
      <a href="${wesleyChapelBaseUrl}/about" target="_top">About</a>
      <a href="${wesleyChapelBaseUrl}/contact-us" target="_top">Contact</a>
    </div>
    <p>
      <a href="${wesleyChapelBaseUrl}" target="_top">WesleyChapelCommunity.com</a> &bull;
      Powered by <a href="https://community-websites.com" target="_blank" rel="noopener">Community-Websites.com</a>
    </p>
  </footer>

  <script>
    (function() {
      'use strict';

      // Store all business data for filtering
      const allBusinesses = ${JSON.stringify(sponsors.map(s => ({
        id: s.id,
        name: s.businessName,
        category: s.category,
        categoryLabel: s.categoryLabel,
        tagline: s.tagline,
        description: s.description,
        isFeatured: s.isFeatured
      })))};

      // DOM Elements
      const searchInput = document.getElementById('searchInput');
      const searchBtn = document.getElementById('searchBtn');
      const categoryChips = document.querySelectorAll('.category-chip');
      const clearCategoryBtn = document.getElementById('clearCategory');
      const viewBtns = document.querySelectorAll('.view-btn');
      const businessGrid = document.getElementById('businessGrid');
      const featuredGrid = document.getElementById('featuredGrid');
      const featuredSection = document.getElementById('featuredSection');
      const resultsCount = document.getElementById('resultsCount');
      const categoryFilterText = document.getElementById('categoryFilter');
      const noResults = document.getElementById('noResults');
      const allCards = document.querySelectorAll('.business-card');

      let currentCategory = '';
      let currentSearch = '';
      let currentView = 'grid';

      // Handle image loading
      document.querySelectorAll('.card-image').forEach(function(img) {
        if (img.complete) {
          img.classList.add('loaded');
        } else {
          img.addEventListener('load', function() {
            img.classList.add('loaded');
          });
        }
      });

      // Search functionality
      function performSearch() {
        currentSearch = searchInput.value.toLowerCase().trim();
        filterBusinesses();
      }

      searchBtn?.addEventListener('click', performSearch);
      searchInput?.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
          performSearch();
        }
      });

      // Debounced live search
      let searchTimeout;
      searchInput?.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 300);
      });

      // Category filtering
      categoryChips.forEach(function(chip) {
        chip.addEventListener('click', function() {
          const category = this.dataset.category;

          if (currentCategory === category) {
            // Toggle off
            currentCategory = '';
            this.classList.remove('active');
          } else {
            // Switch to new category
            categoryChips.forEach(c => c.classList.remove('active'));
            currentCategory = category;
            this.classList.add('active');
          }

          clearCategoryBtn?.classList.toggle('visible', !!currentCategory);
          filterBusinesses();
        });
      });

      clearCategoryBtn?.addEventListener('click', function() {
        currentCategory = '';
        categoryChips.forEach(c => c.classList.remove('active'));
        this.classList.remove('visible');
        filterBusinesses();
      });

      // View toggle
      viewBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          viewBtns.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          currentView = this.dataset.view;

          if (businessGrid) {
            businessGrid.classList.remove('view-grid', 'view-list');
            businessGrid.classList.add('view-' + currentView);
          }
          if (featuredGrid) {
            featuredGrid.classList.remove('view-grid', 'view-list');
            featuredGrid.classList.add('view-' + currentView);
          }
        });
      });

      // Filter businesses
      function filterBusinesses() {
        let visibleCount = 0;
        let visibleFeatured = 0;

        allCards.forEach(function(card) {
          const businessId = card.dataset.businessId;
          const business = allBusinesses.find(b => b.id === businessId);

          if (!business) {
            card.style.display = 'none';
            return;
          }

          let visible = true;

          // Category filter
          if (currentCategory && business.category !== currentCategory) {
            visible = false;
          }

          // Search filter
          if (visible && currentSearch) {
            const searchText = [
              business.name,
              business.categoryLabel,
              business.tagline,
              business.description
            ].filter(Boolean).join(' ').toLowerCase();

            if (!searchText.includes(currentSearch)) {
              visible = false;
            }
          }

          card.style.display = visible ? '' : 'none';

          if (visible) {
            visibleCount++;
            if (business.isFeatured) visibleFeatured++;
          }
        });

        // Update results count
        if (resultsCount) {
          resultsCount.textContent = visibleCount;
        }

        // Update category filter text
        if (categoryFilterText) {
          if (currentCategory) {
            const catLabel = allBusinesses.find(b => b.category === currentCategory)?.categoryLabel || currentCategory;
            categoryFilterText.textContent = ' in ' + catLabel;
          } else {
            categoryFilterText.textContent = '';
          }
        }

        // Show/hide featured section if no featured visible
        if (featuredSection) {
          featuredSection.style.display = visibleFeatured > 0 ? '' : 'none';
        }

        // Show/hide no results
        if (noResults) {
          noResults.style.display = visibleCount === 0 ? '' : 'none';
        }
      }

      // Track clicks (stop propagation for social links and contact links)
      document.querySelectorAll('.social-link, .meta-item a').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.stopPropagation();
        });
      });

      // Notify parent of height for iframe resizing
      function notifyHeight() {
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              source: 'wesley-chapel-directory',
              type: 'resize',
              height: document.body.scrollHeight
            }, '*');
          }
        } catch (e) {}
      }

      notifyHeight();
      window.addEventListener('resize', notifyHeight);

      // Re-notify after images load
      window.addEventListener('load', function() {
        setTimeout(notifyHeight, 500);
      });
    })();
  </script>
</body>
</html>
`.trim();

  return new NextResponse(directoryHtml, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Render a single business card
 */
function renderBusinessCard(sponsor: SponsorData, inFeaturedSection: boolean): string {
  const hasSocialLinks = sponsor.showSocialLinks && (
    sponsor.facebookUrl || sponsor.instagramUrl || sponsor.linkedinUrl ||
    sponsor.twitterUrl || sponsor.youtubeUrl || sponsor.tiktokUrl
  );

  const hasAddress = sponsor.showAddress && (sponsor.city || sponsor.address);
  const addressText = [sponsor.city, sponsor.state].filter(Boolean).join(', ');

  return `
    <a href="${escapeHtml(sponsor.clickUrl)}"
       class="business-card"
       data-business-id="${escapeHtml(sponsor.id)}"
       target="_blank"
       rel="noopener sponsored"
       title="Visit ${escapeHtml(sponsor.businessName)}">

      ${sponsor.isFeatured && !inFeaturedSection ? `
        <span class="featured-badge">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Featured
        </span>
      ` : ''}

      ${sponsor.categoryLabel ? `
        <span class="category-badge">
          <span>${escapeHtml(sponsor.categoryIcon || '')}</span>
          <span>${escapeHtml(sponsor.categoryLabel)}</span>
        </span>
      ` : ''}

      <div class="card-image-container">
        ${sponsor.imageUrl || sponsor.bannerImageUrl ? `
          <img class="card-image"
               src="${escapeHtml(sponsor.bannerImageUrl || sponsor.imageUrl)}"
               alt="${escapeHtml(sponsor.businessName)}"
               loading="lazy"
               onload="this.classList.add('loaded')" />
        ` : sponsor.logoUrl ? `
          <div class="card-logo-fallback">
            <img class="card-logo"
                 src="${escapeHtml(sponsor.logoUrl)}"
                 alt="${escapeHtml(sponsor.businessName)}"
                 loading="lazy" />
          </div>
        ` : `
          <div class="card-logo-fallback">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        `}
      </div>

      <div class="card-content">
        <div class="card-header">
          <h3 class="business-name">${escapeHtml(sponsor.businessName)}</h3>
          ${sponsor.tagline ? `<p class="business-tagline">${escapeHtml(sponsor.tagline)}</p>` : ''}
        </div>

        ${sponsor.description ? `
          <p class="business-description">${escapeHtml(sponsor.description)}</p>
        ` : ''}

        <div class="card-meta">
          ${sponsor.showContactInfo && sponsor.phone ? `
            <span class="meta-item" onclick="event.stopPropagation();">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <a href="tel:${escapeHtml(sponsor.phone)}">${escapeHtml(sponsor.phone)}</a>
            </span>
          ` : ''}

          ${hasAddress ? `
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>${escapeHtml(addressText)}</span>
            </span>
          ` : ''}

          ${sponsor.yearEstablished ? `
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Est. ${sponsor.yearEstablished}</span>
            </span>
          ` : ''}
        </div>

        ${hasSocialLinks ? `
          <div class="card-social" onclick="event.stopPropagation();">
            ${sponsor.facebookUrl ? `
              <a href="${escapeHtml(sponsor.facebookUrl)}" class="social-link" target="_blank" rel="noopener" title="Facebook" onclick="event.stopPropagation();">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
            ` : ''}
            ${sponsor.instagramUrl ? `
              <a href="${escapeHtml(sponsor.instagramUrl)}" class="social-link" target="_blank" rel="noopener" title="Instagram" onclick="event.stopPropagation();">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
            ` : ''}
            ${sponsor.linkedinUrl ? `
              <a href="${escapeHtml(sponsor.linkedinUrl)}" class="social-link" target="_blank" rel="noopener" title="LinkedIn" onclick="event.stopPropagation();">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            ` : ''}
            ${sponsor.twitterUrl ? `
              <a href="${escapeHtml(sponsor.twitterUrl)}" class="social-link" target="_blank" rel="noopener" title="X (Twitter)" onclick="event.stopPropagation();">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            ` : ''}
            ${sponsor.youtubeUrl ? `
              <a href="${escapeHtml(sponsor.youtubeUrl)}" class="social-link" target="_blank" rel="noopener" title="YouTube" onclick="event.stopPropagation();">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            ` : ''}
            ${sponsor.tiktokUrl ? `
              <a href="${escapeHtml(sponsor.tiktokUrl)}" class="social-link" target="_blank" rel="noopener" title="TikTok" onclick="event.stopPropagation();">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
              </a>
            ` : ''}
          </div>
        ` : ''}

        <span class="visit-btn">
          <span>Visit Website</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </span>

        <img class="tracking-pixel" src="${escapeHtml(sponsor.impressionUrl)}" alt="" aria-hidden="true" />
      </div>
    </a>
  `;
}

/**
 * Render empty state
 */
function renderEmptyState(): string {
  return `
    <div class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
      </svg>
      <h2 class="empty-title">No Businesses Listed Yet</h2>
      <p class="empty-description">Be the first to showcase your business to the Wesley Chapel community!</p>
      <a href="https://community-websites.com" class="empty-btn" target="_blank" rel="noopener">
        <span>Get Listed Today</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14"/>
          <path d="M12 5l7 7-7 7"/>
        </svg>
      </a>
    </div>
  `;
}

/**
 * Helper function to escape HTML special characters
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(text).replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}
