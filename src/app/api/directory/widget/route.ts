import { NextRequest, NextResponse } from 'next/server';

/**
 * Business Directory Widget
 * 
 * A self-contained web component that renders a full-featured business directory.
 * Designed with transparent background to blend seamlessly into any website.
 * Mobile-first responsive design optimized for touch devices.
 * 
 * Usage:
 *   <script src="https://community-websites.com/api/directory/widget"></script>
 *   <community-directory></community-directory>
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const baseUrl = `${protocol}://${host}`;

  const widgetScript = `
(function() {
  'use strict';

  if (customElements.get('community-directory')) return;

  const API_BASE = '${baseUrl}';
  const LISTINGS_API = API_BASE + '/api/directory/public/listings';
  const TRACK_CLICK_API = API_BASE + '/api/directory/track/click';
  const TRACK_IMPRESSION_API = API_BASE + '/api/directory/track/impression';
  const DEFAULT_SIGNUP_URL = API_BASE + '/directory-signup';

  const CATEGORIES = {
    'retail': { label: 'Retail', icon: '🛍️' },
    'food_beverage': { label: 'Food & Beverage', icon: '🍽️' },
    'health_wellness': { label: 'Health & Wellness', icon: '🏥' },
    'home_services': { label: 'Home Services', icon: '🏠' },
    'professional_services': { label: 'Professional Services', icon: '💼' },
    'automotive': { label: 'Automotive', icon: '🚗' },
    'beauty': { label: 'Beauty & Personal Care', icon: '💅' },
    'entertainment': { label: 'Entertainment', icon: '🎭' },
    'education': { label: 'Education', icon: '📚' },
    'real_estate': { label: 'Real Estate', icon: '🏘️' },
    'fitness': { label: 'Fitness', icon: '💪' },
    'pet_services': { label: 'Pet Services', icon: '🐕' },
    'technology': { label: 'Technology', icon: '💻' },
    'legal': { label: 'Legal Services', icon: '⚖️' },
    'financial': { label: 'Financial Services', icon: '💰' },
    'other': { label: 'Other', icon: '📍' }
  };

  class CommunityDirectory extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.listings = [];
      this.filteredListings = [];
      this.categories = {};
      this.currentCategory = 'all';
      this.searchQuery = '';
      this.isLoading = true;
      this.error = null;
    }

    static get observedAttributes() {
      return ['theme', 'accent-color', 'signup-url', 'show-cta', 'show-search', 'show-filters', 'columns', 'show-header'];
    }

    get theme() { return this.getAttribute('theme') || 'light'; }
    get accentColor() { return this.getAttribute('accent-color') || '#3b82f6'; }
    get signupUrl() { return this.getAttribute('signup-url') || DEFAULT_SIGNUP_URL; }
    get showCta() { return this.getAttribute('show-cta') !== 'false'; }
    get showSearch() { return this.getAttribute('show-search') !== 'false'; }
    get showFilters() { return this.getAttribute('show-filters') !== 'false'; }
    get showHeader() { return this.getAttribute('show-header') !== 'false'; }
    get columns() { return this.getAttribute('columns') || 'auto'; }

    connectedCallback() {
      this.render();
      this.fetchListings();
    }

    attributeChangedCallback() {
      this.render();
    }

    async fetchListings() {
      try {
        this.isLoading = true;
        this.render();

        const response = await fetch(LISTINGS_API);
        const data = await response.json();

        if (data.success && data.listings) {
          this.listings = data.listings;
          this.categories = data.categoryCounts || {};
          this.filteredListings = [...this.listings];
          this.isLoading = false;
          this.render();
          this.attachEventListeners();
          this.trackImpressions();
        } else {
          throw new Error('Failed to load listings');
        }
      } catch (error) {
        console.error('CommunityDirectory: Error fetching listings', error);
        this.isLoading = false;
        this.error = 'Unable to load directory. Please try again later.';
        this.render();
      }
    }

    filterListings() {
      this.filteredListings = this.listings.filter(listing => {
        const matchesCategory = this.currentCategory === 'all' || listing.category === this.currentCategory;
        const matchesSearch = !this.searchQuery || 
          listing.businessName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          (listing.description || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          (listing.categoryLabel || '').toLowerCase().includes(this.searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      });
      this.renderListings();
    }

    trackImpressions() {
      this.filteredListings.forEach(listing => {
        const img = new Image();
        img.src = TRACK_IMPRESSION_API + '?id=' + listing.id;
      });
    }

    trackClick(listingId) {
      fetch(TRACK_CLICK_API + '?id=' + listingId).catch(() => {});
    }

    getStyles() {
      const isDark = this.theme === 'dark';
      return \`
        /* ===== MOBILE-FIRST DESIGN ===== */
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.5;
          color: \${isDark ? '#f1f5f9' : 'inherit'};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          
          /* CSS Variables */
          --accent: \${this.accentColor};
          --accent-rgb: \${this.hexToRgb(this.accentColor)};
          --accent-hover: \${this.accentColor}dd;
          --card-bg: \${isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)'};
          --card-border: \${isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)'};
          --text: \${isDark ? '#f1f5f9' : 'inherit'};
          --text-secondary: \${isDark ? '#94a3b8' : '#64748b'};
          --input-bg: \${isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)'};
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ===== CONTAINER - TRANSPARENT ===== */
        .directory-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px;
          background: transparent;
        }

        @media (min-width: 768px) {
          .directory-container {
            padding: 24px;
          }
        }

        /* ===== HEADER ===== */
        .directory-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .directory-title {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: 8px;
          background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        @media (min-width: 768px) {
          .directory-title {
            font-size: 2.25rem;
          }
        }

        .directory-subtitle {
          font-size: 0.95rem;
          color: var(--text-secondary);
          max-width: 500px;
          margin: 0 auto;
        }

        /* ===== SEARCH - MOBILE OPTIMIZED ===== */
        .search-container {
          margin: 0 0 20px;
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 14px 16px 14px 46px;
          font-size: 16px; /* Prevents zoom on iOS */
          border: 2px solid var(--card-border);
          border-radius: 12px;
          background: var(--input-bg);
          color: var(--text);
          transition: all 0.2s;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }

        .search-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.15);
        }

        .search-input::placeholder {
          color: var(--text-secondary);
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          pointer-events: none;
          width: 20px;
          height: 20px;
        }

        /* ===== MOBILE CATEGORY GRID ===== */
        .category-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        @media (min-width: 768px) {
          .category-grid {
            display: none;
          }
        }

        .category-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 14px 8px;
          background: var(--card-bg);
          border: 2px solid var(--card-border);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
          text-align: center;
          min-height: 90px;
        }

        .category-tile:active {
          transform: scale(0.96);
        }

        .category-tile.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }

        .category-tile.active .category-tile-count {
          background: rgba(255,255,255,0.25);
          color: white;
        }

        .category-tile-icon {
          font-size: 1.5rem;
          margin-bottom: 4px;
        }

        .category-tile-name {
          font-size: 0.7rem;
          font-weight: 600;
          line-height: 1.2;
          margin-bottom: 4px;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .category-tile-count {
          font-size: 0.65rem;
          font-weight: 700;
          background: rgba(var(--accent-rgb), 0.15);
          color: var(--accent);
          padding: 2px 8px;
          border-radius: 10px;
        }

        .category-tile-all {
          background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
          border-color: transparent;
          color: white;
        }

        .category-tile-all .category-tile-count {
          background: rgba(255,255,255,0.25);
          color: white;
        }

        /* ===== DESKTOP FILTERS - HORIZONTAL SCROLL ===== */
        .filters-container {
          display: none;
          gap: 8px;
          margin-bottom: 20px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 4px 0;
        }

        @media (min-width: 768px) {
          .filters-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
          }
        }

        .filters-container::-webkit-scrollbar {
          display: none;
        }

        .filter-btn {
          flex-shrink: 0;
          padding: 10px 16px;
          border: 2px solid var(--card-border);
          border-radius: 24px;
          background: var(--card-bg);
          color: var(--text);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          -webkit-tap-highlight-color: transparent;
        }

        .filter-btn:active {
          transform: scale(0.97);
        }

        .filter-btn.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }

        .filter-count {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        /* ===== STATS - COMPACT ON MOBILE ===== */
        .stats-banner {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(var(--accent-rgb), 0.08);
          border-radius: 12px;
          border: 1px solid rgba(var(--accent-rgb), 0.15);
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent);
          line-height: 1.2;
        }

        @media (min-width: 768px) {
          .stat-number {
            font-size: 2rem;
          }
        }

        .stat-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media (min-width: 768px) {
          .stat-label {
            font-size: 0.8rem;
          }
        }

        /* ===== GRID - SINGLE COLUMN MOBILE ===== */
        .listings-grid {
          display: grid;
          gap: 16px;
          margin-bottom: 32px;
        }

        /* Mobile: Single column */
        .listings-grid.columns-auto,
        .listings-grid.columns-2,
        .listings-grid.columns-3,
        .listings-grid.columns-4 {
          grid-template-columns: 1fr;
        }

        /* Tablet: 2 columns */
        @media (min-width: 640px) {
          .listings-grid.columns-auto {
            grid-template-columns: repeat(2, 1fr);
          }
          .listings-grid.columns-2 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Desktop: Responsive */
        @media (min-width: 1024px) {
          .listings-grid.columns-auto {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          }
          .listings-grid.columns-3 {
            grid-template-columns: repeat(3, 1fr);
          }
          .listings-grid.columns-4 {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        /* ===== CARD - TOUCH OPTIMIZED ===== */
        .listing-card {
          position: relative;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          -webkit-tap-highlight-color: transparent;
        }

        @media (hover: hover) {
          .listing-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0,0,0,0.12);
          }
        }

        .listing-card:active {
          transform: scale(0.99);
        }

        .card-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 5px 10px;
          border-radius: 16px;
          font-size: 0.7rem;
          font-weight: 600;
          z-index: 10;
        }

        .badge-featured {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .card-banner {
          width: 100%;
          aspect-ratio: 3 / 1;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
        }

        .card-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .card-content {
          padding: 16px;
        }

        @media (min-width: 768px) {
          .card-content {
            padding: 20px;
          }
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .card-logo {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          object-fit: contain;
          border: 1px solid var(--card-border);
          background: white;
          flex-shrink: 0;
        }

        .card-header-info {
          flex: 1;
          min-width: 0;
        }

        .card-title {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 4px;
          color: var(--text);
          line-height: 1.3;
        }

        .card-tagline {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-style: italic;
          margin: 0 0 6px 0;
          line-height: 1.4;
        }

        .card-category {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: rgba(var(--accent-rgb), 0.1);
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--accent);
          font-weight: 500;
        }

        .card-description {
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-contact {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .card-social {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .social-link {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(var(--accent-rgb), 0.1);
          border-radius: 50%;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.2s;
          font-size: 1rem;
        }

        .social-link:active {
          transform: scale(0.9);
          background: var(--accent);
          color: white;
        }

        @media (hover: hover) {
          .social-link:hover {
            background: var(--accent);
            color: white;
          }
        }

        .card-button {
          width: 100%;
          padding: 14px 20px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          display: block;
          text-align: center;
          -webkit-tap-highlight-color: transparent;
        }

        .card-button:active {
          transform: scale(0.98);
          opacity: 0.9;
        }

        @media (hover: hover) {
          .card-button:hover {
            opacity: 0.9;
          }
        }

        /* ===== CTA BANNER - MOBILE FRIENDLY ===== */
        .cta-banner {
          background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
          border-radius: 16px;
          padding: 28px 20px;
          text-align: center;
          color: white;
        }

        @media (min-width: 768px) {
          .cta-banner {
            padding: 40px;
          }
        }

        .cta-badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .cta-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 8px;
        }

        @media (min-width: 768px) {
          .cta-title {
            font-size: 1.75rem;
          }
        }

        .cta-description {
          font-size: 0.95rem;
          opacity: 0.9;
          max-width: 400px;
          margin: 0 auto 20px;
          line-height: 1.5;
        }

        .cta-button {
          display: inline-block;
          background: white;
          color: var(--accent);
          padding: 14px 32px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }

        .cta-button:active {
          transform: scale(0.97);
        }

        @media (hover: hover) {
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.2);
          }
        }

        /* ===== LOADING/ERROR STATES ===== */
        .loading-container,
        .error-container,
        .empty-container {
          text-align: center;
          padding: 48px 20px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--card-border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .state-title {
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 8px;
          color: var(--text);
        }

        .state-description {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .no-results {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-secondary);
        }

        .no-results-icon {
          font-size: 2.5rem;
          margin-bottom: 12px;
        }

        /* ===== INLINE CTA ===== */
        .inline-cta {
          grid-column: 1 / -1;
          padding: 16px;
          background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
          border: 2px dashed rgba(var(--accent-rgb), 0.3);
          border-radius: 12px;
          margin: 8px 0;
        }

        .inline-cta-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (min-width: 640px) {
          .inline-cta-content {
            flex-wrap: nowrap;
          }
        }

        .inline-cta-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .inline-cta-text {
          flex: 1;
          min-width: 150px;
        }

        .inline-cta-text strong {
          display: block;
          font-size: 0.9rem;
          color: var(--text);
          margin-bottom: 2px;
        }

        .inline-cta-text span {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .inline-cta-button {
          flex-shrink: 0;
          padding: 8px 16px;
          background: var(--accent);
          color: white;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .inline-cta-button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        @media (max-width: 639px) {
          .inline-cta-button {
            width: 100%;
            text-align: center;
            margin-top: 8px;
          }
        }
      \`;
    }

    hexToRgb(hex) {
      const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
      return result 
        ? parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' + parseInt(result[3], 16)
        : '59, 130, 246';
    }

    render() {
      const styles = this.getStyles();
      
      if (this.isLoading) {
        this.shadowRoot.innerHTML = \`
          <style>\${styles}</style>
          <div class="directory-container">
            <div class="loading-container">
              <div class="loading-spinner"></div>
              <div class="state-title">Loading Directory...</div>
              <div class="state-description">Finding local businesses</div>
            </div>
          </div>
        \`;
        return;
      }

      if (this.error) {
        this.shadowRoot.innerHTML = \`
          <style>\${styles}</style>
          <div class="directory-container">
            <div class="error-container">
              <div class="state-title">⚠️ Oops!</div>
              <div class="state-description">\${this.error}</div>
            </div>
          </div>
        \`;
        return;
      }

      const featuredCount = this.listings.filter(l => l.isFeatured).length;
      const categoryCount = Object.keys(this.categories).length;

      this.shadowRoot.innerHTML = \`
        <style>\${styles}</style>
        <div class="directory-container">
          \${this.showHeader ? \`
            <div class="directory-header">
              <h1 class="directory-title">Business Directory</h1>
              <p class="directory-subtitle">Discover local businesses in our community</p>
            </div>
          \` : ''}

          <div class="stats-banner">
            <div class="stat-item">
              <div class="stat-number">\${this.listings.length}</div>
              <div class="stat-label">Businesses</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">\${featuredCount}</div>
              <div class="stat-label">Featured</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">\${categoryCount}</div>
              <div class="stat-label">Categories</div>
            </div>
          </div>

          \${this.showSearch ? \`
            <div class="search-container">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" class="search-input" id="search-input" placeholder="Search businesses...">
            </div>
          \` : ''}

          \${this.showFilters ? this.renderFilters() : ''}

          <div class="listings-grid columns-\${this.columns}" id="listings-grid">
            \${this.renderListingsHTML()}
          </div>

          \${this.filteredListings.length === 0 && this.listings.length > 0 ? \`
            <div class="no-results">
              <div class="no-results-icon">🔍</div>
              <div class="state-title">No businesses found</div>
              <div class="state-description">Try a different search or category</div>
            </div>
          \` : ''}

          \${this.showCta ? this.renderCTA() : ''}
        </div>
      \`;
    }

    renderFilters() {
      // Mobile category grid (3 columns)
      let mobileGrid = '<div class="category-grid">';
      
      // "View All" tile first
      mobileGrid += \`
        <div class="category-tile category-tile-all \${this.currentCategory === 'all' ? 'active' : ''}" data-category="all">
          <span class="category-tile-icon">🏢</span>
          <span class="category-tile-name">View All</span>
          <span class="category-tile-count">\${this.listings.length}</span>
        </div>
      \`;

      // Category tiles
      for (const [category, count] of Object.entries(this.categories)) {
        const cat = CATEGORIES[category] || { label: category, icon: '📍' };
        mobileGrid += \`
          <div class="category-tile \${this.currentCategory === category ? 'active' : ''}" data-category="\${category}">
            <span class="category-tile-icon">\${cat.icon}</span>
            <span class="category-tile-name">\${cat.label}</span>
            <span class="category-tile-count">\${count}</span>
          </div>
        \`;
      }

      mobileGrid += '</div>';

      // Desktop horizontal filter buttons
      let desktopFilters = '<div class="filters-container">';
      desktopFilters += \`<button class="filter-btn \${this.currentCategory === 'all' ? 'active' : ''}" data-category="all">
        All <span class="filter-count">(\${this.listings.length})</span>
      </button>\`;

      for (const [category, count] of Object.entries(this.categories)) {
        const cat = CATEGORIES[category] || { label: category, icon: '📍' };
        desktopFilters += \`<button class="filter-btn \${this.currentCategory === category ? 'active' : ''}" data-category="\${category}">
          \${cat.icon} \${cat.label} <span class="filter-count">(\${count})</span>
        </button>\`;
      }

      desktopFilters += '</div>';

      return mobileGrid + desktopFilters;
    }

    renderListingsHTML() {
      if (this.filteredListings.length === 0 && this.listings.length === 0) {
        return \`
          <div class="empty-container" style="grid-column: 1 / -1;">
            <div class="state-title">🏪 No Businesses Yet</div>
            <div class="state-description">Advertise your business here!</div>
            \${this.renderInlineCTA()}
          </div>
        \`;
      }

      // Inject inline CTAs every 4 listings
      const CTA_INTERVAL = 4;
      let html = '';
      
      this.filteredListings.forEach((listing, index) => {
        html += this.renderCard(listing);
        
        // Add inline CTA after every CTA_INTERVAL listings (but not after the last one)
        if ((index + 1) % CTA_INTERVAL === 0 && index < this.filteredListings.length - 1) {
          html += this.renderInlineCTA();
        }
      });

      return html;
    }

    renderCard(listing) {
      const cat = listing.category ? (CATEGORIES[listing.category] || { label: listing.categoryLabel || listing.category, icon: '📍' }) : null;
      
      const socialLinks = [];
      if (listing.facebookUrl) socialLinks.push({ url: listing.facebookUrl, icon: '📘', label: 'Facebook' });
      if (listing.instagramUrl) socialLinks.push({ url: listing.instagramUrl, icon: '📷', label: 'Instagram' });
      if (listing.linkedinUrl) socialLinks.push({ url: listing.linkedinUrl, icon: '💼', label: 'LinkedIn' });
      if (listing.twitterUrl) socialLinks.push({ url: listing.twitterUrl, icon: '🐦', label: 'Twitter' });
      if (listing.youtubeUrl) socialLinks.push({ url: listing.youtubeUrl, icon: '🎬', label: 'YouTube' });
      if (listing.tiktokUrl) socialLinks.push({ url: listing.tiktokUrl, icon: '🎵', label: 'TikTok' });
      if (listing.yelpUrl) socialLinks.push({ url: listing.yelpUrl, icon: '⭐', label: 'Yelp' });
      if (listing.googleBusinessUrl) socialLinks.push({ url: listing.googleBusinessUrl, icon: '📍', label: 'Google' });

      const showSocial = listing.showSocialLinks !== false && socialLinks.length > 0;
      const showContact = listing.showContactInfo !== false;
      
      // Use track/click API for proper redirect and analytics
      const clickUrl = TRACK_CLICK_API + '?id=' + listing.id;

      return \`
        <div class="listing-card" data-id="\${listing.id}">
          \${listing.isFeatured ? '<div class="card-badge badge-featured">⭐ Featured</div>' : ''}
          
          \${listing.bannerImageUrl || listing.imageUrl ? \`
            <div class="card-banner">
              <img src="\${this.escapeHtml(listing.bannerImageUrl || listing.imageUrl)}" alt="\${this.escapeHtml(listing.businessName)}" loading="lazy">
            </div>
          \` : ''}
          
          <div class="card-content">
            <div class="card-header">
              \${listing.logoUrl ? \`
                <img src="\${this.escapeHtml(listing.logoUrl)}" alt="Logo" class="card-logo" loading="lazy">
              \` : ''}
              <div class="card-header-info">
                <h3 class="card-title">\${this.escapeHtml(listing.businessName)}</h3>
                \${listing.tagline ? \`<p class="card-tagline">\${this.escapeHtml(listing.tagline)}</p>\` : ''}
                \${cat ? \`<span class="card-category">\${cat.icon} \${cat.label}</span>\` : ''}
              </div>
            </div>
            
            \${listing.description ? \`
              <p class="card-description">\${this.escapeHtml(listing.description)}</p>
            \` : ''}
            
            \${showContact ? \`
              <div class="card-contact">
                \${listing.phone ? \`<span class="contact-item">📞 \${this.escapeHtml(listing.phone)}</span>\` : ''}
                \${listing.email ? \`<span class="contact-item">✉️ \${this.escapeHtml(listing.email)}</span>\` : ''}
                \${listing.city && listing.state ? \`<span class="contact-item">📍 \${this.escapeHtml(listing.city)}, \${this.escapeHtml(listing.state)}</span>\` : ''}
              </div>
            \` : ''}
            
            \${showSocial ? \`
              <div class="card-social">
                \${socialLinks.map(s => \`
                  <a href="\${s.url}" class="social-link" target="_blank" rel="noopener" title="\${s.label}">\${s.icon}</a>
                \`).join('')}
              </div>
            \` : ''}
            
            <a href="\${clickUrl}" 
               class="card-button" 
               target="_blank" 
               rel="noopener"
               data-listing-id="\${listing.id}">
              Visit Website →
            </a>
          </div>
        </div>
      \`;
    }

    renderCTA() {
      return \`
        <div class="cta-banner">
          <div class="cta-badge">📢 Advertise With Us</div>
          <h2 class="cta-title">Want Your Business Here?</h2>
          <p class="cta-description">Get discovered by thousands in our community. Reach local customers with a directory listing.</p>
          <a href="\${this.escapeHtml(this.signupUrl)}" class="cta-button" target="_blank" rel="noopener">
            Get Started →
          </a>
        </div>
      \`;
    }

    renderInlineCTA() {
      return \`
        <div class="inline-cta">
          <div class="inline-cta-content">
            <span class="inline-cta-icon">🏪</span>
            <div class="inline-cta-text">
              <strong>Own a local business?</strong>
              <span>Get listed in our directory!</span>
            </div>
            <a href="\${this.escapeHtml(this.signupUrl)}" class="inline-cta-button" target="_blank" rel="noopener">
              Learn More
            </a>
          </div>
        </div>
      \`;
    }

    renderListings() {
      const grid = this.shadowRoot.getElementById('listings-grid');
      if (grid) {
        grid.innerHTML = this.renderListingsHTML();
        this.attachCardListeners();
      }

      const noResults = this.shadowRoot.querySelector('.no-results');
      if (noResults) {
        noResults.style.display = this.filteredListings.length === 0 && this.listings.length > 0 ? 'block' : 'none';
      }
    }

    attachEventListeners() {
      const searchInput = this.shadowRoot.getElementById('search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value;
          this.filterListings();
        });
      }

      // Get all filter elements (both mobile tiles and desktop buttons)
      const filterBtns = this.shadowRoot.querySelectorAll('.filter-btn');
      const categoryTiles = this.shadowRoot.querySelectorAll('.category-tile');

      // Helper to sync active state across both mobile and desktop
      const setActiveCategory = (category) => {
        this.currentCategory = category;
        filterBtns.forEach(b => {
          b.classList.toggle('active', b.dataset.category === category);
        });
        categoryTiles.forEach(t => {
          t.classList.toggle('active', t.dataset.category === category);
        });
        this.filterListings();
      };

      // Desktop filter buttons
      filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          setActiveCategory(e.currentTarget.dataset.category);
        });
      });

      // Mobile category tiles
      categoryTiles.forEach(tile => {
        tile.addEventListener('click', (e) => {
          setActiveCategory(e.currentTarget.dataset.category);
        });
      });

      this.attachCardListeners();
    }

    attachCardListeners() {
      const buttons = this.shadowRoot.querySelectorAll('.card-button');
      buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const listingId = e.currentTarget.dataset.listingId;
          if (listingId) {
            this.trackClick(listingId);
          }
        });
      });
    }

    escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  customElements.define('community-directory', CommunityDirectory);
  window.CommunityDirectory = CommunityDirectory;

})();
`.trim();

  return new NextResponse(widgetScript, {
    status: 200,
    headers: corsHeaders,
  });
}
