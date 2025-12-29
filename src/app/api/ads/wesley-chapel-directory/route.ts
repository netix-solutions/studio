import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  type LiveAd,
  type CommunityWebsiteId,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_ICONS,
  isDirectoryListingVisible,
} from '@/lib/types';

/**
 * Wesley Chapel Community Website Sponsor Directory Route
 *
 * This endpoint serves a complete, self-contained HTML page that displays all
 * active advertisers targeting the Wesley Chapel Community Website.
 *
 * Features:
 * - Wesley Chapel Community Website branding and header
 * - Navigation links back to WesleyChapelCommunity.com
 * - Only shows advertisers targeting Wesley Chapel
 * - Featured listings appear first
 * - Click/impression tracking
 * - Light/dark theme support
 * - Fully responsive
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

export async function GET(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || request.nextUrl.host;
  const baseUrl = `${protocol}://${host}`;

  // Get parameters
  const themeParam = request.nextUrl.searchParams.get('theme') || 'light';
  const columnsParam = request.nextUrl.searchParams.get('columns') || 'auto';
  const categoryParam = request.nextUrl.searchParams.get('category') || '';

  // Wesley Chapel Community Website URLs
  const wesleyChapelBaseUrl = 'https://www.wesleychapelcommunity.com';

  // Fetch ads targeting Wesley Chapel
  let sponsors: Array<{
    id: string;
    imageUrl: string;
    targetUrl: string;
    businessName: string;
    tagline?: string;
    description?: string;
    category?: string;
    categoryLabel?: string;
    categoryIcon?: string;
    phone?: string;
    email?: string;
    websiteUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    youtubeUrl?: string;
    logoUrl?: string;
    showContactInfo: boolean;
    showSocialLinks: boolean;
    isFeatured: boolean;
    clickUrl: string;
    impressionUrl: string;
  }> = [];

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
      // If targetWebsites is not set or empty, include the ad (backwards compatibility)
      // Otherwise, only include if wesley-chapel is in the list
      if (ad.targetWebsites && ad.targetWebsites.length > 0) {
        if (!ad.targetWebsites.includes('wesley-chapel' as CommunityWebsiteId)) {
          return;
        }
      }

      const listing = ad.directoryListing!;

      // Check category filter
      if (categoryParam && listing.category !== categoryParam) {
        return;
      }

      const categoryLabel = listing.category ? BUSINESS_CATEGORY_LABELS[listing.category] : undefined;
      const categoryIcon = listing.category ? BUSINESS_CATEGORY_ICONS[listing.category] : undefined;

      sponsors.push({
        id: ad.id,
        imageUrl: ad.imageUrl,
        targetUrl: ad.targetUrl,
        businessName: listing.businessName || ad.customerName || ad.name || 'Sponsor',
        tagline: listing.tagline,
        description: listing.description,
        category: listing.category,
        categoryLabel,
        categoryIcon,
        phone: listing.phone,
        email: listing.email,
        websiteUrl: listing.websiteUrl || ad.targetUrl,
        facebookUrl: listing.facebookUrl,
        instagramUrl: listing.instagramUrl,
        linkedinUrl: listing.linkedinUrl,
        twitterUrl: listing.twitterUrl,
        youtubeUrl: listing.youtubeUrl,
        logoUrl: listing.logoUrl,
        showContactInfo: listing.showContactInfo ?? true,
        showSocialLinks: listing.showSocialLinks ?? true,
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

  // Generate the HTML directory page
  const directoryHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Wesley Chapel Community Sponsor Directory</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Reset and base styles */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      font-size: 16px;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      line-height: 1.5;
      min-height: 100vh;
      background: #f8fafc;
      color: #1e293b;
    }

    body.theme-dark {
      background: #0f172a;
      color: #f1f5f9;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    /* Wesley Chapel Header */
    .wc-header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
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
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }

    .wc-logo img {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }

    .wc-site-name {
      color: white;
    }

    .wc-site-name-main {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .wc-site-name-sub {
      font-size: 1.25rem;
      font-weight: 600;
      opacity: 0.9;
    }

    .wc-header-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
    }

    .wc-advertise-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .wc-advertise-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    /* Navigation */
    .wc-nav {
      background: linear-gradient(135deg, #2d5a87 0%, #3d7ab5 100%);
    }

    .wc-nav-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 24px;
    }

    .wc-nav-list {
      display: flex;
      list-style: none;
      gap: 4px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .wc-nav-list::-webkit-scrollbar {
      display: none;
    }

    .wc-nav-item a {
      display: block;
      padding: 14px 20px;
      color: white;
      font-weight: 500;
      font-size: 0.9375rem;
      white-space: nowrap;
      transition: background 0.2s;
      border-radius: 4px 4px 0 0;
    }

    .wc-nav-item a:hover {
      background: rgba(255,255,255,0.1);
    }

    .wc-nav-item.active a {
      background: rgba(255,255,255,0.2);
    }

    /* Page Content */
    .page-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px 48px;
    }

    /* Page Title */
    .page-title {
      text-align: center;
      margin-bottom: 32px;
    }

    .page-title h1 {
      font-size: 2.25rem;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 8px;
    }

    body.theme-dark .page-title h1 {
      color: #60a5fa;
    }

    .page-title p {
      font-size: 1.125rem;
      color: #64748b;
      max-width: 600px;
      margin: 0 auto;
    }

    body.theme-dark .page-title p {
      color: #94a3b8;
    }

    /* Stats */
    .stats-bar {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin-bottom: 24px;
      padding: 16px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    body.theme-dark .stats-bar {
      background: #1e293b;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e3a5f;
    }

    body.theme-dark .stat-value {
      color: #60a5fa;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Sponsors Grid */
    .sponsors-grid {
      display: grid;
      gap: 24px;
    }

    .sponsors-grid.columns-auto {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    }

    .sponsors-grid.columns-2 {
      grid-template-columns: repeat(2, 1fr);
    }

    .sponsors-grid.columns-3 {
      grid-template-columns: repeat(3, 1fr);
    }

    .sponsors-grid.columns-4 {
      grid-template-columns: repeat(4, 1fr);
    }

    @media (max-width: 768px) {
      .sponsors-grid.columns-3,
      .sponsors-grid.columns-4 {
        grid-template-columns: repeat(2, 1fr);
      }

      .wc-header-top {
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }

      .wc-header-actions {
        flex-direction: row;
        width: 100%;
        justify-content: center;
      }

      .wc-site-name-main {
        font-size: 1.5rem;
      }

      .wc-site-name-sub {
        font-size: 1rem;
      }
    }

    @media (max-width: 480px) {
      .sponsors-grid,
      .sponsors-grid.columns-2,
      .sponsors-grid.columns-3,
      .sponsors-grid.columns-4 {
        grid-template-columns: 1fr;
      }
    }

    /* Sponsor Card */
    .sponsor-card {
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      text-decoration: none;
      color: inherit;
      position: relative;
    }

    body.theme-dark .sponsor-card {
      background: #1e293b;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
    }

    .sponsor-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    }

    body.theme-dark .sponsor-card:hover {
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    }

    /* Featured badge */
    .featured-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      z-index: 10;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    /* Category badge */
    .category-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: rgba(0,0,0,0.6);
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      z-index: 10;
      backdrop-filter: blur(4px);
    }

    /* Sponsor Image */
    .sponsor-image-container {
      position: relative;
      width: 100%;
      padding-bottom: 33.33%;
      background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
      overflow: hidden;
    }

    body.theme-dark .sponsor-image-container {
      background: linear-gradient(135deg, #334155 0%, #475569 100%);
    }

    .sponsor-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.5s ease;
    }

    .sponsor-image.loaded {
      opacity: 1;
    }

    .sponsor-logo-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 100%);
    }

    body.theme-dark .sponsor-logo-container {
      background: linear-gradient(135deg, #334155 0%, #475569 100%);
    }

    .sponsor-logo {
      max-width: 60%;
      max-height: 80%;
      object-fit: contain;
    }

    /* Sponsor Info */
    .sponsor-info {
      padding: 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .sponsor-name {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 4px 0;
    }

    body.theme-dark .sponsor-name {
      color: #f1f5f9;
    }

    .sponsor-tagline {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0 0 8px 0;
      font-style: italic;
    }

    body.theme-dark .sponsor-tagline {
      color: #94a3b8;
    }

    .sponsor-description {
      font-size: 0.875rem;
      color: #475569;
      margin: 0 0 12px 0;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.5;
    }

    body.theme-dark .sponsor-description {
      color: #cbd5e1;
    }

    /* Contact info */
    .sponsor-contact {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }

    body.theme-dark .sponsor-contact {
      border-top-color: #334155;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: #64748b;
    }

    body.theme-dark .contact-item {
      color: #94a3b8;
    }

    .contact-item svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    /* Social links */
    .sponsor-social {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .social-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #64748b;
      transition: background 0.2s, color 0.2s, transform 0.2s;
    }

    body.theme-dark .social-link {
      background: #334155;
      color: #94a3b8;
    }

    .social-link:hover {
      background: #3b82f6;
      color: white;
      transform: scale(1.1);
    }

    .social-link svg {
      width: 14px;
      height: 14px;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 80px 20px;
    }

    .empty-state-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      opacity: 0.5;
    }

    .empty-state-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .empty-state-description {
      opacity: 0.7;
    }

    /* CTA Section */
    .cta-section {
      text-align: center;
      padding: 48px 20px;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      border-radius: 24px;
      margin-top: 48px;
    }

    .cta-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
    }

    .cta-description {
      font-size: 1.125rem;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 24px;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }

    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background: #ffffff;
      color: #1e3a5f;
      font-size: 1.125rem;
      font-weight: 600;
      border-radius: 12px;
      text-decoration: none;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    }

    /* Footer */
    .wc-footer {
      text-align: center;
      padding: 24px;
      font-size: 0.875rem;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      margin-top: 48px;
    }

    body.theme-dark .wc-footer {
      border-top-color: #334155;
      color: #94a3b8;
    }

    .wc-footer a {
      color: #3b82f6;
    }

    .wc-footer a:hover {
      text-decoration: underline;
    }

    /* Tracking pixel */
    .tracking-pixel {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
  </style>
</head>
<body class="theme-${themeParam}">
  <!-- Wesley Chapel Community Header -->
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
        <a href="${wesleyChapelBaseUrl}/advertise" class="wc-advertise-btn" target="_top">
          Advertise With Us &gt;
        </a>
      </div>
    </div>
    <nav class="wc-nav">
      <div class="wc-nav-container">
        <ul class="wc-nav-list">
          <li class="wc-nav-item"><a href="${wesleyChapelBaseUrl}" target="_top">Home</a></li>
          <li class="wc-nav-item"><a href="${wesleyChapelBaseUrl}/news" target="_top">News</a></li>
          <li class="wc-nav-item"><a href="${wesleyChapelBaseUrl}/pictures" target="_top">Pictures</a></li>
          <li class="wc-nav-item active"><a href="${wesleyChapelBaseUrl}/sponsors" target="_top">View Our Sponsors</a></li>
          <li class="wc-nav-item"><a href="${wesleyChapelBaseUrl}/neighborhoods" target="_top">Neighborhoods</a></li>
          <li class="wc-nav-item"><a href="${wesleyChapelBaseUrl}/about" target="_top">About</a></li>
          <li class="wc-nav-item"><a href="${wesleyChapelBaseUrl}/contact" target="_top">Contact</a></li>
        </ul>
      </div>
    </nav>
  </header>

  <main class="page-container">
    <div class="page-title">
      <h1>Our Sponsors</h1>
      <p>Thank you to these amazing local businesses for supporting the Wesley Chapel community!</p>
    </div>

    ${sponsors.length > 0 ? `
    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-value">${sponsors.length}</div>
        <div class="stat-label">Local Businesses</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${sponsors.filter(s => s.isFeatured).length}</div>
        <div class="stat-label">Featured</div>
      </div>
    </div>

    <div class="sponsors-grid columns-${columnsParam}">
      ${sponsors.map(sponsor => renderSponsorCard(sponsor)).join('')}
    </div>
    ` : renderEmptyState()}

    <section class="cta-section">
      <h2 class="cta-title">Want to Become a Sponsor?</h2>
      <p class="cta-description">Support the Wesley Chapel community and get your business in front of thousands of local residents.</p>
      <a href="${wesleyChapelBaseUrl}/advertise" class="cta-button" target="_top">Learn More</a>
    </section>
  </main>

  <footer class="wc-footer">
    <p>
      <a href="${wesleyChapelBaseUrl}" target="_top">WesleyChapelCommunity.com</a> &bull;
      Powered by <a href="https://community-websites.com" target="_blank" rel="noopener">Community-Website.com</a>
    </p>
  </footer>

  <script>
    (function() {
      'use strict';

      // Handle image loading
      document.querySelectorAll('.sponsor-image').forEach(function(img) {
        if (img.complete) {
          img.classList.add('loaded');
        } else {
          img.addEventListener('load', function() {
            img.classList.add('loaded');
          });
        }
      });

      // Track clicks (stop propagation for social links)
      document.querySelectorAll('.social-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.stopPropagation();
        });
      });

      // Notify parent of height for iframe resizing
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            source: 'wesley-chapel-directory',
            type: 'resize',
            height: document.body.scrollHeight
          }, '*');
        }
      } catch (e) {}
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
 * Render a single sponsor card
 */
