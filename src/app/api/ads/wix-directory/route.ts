import { NextRequest, NextResponse } from 'next/server';

/**
 * Wix Advertiser Directory Route
 *
 * This endpoint serves a complete, self-contained HTML page that displays all
 * active advertisers in a directory format. Designed for a "View Our Sponsors"
 * page on Wix websites.
 *
 * Features:
 * - Displays all active advertisers in a responsive grid
 * - Shows advertiser name and ad image
 * - Click tracking for each advertiser
 * - Impression tracking when the page loads
 * - Call-to-action to become an advertiser
 * - Light/dark theme support
 * - Fully responsive for all screen sizes
 *
 * Usage in Wix:
 * 1. Add a "Custom Embed" or "HTML iframe" element
 * 2. Set the iframe to embed this URL
 * 3. Give the iframe enough height (recommended: 600px+ or auto-resize)
 */

// CORS headers for Wix cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=300',
  // Wix-specific headers to allow iframe embedding
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
  const themeParam = request.nextUrl.searchParams.get('theme') || 'light'; // auto, light, dark
  const columnsParam = request.nextUrl.searchParams.get('columns') || 'auto'; // auto, 2, 3, 4
  const showCtaParam = request.nextUrl.searchParams.get('cta') !== 'false';
  const ctaUrlParam = request.nextUrl.searchParams.get('ctaUrl') || '';
  const ctaTextParam = request.nextUrl.searchParams.get('ctaText') || 'Become a Sponsor';
  const titleParam = request.nextUrl.searchParams.get('title') || 'Our Sponsors';
  const subtitleParam = request.nextUrl.searchParams.get('subtitle') || 'Thank you to these amazing local businesses for supporting our community!';
  const showBrandingParam = request.nextUrl.searchParams.get('branding') !== 'false';

  // Generate the HTML directory page
  const directoryHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${escapeHtml(titleParam)}</title>
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      line-height: 1.5;
      min-height: 100vh;
    }

    /* Theme: Light */
    body.theme-light {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      color: #1e293b;
    }

    /* Theme: Dark */
    body.theme-dark {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #f1f5f9;
    }

    /* Theme: Auto - inherits from system */
    body.theme-auto {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      color: #1e293b;
    }

    @media (prefers-color-scheme: dark) {
      body.theme-auto {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        color: #f1f5f9;
      }
    }

    /* Container */
    .directory-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    /* Header */
    .directory-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .directory-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    body.theme-dark .directory-title {
      background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    @media (prefers-color-scheme: dark) {
      body.theme-auto .directory-title {
        background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    .directory-subtitle {
      font-size: 1.125rem;
      opacity: 0.8;
      max-width: 600px;
      margin: 0 auto;
    }

    /* Sponsors Grid */
    .sponsors-grid {
      display: grid;
      gap: 24px;
      margin-bottom: 48px;
    }

    /* Responsive columns */
    .sponsors-grid.columns-auto {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
    }

    @media (max-width: 480px) {
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
    }

    body.theme-dark .sponsor-card {
      background: #1e293b;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
    }

    @media (prefers-color-scheme: dark) {
      body.theme-auto .sponsor-card {
        background: #1e293b;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
      }
    }

    .sponsor-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    }

    body.theme-dark .sponsor-card:hover {
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    }

    @media (prefers-color-scheme: dark) {
      body.theme-auto .sponsor-card:hover {
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      }
    }

    .sponsor-card:focus {
      outline: 3px solid #3b82f6;
      outline-offset: 2px;
    }

    /* Sponsor Image */
    .sponsor-image-container {
      position: relative;
      width: 100%;
      padding-bottom: 33.33%; /* 3:1 aspect ratio */
      background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
      overflow: hidden;
    }

    body.theme-dark .sponsor-image-container {
      background: linear-gradient(135deg, #334155 0%, #475569 100%);
    }

    @media (prefers-color-scheme: dark) {
      body.theme-auto .sponsor-image-container {
        background: linear-gradient(135deg, #334155 0%, #475569 100%);
      }
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

    /* Sponsor Info */
    .sponsor-info {
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .sponsor-name {
      font-size: 1rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    body.theme-dark .sponsor-name {
      color: #f1f5f9;
    }

    @media (prefers-color-scheme: dark) {
      body.theme-auto .sponsor-name {
        color: #f1f5f9;
      }
    }

    .sponsor-visit-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      color: #64748b;
      transition: color 0.2s ease, transform 0.2s ease;
    }

    .sponsor-card:hover .sponsor-visit-icon {
      color: #3b82f6;
      transform: translateX(2px);
    }

    /* CTA Section */
    .cta-section {
      text-align: center;
      padding: 48px 20px;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 24px;
      margin-bottom: 32px;
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
      color: #3b82f6;
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

    .cta-button:focus {
      outline: 3px solid #ffffff;
      outline-offset: 2px;
    }

    /* Loading State */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    body.theme-dark .loading-spinner {
      border-color: #334155;
      border-top-color: #60a5fa;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-text {
      margin-top: 16px;
      font-size: 1rem;
      opacity: 0.7;
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

    /* Branding */
    .branding {
      text-align: center;
      padding: 16px;
      font-size: 0.75rem;
      opacity: 0.5;
    }

    .branding a {
      color: inherit;
      text-decoration: none;
    }

    .branding a:hover {
      opacity: 0.8;
    }

    /* Tracking pixel */
    .tracking-pixel {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .directory-container {
        padding: 24px 16px;
      }

      .directory-title {
        font-size: 1.75rem;
      }

      .directory-subtitle {
        font-size: 1rem;
      }

      .cta-section {
        padding: 32px 16px;
      }

      .cta-title {
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body class="theme-${themeParam}">
  <div class="directory-container">
    <header class="directory-header">
      <h1 class="directory-title">${escapeHtml(titleParam)}</h1>
      <p class="directory-subtitle">${escapeHtml(subtitleParam)}</p>
    </header>

    <main id="sponsors-container">
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">Loading sponsors...</p>
      </div>
    </main>

    ${showCtaParam ? `
    <section class="cta-section">
      <h2 class="cta-title">Want to Join Our Sponsors?</h2>
      <p class="cta-description">Support our community and get your business in front of thousands of local residents.</p>
      <a href="${escapeHtml(ctaUrlParam || '#')}" class="cta-button" target="_blank" rel="noopener" id="cta-button">${escapeHtml(ctaTextParam)}</a>
    </section>
    ` : ''}

    ${showBrandingParam ? `
    <footer class="branding">
      <a href="https://community-websites.com" target="_blank" rel="noopener">Powered by Community-Website.com</a>
    </footer>
    ` : ''}
  </div>

  <script>
    (function() {
      'use strict';

      // Configuration
      var CONFIG = {
        baseUrl: '${baseUrl}',
        serveAllEndpoint: '${baseUrl}/api/ads/serve-all',
        website: '${websiteParam}',
        columns: '${columnsParam}'
      };

      // DOM elements
      var container = document.getElementById('sponsors-container');

      /**
       * Send message to parent Wix page
       */
      function postToParent(type, data) {
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              source: 'community-ads-directory',
              type: type,
              data: data
            }, '*');
          }
        } catch (e) {
          // Cross-origin restriction - ignore
        }
      }

      /**
       * Escape HTML to prevent XSS
       */
      function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
      }

      /**
       * Fetch sponsors from server
       */
      function fetchSponsors() {
        var url = CONFIG.serveAllEndpoint + '?placement=inline';
        if (CONFIG.website) {
          url += '&website=' + encodeURIComponent(CONFIG.website);
        }

        fetch(url)
          .then(function(response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
          })
          .then(function(data) {
            if (data.ads && data.ads.length > 0) {
              renderSponsors(data.ads);
              postToParent('loaded', { sponsorCount: data.ads.length });
            } else {
              showEmptyState();
              postToParent('empty', {});
            }
          })
          .catch(function(error) {
            console.error('[Directory] Fetch error:', error);
            showErrorState();
            postToParent('error', { message: error.message });
          });
      }

      /**
       * Render sponsors grid
       */
      function renderSponsors(ads) {
        var columnsClass = CONFIG.columns === 'auto' ? 'columns-auto' : 'columns-' + CONFIG.columns;

        var html = '<div class="sponsors-grid ' + columnsClass + '">';

        ads.forEach(function(ad, index) {
          var businessName = ad.customerName || ad.name || 'Sponsor';

          html += '<a href="' + escapeHtml(ad.clickUrl) + '" ' +
                  'class="sponsor-card" ' +
                  'target="_blank" ' +
                  'rel="noopener sponsored" ' +
                  'title="Visit ' + escapeHtml(businessName) + '" ' +
                  'data-ad-id="' + escapeHtml(ad.id) + '">' +
                    '<div class="sponsor-image-container">' +
                      '<img class="sponsor-image" ' +
                           'src="' + escapeHtml(ad.imageUrl) + '" ' +
                           'alt="' + escapeHtml(ad.altText || businessName) + '" ' +
                           'loading="' + (index < 6 ? 'eager' : 'lazy') + '" ' +
                           'onload="this.classList.add(\\'loaded\\')" />' +
                    '</div>' +
                    '<div class="sponsor-info">' +
                      '<p class="sponsor-name">' + escapeHtml(businessName) + '</p>' +
                      '<svg class="sponsor-visit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<path d="M7 17L17 7"/>' +
                        '<path d="M7 7h10v10"/>' +
                      '</svg>' +
                    '</div>' +
                    '<img class="tracking-pixel" src="' + escapeHtml(ad.impressionUrl) + '" alt="" aria-hidden="true" />' +
                  '</a>';
        });

        html += '</div>';
        container.innerHTML = html;

        // Track clicks
        var cards = container.querySelectorAll('.sponsor-card');
        cards.forEach(function(card) {
          card.addEventListener('click', function() {
            var adId = card.getAttribute('data-ad-id');
            postToParent('click', { adId: adId });
          });
        });

        // Notify parent of content height for auto-resize
        setTimeout(function() {
          postToParent('resize', {
            height: document.body.scrollHeight
          });
        }, 500);
      }

      /**
       * Show empty state
       */
      function showEmptyState() {
        container.innerHTML =
          '<div class="empty-state">' +
            '<svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
              '<path d="M9 9h6v6H9z"/>' +
            '</svg>' +
            '<h2 class="empty-state-title">No Sponsors Yet</h2>' +
            '<p class="empty-state-description">Check back soon for our amazing sponsors!</p>' +
          '</div>';
      }

      /**
       * Show error state
       */
      function showErrorState() {
        container.innerHTML =
          '<div class="empty-state">' +
            '<h2 class="empty-state-title">Unable to Load Sponsors</h2>' +
            '<p class="empty-state-description">Please try refreshing the page.</p>' +
          '</div>';
      }

      /**
       * Handle CTA button click
       */
      var ctaButton = document.getElementById('cta-button');
      if (ctaButton) {
        ctaButton.addEventListener('click', function() {
          postToParent('ctaClick', {});
        });
      }

      /**
       * Initialize
       */
      function init() {
        fetchSponsors();
        postToParent('ready', { version: '1.0.0' });
      }

      // Start when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
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
 * Helper function to escape HTML special characters
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}
