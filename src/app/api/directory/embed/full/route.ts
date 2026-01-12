import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  type DirectoryListing,
  type LiveAd,
  type BusinessCategory,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_ICONS,
  isDirectoryListingActive,
  isDirectoryListingVisible,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=60',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const baseUrl = `${protocol}://${host}`;

  // Get parameters
  const themeParam = request.nextUrl.searchParams.get('theme') || 'light';
  const categoryParam = request.nextUrl.searchParams.get('category') || '';
  const featuredParam = request.nextUrl.searchParams.get('featured') === 'true';
  const columnsParam = request.nextUrl.searchParams.get('columns') || 'auto';

  // Fetch listings from both sources
  let listings: DirectoryListing[] = [];
  const categoryStats: Record<string, number> = {};

  try {
    const db = getAdminFirestore();

    // 1. Fetch approved listings from live_ads collection
    const liveAdsSnapshot = await db.collection('live_ads')
      .where('status', '==', 'active')
      .get();

    liveAdsSnapshot.forEach((doc) => {
      const ad = { id: doc.id, ...doc.data() } as LiveAd;

      // Check if directory listing is visible (approved, active, showInDirectory not false)
      if (!isDirectoryListingVisible(ad)) {
        return;
      }

      const dirListing = ad.directoryListing!;

      // Category filter
      if (categoryParam && dirListing.category !== categoryParam) {
        return;
      }

      // Featured filter
      if (featuredParam && !dirListing.isFeatured) {
        return;
      }

      // Track category stats
      if (dirListing.category) {
        categoryStats[dirListing.category] = (categoryStats[dirListing.category] || 0) + 1;
      }

      // Convert to DirectoryListing format for rendering
      listings.push({
        id: ad.id,
        businessName: dirListing.businessName || ad.customerName || 'Business',
        tagline: dirListing.tagline,
        description: dirListing.description,
        category: dirListing.category,
        phone: dirListing.phone,
        email: dirListing.email,
        websiteUrl: dirListing.websiteUrl || ad.targetUrl,
        logoUrl: dirListing.logoUrl,
        bannerImageUrl: dirListing.bannerImageUrl || ad.imageUrl,
        address: dirListing.address,
        city: dirListing.city,
        state: dirListing.state,
        zipCode: dirListing.zipCode,
        facebookUrl: dirListing.facebookUrl,
        instagramUrl: dirListing.instagramUrl,
        linkedinUrl: dirListing.linkedinUrl,
        twitterUrl: dirListing.twitterUrl,
        youtubeUrl: dirListing.youtubeUrl,
        tiktokUrl: dirListing.tiktokUrl,
        yelpUrl: dirListing.yelpUrl,
        googleBusinessUrl: dirListing.googleBusinessUrl,
        isFeatured: dirListing.isFeatured,
        showContactInfo: dirListing.showContactInfo ?? true,
        showSocialLinks: dirListing.showSocialLinks ?? true,
        showAddress: dirListing.showAddress ?? false,
        sortOrder: dirListing.sortOrder,
      } as DirectoryListing);
    });

    // 2. Fetch active listings from directory_listings collection (free/standalone listings)
    const directoryListingsSnapshot = await db.collection('directory_listings')
      .where('status', '==', 'active')
      .get();

    directoryListingsSnapshot.forEach((doc) => {
      const listing = { id: doc.id, ...doc.data() } as DirectoryListing;

      // Check if listing is truly active
      if (!isDirectoryListingActive(listing)) {
        return;
      }

      // Category filter
      if (categoryParam && listing.category !== categoryParam) {
        return;
      }

      // Featured filter
      if (featuredParam && !listing.isFeatured) {
        return;
      }

      // Track category stats
      if (listing.category) {
        categoryStats[listing.category] = (categoryStats[listing.category] || 0) + 1;
      }

      // Mark as free listing
      listings.push({
        ...listing,
        id: `free_${listing.id}`,
      });
    });

    // Sort: featured first, then by sort order, then by business name
    listings.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      if (a.sortOrder !== b.sortOrder) return (a.sortOrder || 0) - (b.sortOrder || 0);
      return a.businessName.localeCompare(b.businessName);
    });

  } catch (error) {
    console.error('Error fetching directory listings:', error);
  }

  const featuredListings = listings.filter(l => l.isFeatured);

  // Build category data
  const categoriesWithCount = Object.entries(BUSINESS_CATEGORY_LABELS)
    .map(([id, label]) => ({
      id,
      label,
      icon: BUSINESS_CATEGORY_ICONS[id as BusinessCategory],
      count: categoryStats[id] || 0,
    }))
    .filter(cat => cat.count > 0)
    .sort((a, b) => b.count - a.count);

  // Generate HTML
  const html = generateDirectoryHTML({
    listings,
    featuredListings,
    categoriesWithCount,
    theme: themeParam,
    columns: columnsParam,
    baseUrl,
  });

  return new NextResponse(html, {
    status: 200,
    headers: corsHeaders,
  });
}

