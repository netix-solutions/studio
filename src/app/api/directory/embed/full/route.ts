import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  type DirectoryListing,
  type BusinessCategory,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_ICONS,
  isDirectoryListingActive,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=300',
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

  // Fetch listings
  let listings: DirectoryListing[] = [];
  const categoryStats: Record<string, number> = {};

  try {
    const db = getAdminFirestore();
    const query = db.collection('directory_listings')
      .where('status', '==', 'active');

    const snapshot = await query.get();

    snapshot.forEach((doc) => {
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

      listings.push(listing);
    });

    // Sort: featured first, then by business name
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
      --bg: #ffffff;
      --card-bg: #ffffff;
      --text: #1e293b;
      --text-secondary: #64748b;
      --border: #e2e8f0;
      --featured: #f59e0b;
    }
    
    body.theme-dark {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f1f5f9;
      --text-secondary: #94a3b8;
      --border: #334155;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 20px;
      line-height: 1.6;
    }
    
    .container { max-width: 1400px; margin: 0 auto; }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .search-box {
      max-width: 600px;
      margin: 30px auto;
      position: relative;
    }
    
    .search-input {
      width: 100%;
      padding: 12px 20px;
      font-size: 1rem;
      border: 2px solid var(--border);
      border-radius: 8px;
      background: var(--card-bg);
      color: var(--text);
    }
    
    .category-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 30px;
      justify-content: center;
    }
    
    .category-chip {
      padding: 8px 16px;
      border: 1px solid var(--border);
      border-radius: 20px;
      background: var(--card-bg);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    
    .category-chip:hover,
    .category-chip.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
    
    .grid {
      display: grid;
      grid-template-columns: ${gridCols};
      gap: 24px;
      margin-bottom: 40px;
    }
    
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    }
    
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.15);
    }
    
    .card-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: var(--featured);
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      z-index: 10;
    }
    
    .card-image {
      width: 100%;
      height: 150px;
      object-fit: cover;
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    }
    
    .card-content {
      padding: 20px;
    }
    
    .card-header {
      display: flex;
      align-items: start;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .card-logo {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      object-fit: contain;
      border: 1px solid var(--border);
      background: white;
    }
    
    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .card-category {
      display: inline-block;
      padding: 2px 8px;
      background: var(--border);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    
    .card-description {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .card-contact {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }
    
    .card-button {
      width: 100%;
      padding: 10px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .card-button:hover {
      background: var(--primary-dark);
    }
    
    .section-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .no-results {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary);
    }
    
    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
      
      .header h1 {
        font-size: 2rem;
      }
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
      ${listings.map(listing => renderListingCard(listing, baseUrl)).join('')}
    </div>
    
    <div class="no-results" id="noResults" style="display: none;">
      <h3>No businesses found</h3>
      <p>Try adjusting your search or filter</p>
    </div>
  </div>
  
  <script>
    const searchInput = document.getElementById('searchInput');
    const categoryChips = document.querySelectorAll('.category-chip');
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
    
    categoryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        categoryChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentCategory = chip.dataset.category;
        filterListings();
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
  
  return `
    <div class="card" 
         data-category="${listing.category}" 
         data-name="${escapeHtml(listing.businessName)}"
         data-description="${escapeHtml(listing.description || '')}">
      ${listing.isFeatured ? '<div class="card-badge">⭐ Featured</div>' : ''}
      
      ${listing.bannerImageUrl ? `
        <img src="${escapeHtml(listing.bannerImageUrl)}" class="card-image" alt="${escapeHtml(listing.businessName)}">
      ` : ''}
      
      <div class="card-content">
        <div class="card-header">
          ${listing.logoUrl ? `
            <img src="${escapeHtml(listing.logoUrl)}" class="card-logo" alt="Logo">
          ` : ''}
          <div>
            <div class="card-title">${escapeHtml(listing.businessName)}</div>
            ${categoryLabel ? `
              <span class="card-category">${categoryIcon} ${categoryLabel}</span>
            ` : ''}
          </div>
        </div>
        
        ${listing.description ? `
          <div class="card-description">${escapeHtml(listing.description)}</div>
        ` : ''}
        
        <div class="card-contact">
          ${listing.phone ? `<div>📞 ${escapeHtml(listing.phone)}</div>` : ''}
          ${listing.city && listing.state ? `<div>📍 ${escapeHtml(listing.city)}, ${escapeHtml(listing.state)}</div>` : ''}
        </div>
        
        <a href="${baseUrl}/api/directory/track/click?id=${listing.id}" target="_blank" rel="noopener">
          <button class="card-button">Visit Website</button>
        </a>
      </div>
      
      <img class="tracking-pixel" data-src="${baseUrl}/api/directory/track/impression?id=${listing.id}" style="position:absolute;width:1px;height:1px;opacity:0" alt="">
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
