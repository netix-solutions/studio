import { NextRequest, NextResponse } from 'next/server';

/**
 * Wix Custom Element JavaScript API
 *
 * This endpoint serves a JavaScript file that defines a Custom Element (Web Component)
 * for embedding the sponsor directory in Wix websites.
 *
 * Wix Custom Elements provide:
 * - Native Wix Editor integration
 * - No iframe height issues
 * - Better performance
 * - Cleaner integration
 *
 * Usage in Wix:
 * 1. Go to Dev Mode in Wix Editor
 * 2. Add Custom Element
 * 3. Set the Server URL to this endpoint
 * 4. Configure attributes in the element settings
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const baseUrl = `${protocol}://${host}`;

  // Generate the Custom Element JavaScript
  const customElementJs = `
/**
 * Community Sponsors Directory - Wix Custom Element
 *
 * This Web Component displays a sponsor directory that integrates
 * natively with Wix websites without iframe limitations.
 */

class CommunitySponsorsDirectory extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.sponsors = [];
    this.loading = true;
    this.error = null;
    this.categories = {};
    this.selectedCategory = '';
  }

  static get observedAttributes() {
    return [
      'website',
      'theme',
      'columns',
      'title',
      'subtitle',
      'show-cta',
      'cta-url',
      'cta-text',
      'show-branding',
      'category',
      'show-contact',
      'show-social',
      'card-style'
    ];
  }

  // Wix Custom Element lifecycle
  connectedCallback() {
    this.render();
    this.fetchSponsors();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
      if (name === 'website' || name === 'category') {
        this.fetchSponsors();
      }
    }
  }

  // Get attribute with default value
  getAttr(name, defaultValue = '') {
    return this.getAttribute(name) || defaultValue;
  }

  getBoolAttr(name, defaultValue = true) {
    const val = this.getAttribute(name);
    if (val === null) return defaultValue;
    return val !== 'false';
  }

  // Fetch sponsors from API
  async fetchSponsors() {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      const params = new URLSearchParams();
      const website = this.getAttr('website');
      const category = this.getAttr('category');

      if (website) params.set('website', website);
      if (category) params.set('category', category);

      const response = await fetch('${baseUrl}/api/directory/public?' + params.toString());

      if (!response.ok) {
        throw new Error('Failed to fetch sponsors');
      }

      const data = await response.json();
      this.sponsors = data.listings || [];
      this.categories = data.categoryCounts || {};
      this.loading = false;
      this.render();

      // Track impressions for visible sponsors
      this.trackImpressions();
    } catch (err) {
      this.error = err.message;
      this.loading = false;
      this.render();
    }
  }

  // Track impressions via pixel
  trackImpressions() {
    this.sponsors.forEach(sponsor => {
      if (sponsor.id) {
        const img = new Image();
        img.src = '${baseUrl}/api/ads/impression?id=' + sponsor.id + '&source=wix_custom_element';
      }
    });
  }

  // Track click
  trackClick(sponsorId, targetUrl) {
    // Fire and forget click tracking
    fetch('${baseUrl}/api/ads/click?id=' + sponsorId + '&source=wix_custom_element', { method: 'GET' })
      .catch(() => {}); // Ignore errors

    // Navigate to target URL
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  }

  // Get theme class
  getThemeClass() {
    const theme = this.getAttr('theme', 'light');
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  // Render the component
  render() {
    const theme = this.getThemeClass();
    const columns = this.getAttr('columns', 'auto');
    const title = this.getAttr('title', 'Our Sponsors');
    const subtitle = this.getAttr('subtitle', 'Thank you to these amazing local businesses for supporting our community!');
    const showCta = this.getBoolAttr('show-cta', true);
    const ctaUrl = this.getAttr('cta-url', '');
    const ctaText = this.getAttr('cta-text', 'Become a Sponsor');
    const showBranding = this.getBoolAttr('show-branding', true);
    const showContact = this.getBoolAttr('show-contact', true);
    const showSocial = this.getBoolAttr('show-social', true);
    const cardStyle = this.getAttr('card-style', 'enhanced');

    const isDark = theme === 'dark';

    this.shadowRoot.innerHTML = \`
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          line-height: 1.5;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          background: \${isDark ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'};
          color: \${isDark ? '#f1f5f9' : '#1e293b'};
          border-radius: 16px;
        }

        .header {
          text-align: center;
          margin-bottom: 32px;
        }

        .title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 12px;
          background: \${isDark ? 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'};
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtitle {
          font-size: 1rem;
          opacity: 0.8;
          max-width: 600px;
          margin: 0 auto;
        }

        .category-filter {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
        }

        .category-btn {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid \${isDark ? '#475569' : '#cbd5e1'};
          background: \${isDark ? '#1e293b' : '#ffffff'};
          color: \${isDark ? '#e2e8f0' : '#475569'};
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .category-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .category-btn.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .grid {
          display: grid;
          gap: 24px;
          margin-bottom: 32px;
        }

        .grid.columns-auto { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
        .grid.columns-2 { grid-template-columns: repeat(2, 1fr); }
        .grid.columns-3 { grid-template-columns: repeat(3, 1fr); }
        .grid.columns-4 { grid-template-columns: repeat(4, 1fr); }

        @media (max-width: 768px) {
          .grid.columns-3, .grid.columns-4 { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 480px) {
          .grid { grid-template-columns: 1fr !important; }
          .title { font-size: 1.5rem; }
        }

        .card {
          display: flex;
          flex-direction: column;
          background: \${isDark ? '#1e293b' : '#ffffff'};
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, \${isDark ? '0.3' : '0.1'});
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer;
          position: relative;
        }

        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, \${isDark ? '0.4' : '0.1'});
        }

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
        }

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

        .image-container {
          position: relative;
          width: 100%;
          padding-bottom: 33.33%;
          background: \${isDark ? 'linear-gradient(135deg, #334155 0%, #475569 100%)' : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)'};
          overflow: hidden;
        }

        .image-container img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .logo-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-container img {
          max-width: 60%;
          max-height: 80%;
          object-fit: contain;
          position: static;
        }

        .info {
          padding: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .name {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: \${isDark ? '#f1f5f9' : '#1e293b'};
        }

        .tagline {
          font-size: 0.875rem;
          color: \${isDark ? '#94a3b8' : '#64748b'};
          font-style: italic;
          margin-bottom: 8px;
        }

        .description {
          font-size: 0.875rem;
          color: \${isDark ? '#cbd5e1' : '#475569'};
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .contact {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid \${isDark ? '#334155' : '#e2e8f0'};
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: \${isDark ? '#94a3b8' : '#64748b'};
        }

        .social {
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
          background: \${isDark ? '#334155' : '#f1f5f9'};
          color: \${isDark ? '#94a3b8' : '#64748b'};
          transition: background 0.2s, color 0.2s, transform 0.2s;
          text-decoration: none;
        }

        .social-link:hover {
          background: #3b82f6;
          color: white;
          transform: scale(1.1);
        }

        .cta-section {
          text-align: center;
          padding: 40px 20px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .cta-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 12px;
        }

        .cta-description {
          font-size: 1rem;
          color: rgba(255,255,255,0.9);
          margin-bottom: 20px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-button {
          display: inline-block;
          padding: 12px 28px;
          background: white;
          color: #3b82f6;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 12px;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(0,0,0,0.15);
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }

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

        .loading, .empty, .error {
          text-align: center;
          padding: 60px 20px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid \${isDark ? '#334155' : '#e2e8f0'};
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-icon, .error-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
          opacity: 0.5;
        }
      </style>

      <div class="container">
        <header class="header">
          <h1 class="title">\${this.escapeHtml(title)}</h1>
          <p class="subtitle">\${this.escapeHtml(subtitle)}</p>
        </header>

        \${this.loading ? this.renderLoading() : ''}
        \${this.error ? this.renderError() : ''}
        \${!this.loading && !this.error && this.sponsors.length === 0 ? this.renderEmpty() : ''}
        \${!this.loading && !this.error && this.sponsors.length > 0 ? this.renderSponsors(columns, showContact, showSocial) : ''}

        \${showCta && ctaUrl ? \`
          <section class="cta-section">
            <h2 class="cta-title">Want to Join Our Sponsors?</h2>
            <p class="cta-description">Support our community and get your business in front of thousands of local residents.</p>
            <a href="\${this.escapeHtml(ctaUrl)}" class="cta-button" target="_blank" rel="noopener">\${this.escapeHtml(ctaText)}</a>
          </section>
        \` : ''}

        \${showBranding ? \`
          <footer class="branding">
            <a href="https://community-websites.com" target="_blank" rel="noopener">Powered by Community-Website.com</a>
          </footer>
        \` : ''}
      </div>
    \`;

    // Bind click events
    this.shadowRoot.querySelectorAll('.card').forEach((card, index) => {
      card.addEventListener('click', (e) => {
        // Don't navigate if clicking social links
        if (e.target.closest('.social-link')) return;

        const sponsor = this.sponsors[index];
        if (sponsor) {
          this.trackClick(sponsor.liveAdId || sponsor.id, sponsor.websiteUrl || sponsor.targetUrl);
        }
      });
    });

    // Bind category filter events
    this.shadowRoot.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedCategory = btn.dataset.category;
        this.fetchSponsors();
      });
    });
  }

  renderLoading() {
    return \`
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Loading sponsors...</p>
      </div>
    \`;
  }

  renderError() {
    return \`
      <div class="error">
        <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <h3>Unable to Load Sponsors</h3>
        <p>\${this.escapeHtml(this.error)}</p>
      </div>
    \`;
  }

  renderEmpty() {
    return \`
      <div class="empty">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 9h6v6H9z"/>
        </svg>
        <h3>No Sponsors Yet</h3>
        <p>Check back soon for our amazing sponsors!</p>
      </div>
    \`;
  }

  renderSponsors(columns, showContact, showSocial) {
    const gridClass = columns === 'auto' ? 'columns-auto' : \`columns-\${columns}\`;

    return \`
      <div class="grid \${gridClass}">
        \${this.sponsors.map(sponsor => this.renderCard(sponsor, showContact, showSocial)).join('')}
      </div>
    \`;
  }

  renderCard(sponsor, showContact, showSocial) {
    const listing = sponsor.directoryListing || sponsor;
    const hasContact = showContact && (listing.showContactInfo !== false) && (listing.phone || listing.email);
    const hasSocial = showSocial && (listing.showSocialLinks !== false) && (
      listing.facebookUrl || listing.instagramUrl || listing.linkedinUrl ||
      listing.twitterUrl || listing.youtubeUrl
    );

    return \`
      <article class="card" data-id="\${sponsor.id}">
        \${listing.isFeatured ? '<span class="featured-badge">Featured</span>' : ''}
        \${listing.categoryLabel ? \`<span class="category-badge">\${listing.categoryIcon || ''} \${this.escapeHtml(listing.categoryLabel)}</span>\` : ''}

        <div class="image-container">
          \${sponsor.imageUrl ? \`
            <img src="\${this.escapeHtml(sponsor.imageUrl)}" alt="\${this.escapeHtml(listing.businessName)}" loading="lazy" />
          \` : listing.logoUrl ? \`
            <div class="logo-container">
              <img src="\${this.escapeHtml(listing.logoUrl)}" alt="\${this.escapeHtml(listing.businessName)}" loading="lazy" />
            </div>
          \` : ''}
        </div>

        <div class="info">
          <h3 class="name">\${this.escapeHtml(listing.businessName)}</h3>
          \${listing.tagline ? \`<p class="tagline">\${this.escapeHtml(listing.tagline)}</p>\` : ''}
          \${listing.description ? \`<p class="description">\${this.escapeHtml(listing.description)}</p>\` : ''}

          \${hasContact ? \`
            <div class="contact">
              \${listing.phone ? \`<span class="contact-item">📞 \${this.escapeHtml(listing.phone)}</span>\` : ''}
              \${listing.email ? \`<span class="contact-item">✉️ \${this.escapeHtml(listing.email)}</span>\` : ''}
            </div>
          \` : ''}

          \${hasSocial ? \`
            <div class="social">
              \${listing.facebookUrl ? \`<a href="\${this.escapeHtml(listing.facebookUrl)}" class="social-link" target="_blank" rel="noopener" title="Facebook">f</a>\` : ''}
              \${listing.instagramUrl ? \`<a href="\${this.escapeHtml(listing.instagramUrl)}" class="social-link" target="_blank" rel="noopener" title="Instagram">ig</a>\` : ''}
              \${listing.linkedinUrl ? \`<a href="\${this.escapeHtml(listing.linkedinUrl)}" class="social-link" target="_blank" rel="noopener" title="LinkedIn">in</a>\` : ''}
              \${listing.twitterUrl ? \`<a href="\${this.escapeHtml(listing.twitterUrl)}" class="social-link" target="_blank" rel="noopener" title="Twitter">X</a>\` : ''}
              \${listing.youtubeUrl ? \`<a href="\${this.escapeHtml(listing.youtubeUrl)}" class="social-link" target="_blank" rel="noopener" title="YouTube">▶</a>\` : ''}
            </div>
          \` : ''}
        </div>
      </article>
    \`;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
}

// Register the custom element
customElements.define('community-sponsors-directory', CommunitySponsorsDirectory);

// Also export for Wix
if (typeof window !== 'undefined') {
  window.CommunitySponsorsDirectory = CommunitySponsorsDirectory;
}
`.trim();

  return new NextResponse(customElementJs, {
    status: 200,
    headers: corsHeaders,
  });
}