function generateDirectoryHTML(options: {
  listings: DirectoryListing[];
  featuredListings: DirectoryListing[];
  categoriesWithCount: Array<{ id: string; label: string; icon: string; count: number }>;
  theme: string;
  columns: string;
  baseUrl: string;
}): string {
  const { listings, featuredListings, categoriesWithCount, theme, columns, baseUrl } = options;

  const gridCols = columns === 'auto' ? 'auto-fill, minmax(320px, 1fr)' 
    : columns === '2' ? 'repeat(2, 1fr)'
    : columns === '3' ? 'repeat(3, 1fr)'
    : columns === '4' ? 'repeat(4, 1fr)'
    : 'auto-fill, minmax(320px, 1fr)';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Business Directory</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    :root {
      --primary: #3b82f6;
      --primary-dark: #2563eb;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #1e293b;
      --text-secondary: #64748b;
      --border: #e2e8f0;
      --featured: #f59e0b;
      --social-bg: #f1f5f9;
    }
    
    body.theme-dark {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f1f5f9;
      --text-secondary: #94a3b8;
      --border: #334155;
      --social-bg: #334155;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 16px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    
    @media (min-width: 768px) {
      body { padding: 24px; }
    }
    
    .container { max-width: 1400px; margin: 0 auto; }
    
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .header h1 {
      font-size: 1.75rem;
      font-weight: 800;
      margin-bottom: 8px;
      background: linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    @media (min-width: 768px) {
      .header h1 { font-size: 2.5rem; }
    }
    
    .header p {
      color: var(--text-secondary);
      font-size: 1rem;
    }
    
    .search-box {
      max-width: 600px;
      margin: 24px auto;
      position: relative;
    }
    
    .search-input {
      width: 100%;
      padding: 14px 20px;
      font-size: 16px;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: var(--card-bg);
      color: var(--text);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }
    
    /* ===== CATEGORY GRID (Mobile: 3 cols, Desktop: flexible) ===== */
    .category-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 24px;
    }
    
    @media (min-width: 768px) {
      .category-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
      }
    }
    
    .category-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 14px 8px;
      background: var(--card-bg);
      border: 2px solid var(--border);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
      min-height: 90px;
    }
    
    .category-tile:active { transform: scale(0.96); }
    
    .category-tile.active {
      background: var(--primary);
      border-color: var(--primary);
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
    }
    
    .category-tile-count {
      font-size: 0.65rem;
      font-weight: 700;
      background: rgba(59, 130, 246, 0.15);
      color: var(--primary);
      padding: 2px 8px;
      border-radius: 10px;
    }
    
    .category-tile-all {
      background: linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%);
      border-color: transparent;
      color: white;
    }
    
    .category-tile-all .category-tile-count {
      background: rgba(255,255,255,0.25);
      color: white;
    }
    
    /* ===== DESKTOP CATEGORY FILTERS - HIDDEN (using category grid instead) ===== */
    .category-filters {
      display: none;
    }
    
    .category-chip {
      flex-shrink: 0;
      padding: 10px 18px;
      border: 2px solid var(--border);
      border-radius: 24px;
      background: var(--card-bg);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
      white-space: nowrap;
    }
    
    .category-chip:hover,
    .category-chip.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
    
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      margin-bottom: 40px;
    }
    
    @media (min-width: 640px) {
      .grid { grid-template-columns: repeat(2, 1fr); }
    }
    
    @media (min-width: 1024px) {
      .grid { grid-template-columns: ${gridCols}; gap: 24px; }
    }
    
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    
    @media (hover: hover) {
      .card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(0,0,0,0.12);
      }
    }
    
    .card-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 5px 12px;
      border-radius: 16px;
      font-size: 0.7rem;
      font-weight: 600;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    }
    
    .card-image-container {
      width: 100%;
      aspect-ratio: 3 / 1;
      overflow: hidden;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    }
    
    .card-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .card-content {
      padding: 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    @media (min-width: 768px) {
      .card-content { padding: 20px; }
    }
    
    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .card-logo {
      width: 52px;
      height: 52px;
      border-radius: 10px;
      object-fit: contain;
      border: 1px solid var(--border);
      background: white;
      flex-shrink: 0;
    }
    
    .card-header-text {
      flex: 1;
      min-width: 0;
    }
    
    .card-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 4px;
      line-height: 1.3;
    }
    
    .card-tagline {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-style: italic;
      margin-bottom: 4px;
    }
    
    .card-category {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      background: rgba(59, 130, 246, 0.1);
      border-radius: 6px;
      font-size: 0.75rem;
      color: var(--primary);
      font-weight: 500;
    }
    
    .card-description {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.5;
    }
    
    .card-contact {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }
    
    .card-contact-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .card-social {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .card-social-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      background: var(--social-bg);
      border-radius: 8px;
      text-decoration: none;
      font-size: 1rem;
      transition: all 0.2s;
    }
    
    .card-social-link:hover {
      background: var(--primary);
      transform: translateY(-2px);
    }
    
    .card-actions {
      margin-top: auto;
    }
    
    .card-button {
      display: block;
      width: 100%;
      padding: 12px 16px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      text-align: center;
    }
    
    .card-button:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
    }
    
    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    @media (min-width: 768px) {
      .section-title { font-size: 1.75rem; margin-bottom: 24px; }
    }
    
    .no-results {
      text-align: center;
      padding: 48px 20px;
      color: var(--text-secondary);
    }
    
    .no-results h3 { margin-bottom: 8px; }
    
    /* ===== INLINE CTA ===== */
    .inline-cta {
      grid-column: 1 / -1;
      padding: 20px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
      border: 2px dashed rgba(59, 130, 246, 0.3);
      border-radius: 12px;
      margin: 8px 0;
    }
    
    .inline-cta-content {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    
    @media (min-width: 640px) {
      .inline-cta-content { flex-wrap: nowrap; }
    }
    
    .inline-cta-icon {
      font-size: 1.75rem;
      flex-shrink: 0;
    }
    
    .inline-cta-text {
      flex: 1;
      min-width: 150px;
    }
    
    .inline-cta-text strong {
      display: block;
      font-size: 0.95rem;
      color: var(--text);
      margin-bottom: 2px;
    }
    
    .inline-cta-text span {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    
    .inline-cta-button {
      flex-shrink: 0;
      padding: 10px 20px;
      background: var(--primary);
      color: white;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      white-space: nowrap;
    }
    
    .inline-cta-button:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
    }
    
    @media (max-width: 639px) {
      .inline-cta-button {
        width: 100%;
        text-align: center;
        margin-top: 8px;
      }
    }
    
    .cta-banner {
      margin-top: 48px;
      padding: 28px 20px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      border-radius: 16px;
      color: white;
      text-align: center;
    }
    
    @media (min-width: 768px) {
      .cta-banner { padding: 40px; }
      .cta-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        text-align: left;
      }
    }
    
    .cta-text h3 {
      margin: 8px 0 4px;
      font-size: 1.5rem;
      font-weight: 700;
    }
    
    .cta-text p {
      margin: 0 0 20px;
      opacity: 0.9;
    }
    
    @media (min-width: 768px) {
      .cta-text p { margin-bottom: 0; }
    }
    
    .cta-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    
    .cta-button {
      display: inline-block;
      background: white;
      color: #4f46e5;
      padding: 14px 32px;
      border-radius: 10px;
      font-weight: 700;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body class="theme-${theme}">
  <div class="container">
    <div class="header">
      <h1>Business Directory</h1>
      <p>Discover local businesses serving our community</p>
    </div>
    
    <div class="search-box">
      <input type="text" class="search-input" id="searchInput" placeholder="Search businesses...">
    </div>
    
    ${categoriesWithCount.length > 0 ? `
    <!-- Mobile Category Grid (3 columns) -->
    <div class="category-grid">
      <div class="category-tile category-tile-all active" data-category="all">
        <span class="category-tile-icon">🏢</span>
        <span class="category-tile-name">View All</span>
        <span class="category-tile-count">${listings.length}</span>
      </div>
      ${categoriesWithCount.map(cat => `
        <div class="category-tile" data-category="${cat.id}">
          <span class="category-tile-icon">${cat.icon}</span>
          <span class="category-tile-name">${cat.label}</span>
          <span class="category-tile-count">${cat.count}</span>
        </div>
      `).join('')}
    </div>
    
    <!-- Desktop Category Filters -->
    <div class="category-filters">
      <div class="category-chip active" data-category="all">All (${listings.length})</div>
      ${categoriesWithCount.map(cat => `
        <div class="category-chip" data-category="${cat.id}">
          ${cat.icon} ${cat.label} (${cat.count})
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    ${featuredListings.length > 0 ? `
    <div class="section-title">
      ⭐ Featured Businesses
    </div>
    <div class="grid" id="featuredGrid">
      ${featuredListings.map(listing => renderListingCard(listing, baseUrl)).join('')}
    </div>
    ` : ''}
    
    <div class="section-title">
      ${featuredListings.length > 0 ? 'All Businesses' : 'Our Businesses'}
    </div>
    <div class="grid" id="businessGrid">
      ${renderListingsWithCTAs(listings, baseUrl)}
    </div>
    
    <div class="no-results" id="noResults" style="display: none;">
      <h3>No businesses found</h3>
      <p>Try adjusting your search or filter</p>
    </div>
    
    <!-- CTA Banner -->
    <div class="cta-banner">
      <div class="cta-content">
        <div class="cta-text">
          <span class="cta-badge">📢 Advertise With Us</span>
          <h3>Want your business here?</h3>
          <p>Get discovered by thousands in our community. Reach local customers with a directory listing.</p>
        </div>
        <a href="${baseUrl}/directory-signup" target="_blank" rel="noopener" class="cta-button">
          Get Started →
        </a>
      </div>
    </div>
  </div>
  
  <script>
    const searchInput = document.getElementById('searchInput');
    const categoryChips = document.querySelectorAll('.category-chip');
    const categoryTiles = document.querySelectorAll('.category-tile');
    const businessGrid = document.getElementById('businessGrid');
    const featuredGrid = document.getElementById('featuredGrid');
    const noResults = document.getElementById('noResults');
    const allCards = document.querySelectorAll('.card');
    
    let currentCategory = 'all';
    let currentSearch = '';
    
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase();
      filterListings();
    });
    
    // Helper to set active category and sync both mobile tiles and desktop chips
    function setActiveCategory(category) {
      currentCategory = category;
      categoryChips.forEach(c => {
        c.classList.toggle('active', c.dataset.category === category);
      });
      categoryTiles.forEach(t => {
        t.classList.toggle('active', t.dataset.category === category);
      });
      filterListings();
    }
    
    // Desktop category chips
    categoryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        setActiveCategory(chip.dataset.category);
      });
    });
    
    // Mobile category tiles
    categoryTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        setActiveCategory(tile.dataset.category);
      });
    });
    
    function filterListings() {
      let visibleCount = 0;
      
      allCards.forEach(card => {
        const category = card.dataset.category;
        const name = card.dataset.name.toLowerCase();
        const description = card.dataset.description.toLowerCase();
        
        const matchesCategory = currentCategory === 'all' || category === currentCategory;
        const matchesSearch = !currentSearch || name.includes(currentSearch) || description.includes(currentSearch);
        
        if (matchesCategory && matchesSearch) {
          card.style.display = '';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });
      
      noResults.style.display = visibleCount === 0 ? 'block' : 'none';
      if (featuredGrid) {
        const hasFeatured = Array.from(featuredGrid.children).some(card => card.style.display !== 'none');
        featuredGrid.parentElement.style.display = hasFeatured ? '' : 'none';
      }
    }
    
    // Track impressions
    document.querySelectorAll('.tracking-pixel').forEach(pixel => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            observer.unobserve(img);
          }
        });
      });
      observer.observe(pixel);
    });
  </script>
