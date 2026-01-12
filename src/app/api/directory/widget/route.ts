import { NextRequest, NextResponse } from 'next/server';

/**
 * Business Directory Widget
 * 
 * A self-contained web component that renders a full-featured business directory.
 * Designed to feel like a native part of any website.
 * 
 * Usage:
 *   <script src="https://community-websites.com/api/directory/widget"></script>
 *   <community-directory></community-directory>
 * 
 * With options:
 *   <community-directory 
 *     theme="light"
 *     accent-color="#3b82f6"
 *     signup-url="https://community-websites.com/directory-signup"
 *     show-cta="true"
 *   ></community-directory>
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

  // Prevent double initialization
  if (customElements.get('community-directory')) return;

  const API_BASE = '${baseUrl}';
  const LISTINGS_API = API_BASE + '/api/directory/public/listings';
  const TRACK_CLICK_API = API_BASE + '/api/directory/track/click';
  const TRACK_IMPRESSION_API = API_BASE + '/api/directory/track/impression';
  const DEFAULT_SIGNUP_URL = API_BASE + '/directory-signup';

  // Category data
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
      return ['theme', 'accent-color', 'signup-url', 'show-cta', 'show-search', 'show-filters', 'columns'];
    }

    get theme() { return this.getAttribute('theme') || 'light'; }
    get accentColor() { return this.getAttribute('accent-color') || '#3b82f6'; }
    get signupUrl() { return this.getAttribute('signup-url') || DEFAULT_SIGNUP_URL; }
    get showCta() { return this.getAttribute('show-cta') !== 'false'; }
    get showSearch() { return this.getAttribute('show-search') !== 'false'; }
    get showFilters() { return this.getAttribute('show-filters') !== 'false'; }
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
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: \${isDark ? '#f1f5f9' : '#1e293b'};
          --accent: \${this.accentColor};
          --accent-hover: \${this.accentColor}dd;
          --bg: \${isDark ? '#0f172a' : '#ffffff'};
          --card-bg: \${isDark ? '#1e293b' : '#ffffff'};
          --border: \${isDark ? '#334155' : '#e2e8f0'};
          --text: \${isDark ? '#f1f5f9' : '#1e293b'};
          --text-secondary: \${isDark ? '#94a3b8' : '#64748b'};
          --input-bg: \${isDark ? '#1e293b' : '#ffffff'};
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .directory-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 20px;
          background: var(--bg);
        }

        /* Header */
        .directory-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .directory-title {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 12px;
          background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .directory-subtitle {
          font-size: 1.125rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto;
        }

        /* Search */
        .search-container {
          max-width: 600px;
          margin: 0 auto 30px;
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 16px 20px 16px 50px;
          font-size: 1rem;
          border: 2px solid var(--border);
          border-radius: 12px;
          background: var(--input-bg);
          color: var(--text);
          transition: all 0.2s;
          outline: none;
        }

        .search-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px \${this.accentColor}20;
        }

        .search-input::placeholder {
          color: var(--text-secondary);
        }

        .search-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          pointer-events: none;
        }

        /* Filters */
        .filters-container {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          margin-bottom: 40px;
        }

        .filter-btn {
          padding: 10px 20px;
          border: 2px solid var(--border);
          border-radius: 25px;
          background: var(--card-bg);
          color: var(--text);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-btn:hover {
          border-color: var(--accent);
          background: \${this.accentColor}10;
        }

        .filter-btn.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }

        .filter-count {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        /* Stats Banner */
        .stats-banner {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin-bottom: 40px;
          padding: 20px;
          background: linear-gradient(135deg, \${this.accentColor}10 0%, #8b5cf610 100%);
          border-radius: 16px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: var(--accent);
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        /* Grid */
        .listings-grid {
          display: grid;
          gap: 24px;
          margin-bottom: 50px;
        }

        .listings-grid.columns-auto {
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        }

        .listings-grid.columns-2 {
          grid-template-columns: repeat(2, 1fr);
        }

        .listings-grid.columns-3 {
          grid-template-columns: repeat(3, 1fr);
        }

        .listings-grid.columns-4 {
          grid-template-columns: repeat(4, 1fr);
        }

        @media (max-width: 768px) {
          .listings-grid,
          .listings-grid.columns-2,
          .listings-grid.columns-3,
          .listings-grid.columns-4 {
            grid-template-columns: 1fr;
          }
          .stats-banner {
            flex-direction: column;
            gap: 20px;
          }
        }

        /* Card */
        .listing-card {
          position: relative;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .listing-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.12);
        }

        .card-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          z-index: 10;
        }

        .badge-featured {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .card-banner {
          width: 100%;
          height: 160px;
          overflow: hidden;
          background: linear-gradient(135deg, \${this.accentColor}20 0%, #8b5cf620 100%);
        }

        .card-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .listing-card:hover .card-banner img {
          transform: scale(1.05);
        }

        .card-content {
          padding: 24px;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .card-logo {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          object-fit: contain;
          border: 2px solid var(--border);
          background: white;
          flex-shrink: 0;
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 6px;
          color: var(--text);
        }

        .card-category {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: \${this.accentColor}15;
          border-radius: 6px;
          font-size: 0.8rem;
          color: var(--accent);
          font-weight: 500;
        }

        .card-description {
          color: var(--text-secondary);
          font-size: 0.9rem;
          line-height: 1.6;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-contact {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .card-social {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .social-link {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--border);
          border-radius: 50%;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.2s;
          font-size: 1rem;
        }

        .social-link:hover {
          background: var(--accent);
          color: white;
          transform: scale(1.1);
        }

        .card-button {
          width: 100%;
          padding: 14px 24px;
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
        }

        .card-button:hover {
          background: var(--accent-hover);
          transform: scale(1.02);
        }

        /* CTA Banner */
        .cta-banner {
          background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
          border-radius: 20px;
          padding: 48px;
          text-align: center;
          color: white;
          margin-top: 20px;
        }

        .cta-badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 8px 20px;
          border-radius: 25px;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .cta-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .cta-description {
          font-size: 1.1rem;
          opacity: 0.9;
          max-width: 500px;
          margin: 0 auto 24px;
        }

        .cta-button {
          display: inline-block;
          background: white;
          color: var(--accent);
          padding: 16px 40px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .cta-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }

        /* States */
        .loading-container,
        .error-container,
        .empty-container {
          text-align: center;
          padding: 80px 20px;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-icon, .empty-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .state-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 10px;
          color: var(--text);
        }

        .state-description {
          color: var(--text-secondary);
        }

        /* No results */
        .no-results {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-secondary);
        }

        .no-results-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }

        /* Featured section */
        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text);
        }

        .section-title-icon {
          font-size: 1.3rem;
        }
      \`;
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
              <div class="state-description">Please wait while we fetch the latest listings</div>
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
              <div class="error-icon">⚠️</div>
              <div class="state-title">Oops! Something went wrong</div>
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
          <div class="directory-header">
            <h1 class="directory-title">Business Directory</h1>
            <p class="directory-subtitle">Discover amazing local businesses serving our community</p>
          </div>

          <div class="stats-banner">
            <div class="stat-item">
              <div class="stat-number">\${this.listings.length}</div>
              <div class="stat-label">Local Businesses</div>
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
              <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" class="search-input" id="search-input" placeholder="Search businesses by name, category, or description...">
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
              <div class="state-description">Try adjusting your search or filter criteria</div>
            </div>
          \` : ''}

          \${this.showCta ? this.renderCTA() : ''}
        </div>
      \`;
    }

    renderFilters() {
      let html = '<div class="filters-container">';
      html += \`<button class="filter-btn \${this.currentCategory === 'all' ? 'active' : ''}" data-category="all">
        All <span class="filter-count">(\${this.listings.length})</span>
      </button>\`;

      for (const [category, count] of Object.entries(this.categories)) {
        const cat = CATEGORIES[category] || { label: category, icon: '📍' };
        html += \`<button class="filter-btn \${this.currentCategory === category ? 'active' : ''}" data-category="\${category}">
          \${cat.icon} \${cat.label} <span class="filter-count">(\${count})</span>
        </button>\`;
      }

      html += '</div>';
      return html;
    }

    renderListingsHTML() {
      if (this.filteredListings.length === 0 && this.listings.length === 0) {
        return \`
          <div class="empty-container" style="grid-column: 1 / -1;">
            <div class="empty-icon">🏪</div>
            <div class="state-title">No Businesses Yet</div>
            <div class="state-description">Be the first to join our community directory!</div>
          </div>
        \`;
      }

      return this.filteredListings.map(listing => this.renderCard(listing)).join('');
    }

    renderCard(listing) {
      const cat = listing.category ? (CATEGORIES[listing.category] || { label: listing.categoryLabel || listing.category, icon: '📍' }) : null;
      
      const socialLinks = [];
      if (listing.facebookUrl) socialLinks.push({ url: listing.facebookUrl, icon: '📘', label: 'Facebook' });
      if (listing.instagramUrl) socialLinks.push({ url: listing.instagramUrl, icon: '📷', label: 'Instagram' });
      if (listing.linkedinUrl) socialLinks.push({ url: listing.linkedinUrl, icon: '💼', label: 'LinkedIn' });
      if (listing.twitterUrl) socialLinks.push({ url: listing.twitterUrl, icon: '🐦', label: 'Twitter' });
      if (listing.youtubeUrl) socialLinks.push({ url: listing.youtubeUrl, icon: '🎬', label: 'YouTube' });

      return \`
        <div class="listing-card" data-id="\${listing.id}">
          \${listing.isFeatured ? '<div class="card-badge badge-featured">⭐ Featured</div>' : ''}
          
          \${listing.bannerImageUrl ? \`
            <div class="card-banner">
              <img src="\${this.escapeHtml(listing.bannerImageUrl)}" alt="\${this.escapeHtml(listing.businessName)}" loading="lazy">
            </div>
          \` : listing.imageUrl ? \`
            <div class="card-banner">
              <img src="\${this.escapeHtml(listing.imageUrl)}" alt="\${this.escapeHtml(listing.businessName)}" loading="lazy">
            </div>
          \` : ''}
          
          <div class="card-content">
            <div class="card-header">
              \${listing.logoUrl ? \`
                <img src="\${this.escapeHtml(listing.logoUrl)}" alt="Logo" class="card-logo">
              \` : ''}
              <div>
                <h3 class="card-title">\${this.escapeHtml(listing.businessName)}</h3>
                \${cat ? \`<span class="card-category">\${cat.icon} \${cat.label}</span>\` : ''}
              </div>
            </div>
            
            \${listing.description ? \`
              <p class="card-description">\${this.escapeHtml(listing.description)}</p>
            \` : ''}
            
            <div class="card-contact">
              \${listing.phone ? \`<span class="contact-item">📞 \${this.escapeHtml(listing.phone)}</span>\` : ''}
              \${listing.city && listing.state ? \`<span class="contact-item">📍 \${this.escapeHtml(listing.city)}, \${this.escapeHtml(listing.state)}</span>\` : ''}
            </div>
            
            \${socialLinks.length > 0 ? \`
              <div class="card-social">
                \${socialLinks.map(s => \`
                  <a href="\${s.url}" class="social-link" target="_blank" rel="noopener" title="\${s.label}">\${s.icon}</a>
                \`).join('')}
              </div>
            \` : ''}
            
            <a href="\${this.escapeHtml(listing.websiteUrl || listing.targetUrl || '#')}" 
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
          <div class="cta-badge">✨ Free Listing Available</div>
          <h2 class="cta-title">Own a Local Business?</h2>
          <p class="cta-description">Get your business discovered by the community. Join our directory today — it's free!</p>
          <a href="\${this.escapeHtml(this.signupUrl)}" class="cta-button" target="_blank" rel="noopener">
            Add Your Business →
          </a>
        </div>
      \`;
    }

    renderListings() {
      const grid = this.shadowRoot.getElementById('listings-grid');
      if (grid) {
        grid.innerHTML = this.renderListingsHTML();
        this.attachCardListeners();
      }

      // Update no results visibility
      const noResults = this.shadowRoot.querySelector('.no-results');
      if (noResults) {
        noResults.style.display = this.filteredListings.length === 0 && this.listings.length > 0 ? 'block' : 'none';
      }
    }

    attachEventListeners() {
      // Search
      const searchInput = this.shadowRoot.getElementById('search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value;
          this.filterListings();
        });
      }

      // Filters
      const filterBtns = this.shadowRoot.querySelectorAll('.filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const category = e.currentTarget.dataset.category;
          this.currentCategory = category;
          
          // Update active state
          filterBtns.forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          
          this.filterListings();
        });
      });

      this.attachCardListeners();
    }

    attachCardListeners() {
      // Visit website buttons
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

  // Register the custom element
  customElements.define('community-directory', CommunityDirectory);

  // Also expose as global for programmatic access
  window.CommunityDirectory = CommunityDirectory;

})();
`.trim();

  return new NextResponse(widgetScript, {
    status: 200,
    headers: corsHeaders,
  });
}