function renderSponsorCard(sponsor: any): string {
  const hasSocialLinks = sponsor.showSocialLinks && (
    sponsor.facebookUrl || sponsor.instagramUrl || sponsor.linkedinUrl || sponsor.twitterUrl || sponsor.youtubeUrl
  );

  return `
    <a href="${escapeHtml(sponsor.clickUrl)}"
       class="sponsor-card"
       target="_blank"
       rel="noopener sponsored"
       title="Visit ${escapeHtml(sponsor.businessName)}">

      ${sponsor.isFeatured ? '<span class="featured-badge">Featured</span>' : ''}
      ${sponsor.categoryLabel ? `<span class="category-badge">${escapeHtml(sponsor.categoryIcon || '')} ${escapeHtml(sponsor.categoryLabel)}</span>` : ''}

      <div class="sponsor-image-container">
        ${sponsor.imageUrl ? `
          <img class="sponsor-image"
               src="${escapeHtml(sponsor.imageUrl)}"
               alt="${escapeHtml(sponsor.businessName)}"
               loading="lazy"
               onload="this.classList.add('loaded')" />
        ` : sponsor.logoUrl ? `
          <div class="sponsor-logo-container">
            <img class="sponsor-logo"
                 src="${escapeHtml(sponsor.logoUrl)}"
                 alt="${escapeHtml(sponsor.businessName)}"
                 loading="lazy" />
          </div>
        ` : ''}
      </div>

      <div class="sponsor-info">
        <h3 class="sponsor-name">${escapeHtml(sponsor.businessName)}</h3>
        ${sponsor.tagline ? `<p class="sponsor-tagline">${escapeHtml(sponsor.tagline)}</p>` : ''}
        ${sponsor.description ? `<p class="sponsor-description">${escapeHtml(sponsor.description)}</p>` : ''}

        ${sponsor.showContactInfo && (sponsor.phone || sponsor.email) ? `
          <div class="sponsor-contact">
            ${sponsor.phone ? `
              <span class="contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                ${escapeHtml(sponsor.phone)}
              </span>
            ` : ''}
            ${sponsor.email ? `
              <span class="contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                ${escapeHtml(sponsor.email)}
              </span>
            ` : ''}
          </div>
        ` : ''}

        ${hasSocialLinks ? `
          <div class="sponsor-social" onclick="event.stopPropagation();">
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
              <a href="${escapeHtml(sponsor.twitterUrl)}" class="social-link" target="_blank" rel="noopener" title="Twitter/X" onclick="event.stopPropagation();">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            ` : ''}
            ${sponsor.youtubeUrl ? `
              <a href="${escapeHtml(sponsor.youtubeUrl)}" class="social-link" target="_blank" rel="noopener" title="YouTube" onclick="event.stopPropagation();">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            ` : ''}
          </div>
        ` : ''}

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
      <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 9h6v6H9z"/>
      </svg>
      <h2 class="empty-state-title">No Sponsors Yet</h2>
      <p class="empty-state-description">Check back soon for our amazing sponsors!</p>
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
