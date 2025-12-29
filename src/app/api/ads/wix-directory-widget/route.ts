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
 * Wix Directory Widget Route
 *
 * This endpoint serves a compact, fixed-height widget perfect for Wix embedding.
 * Instead of showing all sponsors in a scrolling page, it shows a preview with
 * a "View All Sponsors" button that opens the full directory.
 *
 * Features:
 * - Fixed height (no scrolling issues in Wix)
 * - Shows 3-6 featured/random sponsors
 * - "View All Sponsors" button links to full directory or custom URL
 * - Auto-rotating carousel option
 * - Perfect for sidebar, footer, or any fixed-size container
 *
 * Usage in Wix:
 * 1. Add an "Embed HTML" element
 * 2. Set a fixed height (recommended: 300-400px)
 * 3. Configure via URL parameters
 */

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
  const websiteParam = request.nextUrl.searchParams.get('website') || '';
  const themeParam = request.nextUrl.searchParams.get('theme') || 'light';
  const maxSponsorsParam = parseInt(request.nextUrl.searchParams.get('max') || '4', 10);
  const titleParam = request.nextUrl.searchParams.get('title') || 'Our Sponsors';
  const viewAllUrlParam = request.nextUrl.searchParams.get('viewAllUrl') || '';
  const viewAllTextParam = request.nextUrl.searchParams.get('viewAllText') || 'View All Sponsors';
  const showBrandingParam = request.nextUrl.searchParams.get('branding') !== 'false';
  const layoutParam = request.nextUrl.searchParams.get('layout') || 'grid'; // grid, carousel, list
  const autoRotateParam = request.nextUrl.searchParams.get('autoRotate') === 'true';

  // Fetch sponsors
  let sponsors: Array<{
    id: string;
    imageUrl: string;
    targetUrl: string;
    businessName: string;
    tagline?: string;
    logoUrl?: string;
    isFeatured: boolean;
    clickUrl: string;
  }> = [];

  try {
    const db = getAdminFirestore();
    const query = db.collection('live_ads')
      .where('status', '==', 'active')
      .where('showInDirectory', '==', true);

    const snapshot = await query.get();

    snapshot.forEach((doc) => {
      const ad = { id: doc.id, ...doc.data() } as LiveAd;

      if (!isDirectoryListingVisible(ad)) return;

      if (websiteParam && ad.targetWebsites?.length > 0) {
        if (!ad.targetWebsites.includes(websiteParam as CommunityWebsiteId)) return;
      }

      const listing = ad.directoryListing!;

      sponsors.push({
        id: ad.id,
        imageUrl: ad.imageUrl,
        targetUrl: ad.targetUrl,
        businessName: listing.businessName || ad.customerName || 'Sponsor',
        tagline: listing.tagline,
        logoUrl: listing.logoUrl,
        isFeatured: !!listing.isFeatured,
        clickUrl: `${baseUrl}/api/ads/click?id=${ad.id}&source=wix_widget`,
      });
    });

    // Sort: featured first, then shuffle the rest for variety
    sponsors.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return Math.random() - 0.5;
    });

    // Limit to max sponsors
    sponsors = sponsors.slice(0, maxSponsorsParam);

  } catch (error) {
    console.error('Error fetching sponsors:', error);
  }

  // Track impressions for displayed sponsors
  const impressionPixels = sponsors.map(s =>
    `<img src="${baseUrl}/api/ads/impression?id=${s.id}&source=wix_widget" style="position:absolute;width:1px;height:1px;opacity:0;" />`
  ).join('');

  const isDark = themeParam === 'dark';

  const widgetHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${escapeHtml(titleParam)}</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      height: 100%;
      overflow: hidden;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      background: ${isDark ? '#0f172a' : '#f8fafc'};
      color: ${isDark ? '#f1f5f9' : '#1e293b'};
      display: flex;
      flex-direction: column;
    }

    .widget {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px;
      overflow: hidden;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .title {
      font-size: 1.125rem;
      font-weight: 600;
      background: ${isDark ? 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'};
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .view-all-link {
      font-size: 0.875rem;
      color: #3b82f6;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .view-all-link:hover {
      text-decoration: underline;
    }

    /* Grid Layout */
    .sponsors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      flex: 1;
      overflow: hidden;
    }

    /* Carousel Layout */
    .sponsors-carousel {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
      -ms-overflow-style: none;
      flex: 1;
      padding-bottom: 8px;
    }

    .sponsors-carousel::-webkit-scrollbar {
      display: none;
    }

    .sponsors-carousel .sponsor-card {
      flex: 0 0 200px;
      scroll-snap-align: start;
    }

    /* List Layout */
    .sponsors-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      overflow: hidden;
    }

    .sponsors-list .sponsor-card {
      flex-direction: row;
      padding: 8px;
    }

    .sponsors-list .sponsor-image {
      width: 60px;
      height: 60px;
      border-radius: 8px;
    }

    .sponsors-list .sponsor-info {
      padding: 0 0 0 12px;
    }

    /* Sponsor Card */
    .sponsor-card {
      display: flex;
      flex-direction: column;
      background: ${isDark ? '#1e293b' : '#ffffff'};
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,${isDark ? '0.2' : '0.1'});
      text-decoration: none;
      color: inherit;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .sponsor-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0,0,0,${isDark ? '0.3' : '0.15'});
    }

    .sponsor-image {
      width: 100%;
      aspect-ratio: 3/2;
      object-fit: cover;
      background: ${isDark ? '#334155' : '#e2e8f0'};
    }

    .sponsor-logo {
      width: 100%;
      aspect-ratio: 3/2;
      object-fit: contain;
      padding: 12px;
      background: ${isDark ? '#334155' : '#f1f5f9'};
    }

    .sponsor-info {
      padding: 10px;
      flex: 1;
    }

    .sponsor-name {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sponsor-tagline {
      font-size: 0.75rem;
      color: ${isDark ? '#94a3b8' : '#64748b'};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .featured-badge {
      position: absolute;
      top: 6px;
      right: 6px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 0.625rem;
      font-weight: 600;
    }

    .view-all-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      margin-top: 12px;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .view-all-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .branding {
      text-align: center;
      padding: 8px;
      font-size: 0.625rem;
      opacity: 0.5;
    }

    .branding a {
      color: inherit;
      text-decoration: none;
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;
      opacity: 0.6;
    }

    .empty-icon {
      width: 40px;
      height: 40px;
      margin-bottom: 8px;
    }

    /* Carousel dots */
    .carousel-dots {
      display: flex;
      justify-content: center;
      gap: 6px;
      margin-top: 8px;
    }

    .carousel-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${isDark ? '#475569' : '#cbd5e1'};
      transition: background 0.2s;
    }

    .carousel-dot.active {
      background: #3b82f6;
    }

    @media (max-width: 400px) {
      .sponsors-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="widget">
    <header class="header">
      <h1 class="title">${escapeHtml(titleParam)}</h1>
      ${viewAllUrlParam ? `
        <a href="${escapeHtml(viewAllUrlParam)}" class="view-all-link" target="_blank" rel="noopener">
          View All
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      ` : ''}
    </header>

    ${sponsors.length > 0 ? renderSponsors(sponsors, layoutParam) : renderEmpty()}

    ${viewAllUrlParam ? `
      <a href="${escapeHtml(viewAllUrlParam)}" class="view-all-btn" target="_blank" rel="noopener">
        ${escapeHtml(viewAllTextParam)}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>
    ` : ''}

    ${showBrandingParam ? `
      <footer class="branding">
        <a href="https://community-websites.com" target="_blank" rel="noopener">Powered by Community-Website.com</a>
      </footer>
    ` : ''}
  </div>

  <!-- Impression tracking -->
  ${impressionPixels}

  ${autoRotateParam && layoutParam === 'carousel' ? `
  <script>
    (function() {
      var carousel = document.querySelector('.sponsors-carousel');
      if (!carousel) return;

      var cards = carousel.querySelectorAll('.sponsor-card');
      var dots = document.querySelectorAll('.carousel-dot');
      var currentIndex = 0;

      function scrollToIndex(index) {
        var card = cards[index];
        if (card) {
          carousel.scrollTo({
            left: card.offsetLeft - 16,
            behavior: 'smooth'
          });
          dots.forEach(function(dot, i) {
            dot.classList.toggle('active', i === index);
          });
        }
      }

      setInterval(function() {
        currentIndex = (currentIndex + 1) % cards.length;
        scrollToIndex(currentIndex);
      }, 4000);
    })();
  </script>
  ` : ''}
</body>
</html>
`.trim();

  return new NextResponse(widgetHtml, {
    status: 200,
    headers: corsHeaders,
  });
}

function renderSponsors(sponsors: any[], layout: string): string {
  const containerClass = layout === 'carousel' ? 'sponsors-carousel' :
                         layout === 'list' ? 'sponsors-list' : 'sponsors-grid';

  let html = `<div class="${containerClass}">`;

  for (const sponsor of sponsors) {
    html += `
      <a href="${escapeHtml(sponsor.clickUrl)}"
         class="sponsor-card"
         target="_blank"
         rel="noopener sponsored"
         title="${escapeHtml(sponsor.businessName)}"
         style="position: relative;">
        ${sponsor.isFeatured ? '<span class="featured-badge">Featured</span>' : ''}
        ${sponsor.imageUrl ?
          `<img class="sponsor-image" src="${escapeHtml(sponsor.imageUrl)}" alt="${escapeHtml(sponsor.businessName)}" loading="lazy" />` :
          sponsor.logoUrl ?
          `<img class="sponsor-logo" src="${escapeHtml(sponsor.logoUrl)}" alt="${escapeHtml(sponsor.businessName)}" loading="lazy" />` :
          `<div class="sponsor-image"></div>`
        }
        <div class="sponsor-info">
          <div class="sponsor-name">${escapeHtml(sponsor.businessName)}</div>
          ${sponsor.tagline ? `<div class="sponsor-tagline">${escapeHtml(sponsor.tagline)}</div>` : ''}
        </div>
      </a>
    `;
  }

  html += '</div>';

  // Add carousel dots
  if (layout === 'carousel' && sponsors.length > 1) {
    html += '<div class="carousel-dots">';
    for (let i = 0; i < sponsors.length; i++) {
      html += `<span class="carousel-dot${i === 0 ? ' active' : ''}"></span>`;
    }
    html += '</div>';
  }

  return html;
}

function renderEmpty(): string {
  return `
    <div class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 9h6v6H9z"/>
      </svg>
      <p>No sponsors available</p>
    </div>
  `;
}

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