</body>
</html>`;
}

function renderListingCard(listing: DirectoryListing, baseUrl: string): string {
  const categoryLabel = listing.category ? BUSINESS_CATEGORY_LABELS[listing.category as BusinessCategory] : '';
  const categoryIcon = listing.category ? BUSINESS_CATEGORY_ICONS[listing.category as BusinessCategory] : '';
  
  // Build social links array
  const socialLinks: Array<{ url: string; icon: string; label: string }> = [];
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
  
  return `
    <div class="card" 
         data-category="${listing.category || ''}" 
         data-name="${escapeHtml(listing.businessName)}"
         data-description="${escapeHtml(listing.description || '')}">
      ${listing.isFeatured ? '<div class="card-badge">⭐ Featured</div>' : ''}
      
      ${listing.bannerImageUrl ? `
        <div class="card-image-container">
          <img src="${escapeHtml(listing.bannerImageUrl)}" class="card-image" alt="${escapeHtml(listing.businessName)}" loading="lazy">
        </div>
      ` : ''}
      
      <div class="card-content">
        <div class="card-header">
          ${listing.logoUrl ? `
            <img src="${escapeHtml(listing.logoUrl)}" class="card-logo" alt="Logo" loading="lazy">
          ` : ''}
          <div class="card-header-text">
            <div class="card-title">${escapeHtml(listing.businessName)}</div>
            ${listing.tagline ? `<div class="card-tagline">${escapeHtml(listing.tagline)}</div>` : ''}
            ${categoryLabel ? `
              <span class="card-category">${categoryIcon} ${categoryLabel}</span>
            ` : ''}
          </div>
        </div>
        
        ${listing.description ? `
          <div class="card-description">${escapeHtml(listing.description)}</div>
        ` : ''}
        
        ${showContact ? `
          <div class="card-contact">
            ${listing.phone ? `<span class="card-contact-item">📞 ${escapeHtml(listing.phone)}</span>` : ''}
            ${listing.email ? `<span class="card-contact-item">✉️ ${escapeHtml(listing.email)}</span>` : ''}
            ${listing.city && listing.state ? `<span class="card-contact-item">📍 ${escapeHtml(listing.city)}, ${escapeHtml(listing.state)}</span>` : ''}
            ${listing.showAddress && listing.address ? `<span class="card-contact-item">🏠 ${escapeHtml(listing.address)}</span>` : ''}
          </div>
        ` : ''}
        
        ${showSocial ? `
          <div class="card-social">
            ${socialLinks.map(link => `
              <a href="${escapeHtml(link.url)}" class="card-social-link" target="_blank" rel="noopener" title="${link.label}">
                ${link.icon}
              </a>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="card-actions">
          <a href="${baseUrl}/api/directory/track/click?id=${listing.id}" target="_blank" rel="noopener" class="card-button">
            Visit Website →
          </a>
        </div>
      </div>
      
      <img class="tracking-pixel" data-src="${baseUrl}/api/directory/track/impression?id=${listing.id}" style="position:absolute;width:1px;height:1px;opacity:0" alt="">
    </div>
  `;
}

function renderListingsWithCTAs(listings: DirectoryListing[], baseUrl: string): string {
  const CTA_INTERVAL = 4; // Show CTA every 4 listings
  let html = '';
  
  listings.forEach((listing, index) => {
    html += renderListingCard(listing, baseUrl);
    
    // Add inline CTA after every CTA_INTERVAL listings (but not after the last one)
    if ((index + 1) % CTA_INTERVAL === 0 && index < listings.length - 1) {
      html += renderInlineCTA(baseUrl);
    }
  });
  
  return html;
}

function renderInlineCTA(baseUrl: string): string {
  return `
    <div class="inline-cta" data-cta="true">
      <div class="inline-cta-content">
        <span class="inline-cta-icon">🏪</span>
        <div class="inline-cta-text">
          <strong>Own a local business?</strong>
          <span>Get listed in our directory and reach local customers!</span>
        </div>
        <a href="${baseUrl}/directory-signup" class="inline-cta-button" target="_blank" rel="noopener">
          Learn More
        </a>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
