/**
 * Business Directory Embed SDK
 * 
 * Provides native, customizable directory embedding for community websites.
 * No iframes - renders directly into your page with full styling control.
 * 
 * Usage:
 *   <div id="business-directory"></div>
 *   <script src="https://yourdomain.com/directory-sdk.js"></script>
 *   <script>
 *     BusinessDirectory.init({
 *       container: '#business-directory',
 *       website: 'wesley-chapel',
 *       theme: 'light'
 *     });
 *   </script>
 */

(function(window) {
  'use strict';

  const BusinessDirectory = {
    version: '1.0.0',
    apiBase: '',
    
    /**
     * Initialize the directory
     */
    init: function(options) {
      const config = {
        container: options.container || '#business-directory',
        website: options.website || 'all',
        apiUrl: options.apiUrl || (this.apiBase + '/api/directory/public/listings'),
        theme: options.theme || 'light',
        columns: options.columns || 'auto',
        category: options.category || '',
        showSearch: options.showSearch !== false,
        showFilters: options.showFilters !== false,
        showFeatured: options.showFeatured !== false,
        trackingUrl: options.trackingUrl || (this.apiBase + '/api/directory/track'),
        onListingClick: options.onListingClick || null,
        customStyles: options.customStyles || {},
      };

      this.config = config;
      this.container = document.querySelector(config.container);
      
      if (!this.container) {
        console.error('BusinessDirectory: Container not found', config.container);
        return;
      }

      this.loadData();
    },

    /**
     * Fetch directory listings from API
     */
    loadData: async function() {
      try {
        this.showLoading();
        
        const url = new URL(this.config.apiUrl);
        if (this.config.category) {
          url.searchParams.set('category', this.config.category);
        }
        
        const response = await fetch(url.toString());
        const data = await response.json();
        
        if (data.success && data.listings) {
          this.listings = data.listings;
          this.categories = data.categoryCounts || {};
          this.render();
        } else {
          this.showError('Failed to load directory');
        }
      } catch (error) {
        console.error('BusinessDirectory: Load error', error);
        this.showError('Failed to load directory');
      }
    },

    /**
     * Render the directory
     */
    render: function() {
      this.container.innerHTML = '';
      this.container.className = `bd-directory bd-theme-${this.config.theme}`;
      
      // Apply custom styles
      if (Object.keys(this.config.customStyles).length > 0) {
        this.injectCustomStyles();
      }
      
      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'bd-wrapper';
      
      // Add search if enabled
      if (this.config.showSearch) {
        wrapper.appendChild(this.createSearch());
      }
      
      // Add filters if enabled
      if (this.config.showFilters) {
        wrapper.appendChild(this.createFilters());
      }
      
      // Add featured section if enabled and have featured listings
      const featuredListings = this.listings.filter(l => l.isFeatured);
      if (this.config.showFeatured && featuredListings.length > 0) {
        wrapper.appendChild(this.createFeaturedSection(featuredListings));
      }
      
      // Add all listings
      wrapper.appendChild(this.createListingsGrid(this.listings));
      
      this.container.appendChild(wrapper);
      this.attachEventListeners();
    },

    /**
     * Create search bar
     */
    createSearch: function() {
      const search = document.createElement('div');
      search.className = 'bd-search';
      search.innerHTML = `
        <input 
          type="text" 
          class="bd-search-input" 
          placeholder="Search businesses..."
          id="bd-search-input"
        >
      `;
      return search;
    },

    /**
     * Create category filters
     */
    createFilters: function() {
      const filters = document.createElement('div');
      filters.className = 'bd-filters';
      
      let html = '<button class="bd-filter-btn bd-filter-active" data-category="all">All</button>';
      
      for (const [category, count] of Object.entries(this.categories)) {
        const label = this.getCategoryLabel(category);
        const icon = this.getCategoryIcon(category);
        html += `<button class="bd-filter-btn" data-category="${category}">
          ${icon} ${label} (${count})
        </button>`;
      }
      
      filters.innerHTML = html;
      return filters;
    },

    /**
     * Create featured section
     */
    createFeaturedSection: function(listings) {
      const section = document.createElement('div');
      section.className = 'bd-section';
      section.innerHTML = '<h2 class="bd-section-title">⭐ Featured Businesses</h2>';
      section.appendChild(this.createListingsGrid(listings, 'bd-grid-featured'));
      return section;
    },

    /**
     * Create listings grid
     */
    createListingsGrid: function(listings, additionalClass = '') {
      const grid = document.createElement('div');
      grid.className = `bd-grid bd-grid-${this.config.columns} ${additionalClass}`;
      
      listings.forEach(listing => {
        grid.appendChild(this.createListingCard(listing));
      });
      
      return grid;
    },

    /**
     * Create individual listing card
     */
    createListingCard: function(listing) {
      const card = document.createElement('div');
      card.className = 'bd-card';
      card.dataset.category = listing.category;
      card.dataset.name = listing.businessName.toLowerCase();
      card.dataset.description = (listing.description || '').toLowerCase();
      
      const html = `
        ${listing.isFeatured ? '<div class="bd-badge bd-badge-featured">⭐ Featured</div>' : ''}
        
        ${listing.bannerImageUrl ? `
          <div class="bd-card-banner">
            <img src="${this.escapeHtml(listing.bannerImageUrl)}" alt="${this.escapeHtml(listing.businessName)}">
          </div>
        ` : ''}
        
        <div class="bd-card-content">
          <div class="bd-card-header">
            ${listing.logoUrl ? `
              <img src="${this.escapeHtml(listing.logoUrl)}" alt="Logo" class="bd-card-logo">
            ` : ''}
            <div class="bd-card-title-section">
              <h3 class="bd-card-title">${this.escapeHtml(listing.businessName)}</h3>
              ${listing.category ? `
                <span class="bd-category-badge">
                  ${this.getCategoryIcon(listing.category)} ${this.getCategoryLabel(listing.category)}
                </span>
              ` : ''}
            </div>
          </div>
          
          ${listing.description ? `
            <p class="bd-card-description">${this.escapeHtml(listing.description)}</p>
          ` : ''}
          
          <div class="bd-card-contact">
            ${listing.phone ? `<div class="bd-contact-item">📞 ${this.escapeHtml(listing.phone)}</div>` : ''}
            ${listing.city && listing.state ? `
              <div class="bd-contact-item">📍 ${this.escapeHtml(listing.city)}, ${this.escapeHtml(listing.state)}</div>
            ` : ''}
          </div>
          
          ${listing.socialLinks && Object.values(listing.socialLinks).some(url => url) ? `
            <div class="bd-social-links">
              ${listing.socialLinks.facebookUrl ? `<a href="${listing.socialLinks.facebookUrl}" target="_blank" class="bd-social-link">📘</a>` : ''}
              ${listing.socialLinks.instagramUrl ? `<a href="${listing.socialLinks.instagramUrl}" target="_blank" class="bd-social-link">📷</a>` : ''}
              ${listing.socialLinks.linkedinUrl ? `<a href="${listing.socialLinks.linkedinUrl}" target="_blank" class="bd-social-link">💼</a>` : ''}
              ${listing.socialLinks.twitterUrl ? `<a href="${listing.socialLinks.twitterUrl}" target="_blank" class="bd-social-link">🐦</a>` : ''}
            </div>
          ` : ''}
          
          <button class="bd-btn bd-btn-primary" data-listing-id="${listing.id}" data-website-url="${this.escapeHtml(listing.websiteUrl || '')}">
            Visit Website
          </button>
        </div>
        
        <img src="${this.config.trackingUrl}/impression?id=${listing.id}" class="bd-tracking-pixel" alt="" width="1" height="1">
      `;
      
      card.innerHTML = html;
      return card;
    },

    /**
     * Attach event listeners
     */
    attachEventListeners: function() {
      // Search
      const searchInput = document.getElementById('bd-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
      }
      
      // Filters
      const filterBtns = this.container.querySelectorAll('.bd-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => this.handleFilter(e.target.dataset.category));
      });
      
      // Visit website buttons
      const visitBtns = this.container.querySelectorAll('.bd-btn-primary');
      visitBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const listingId = e.target.dataset.listingId;
          const websiteUrl = e.target.dataset.websiteUrl;
          this.handleVisit(listingId, websiteUrl);
        });
      });
    },

    /**
     * Handle search
     */
    handleSearch: function(query) {
      const searchTerm = query.toLowerCase();
      const cards = this.container.querySelectorAll('.bd-card');
      let visibleCount = 0;
      
      cards.forEach(card => {
        const name = card.dataset.name || '';
        const description = card.dataset.description || '';
        const matches = name.includes(searchTerm) || description.includes(searchTerm);
        
        card.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });
      
      this.updateNoResults(visibleCount);
    },

    /**
     * Handle category filter
     */
    handleFilter: function(category) {
      const cards = this.container.querySelectorAll('.bd-card');
      const filterBtns = this.container.querySelectorAll('.bd-filter-btn');
      let visibleCount = 0;
      
      // Update active filter
      filterBtns.forEach(btn => {
        btn.classList.toggle('bd-filter-active', btn.dataset.category === category);
      });
      
      // Filter cards
      cards.forEach(card => {
        const matches = category === 'all' || card.dataset.category === category;
        card.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });
      
      this.updateNoResults(visibleCount);
    },

    /**
     * Handle visit website click
     */
    handleVisit: function(listingId, websiteUrl) {
      // Track click
      if (this.config.trackingUrl) {
        fetch(`${this.config.trackingUrl}/click?id=${listingId}`, { method: 'GET' });
      }
      
      // Call custom handler if provided
      if (this.config.onListingClick) {
        this.config.onListingClick(listingId, websiteUrl);
      }
      
      // Open website
      if (websiteUrl) {
        window.open(websiteUrl, '_blank');
      }
    },

    /**
     * Update no results message
     */
    updateNoResults: function(count) {
      let noResults = this.container.querySelector('.bd-no-results');
      
      if (count === 0) {
        if (!noResults) {
          noResults = document.createElement('div');
          noResults.className = 'bd-no-results';
          noResults.innerHTML = '<p>No businesses found. Try adjusting your search or filter.</p>';
          this.container.querySelector('.bd-wrapper').appendChild(noResults);
        }
        noResults.style.display = 'block';
      } else if (noResults) {
        noResults.style.display = 'none';
      }
    },

    /**
     * Show loading state
     */
    showLoading: function() {
      this.container.innerHTML = '<div class="bd-loading">Loading directory...</div>';
    },

    /**
     * Show error
     */
    showError: function(message) {
      this.container.innerHTML = `<div class="bd-error">${message}</div>`;
    },

    /**
     * Inject custom styles
     */
    injectCustomStyles: function() {
      const styleId = 'bd-custom-styles';
      let styleEl = document.getElementById(styleId);
      
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      
      let css = ':root {';
      for (const [key, value] of Object.entries(this.config.customStyles)) {
        css += `--bd-${key}: ${value};`;
      }
      css += '}';
      
      styleEl.textContent = css;
    },

    /**
     * Get category label
     */
    getCategoryLabel: function(category) {
      const labels = {
        'retail': 'Retail',
        'food_beverage': 'Food & Beverage',
        'health_wellness': 'Health & Wellness',
        'home_services': 'Home Services',
        'professional_services': 'Professional Services',
        'automotive': 'Automotive',
        'beauty': 'Beauty & Personal Care',
        'entertainment': 'Entertainment',
        'education': 'Education',
        'real_estate': 'Real Estate',
        'other': 'Other'
      };
      return labels[category] || category;
    },

    /**
     * Get category icon
     */
    getCategoryIcon: function(category) {
      const icons = {
        'retail': '🛍️',
        'food_beverage': '🍽️',
        'health_wellness': '🏥',
        'home_services': '🏠',
        'professional_services': '💼',
        'automotive': '🚗',
        'beauty': '💅',
        'entertainment': '🎭',
        'education': '📚',
        'real_estate': '🏘️',
        'other': '📍'
      };
      return icons[category] || '📍';
    },

    /**
     * Escape HTML
     */
    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // Auto-detect API base URL from script src
  const scripts = document.getElementsByTagName('script');
  const currentScript = scripts[scripts.length - 1];
  if (currentScript && currentScript.src) {
    const url = new URL(currentScript.src);
    BusinessDirectory.apiBase = url.origin;
  }

  // Expose to window
  window.BusinessDirectory = BusinessDirectory;

})(window);
