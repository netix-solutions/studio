import { NextRequest, NextResponse } from 'next/server';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/javascript',
  'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  // Get the base URL for the API
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || request.nextUrl.host;
  const baseUrl = `${protocol}://${host}`;

  // Get the website parameter from the embed script URL
  const websiteParam = request.nextUrl.searchParams.get('website') || '';

  // The embed script that will be served to external sites
  const embedScript = `
(function() {
  'use strict';

  // Configuration
  var AD_SERVER_BASE = '${baseUrl}';
  var AD_SERVE_ENDPOINT = AD_SERVER_BASE + '/api/ads/serve';
  var DEFAULT_WEBSITE = '${websiteParam}'; // Website ID passed via script URL

  // CommunityAds global object
  window.CommunityAds = window.CommunityAds || {};

  /**
   * Load and display an ad in the specified container
   * @param {Object} options - Configuration options
   * @param {string} options.container - CSS selector for the container element
   * @param {string} options.placement - Ad placement type (banner, sidebar, inline, popup, footer)
   * @param {string} [options.site] - Optional website ID for targeting (e.g., 'wesley-chapel', 'pasco-county')
   * @param {Object} [options.style] - Optional custom styles for the ad container
   */
  window.CommunityAds.load = function(options) {
    if (!options || !options.container) {
      console.error('[CommunityAds] Container selector is required');
      return;
    }

    var container = document.querySelector(options.container);
    if (!container) {
      console.error('[CommunityAds] Container not found: ' + options.container);
      return;
    }

    var placement = options.placement || 'inline';
    // Use website from: 1) options.site, 2) DEFAULT_WEBSITE from script URL, 3) hostname as fallback
    var website = options.site || DEFAULT_WEBSITE || '';

    // Build the API URL with website parameter
    var url = AD_SERVE_ENDPOINT + '?placement=' + encodeURIComponent(placement);
    if (website) {
      url += '&website=' + encodeURIComponent(website);
    }

    // Fetch ad from server
    fetch(url)
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        if (!data.ad) {
          console.log('[CommunityAds] No ad available for placement: ' + placement);
          return;
        }

        var ad = data.ad;

        // Create ad wrapper
        var wrapper = document.createElement('div');
        wrapper.className = 'community-ad';
        wrapper.setAttribute('data-ad-id', ad.id);
        wrapper.setAttribute('data-placement', ad.placement);

        // Apply default styles
        wrapper.style.display = 'inline-block';
        wrapper.style.position = 'relative';
        wrapper.style.textAlign = 'center';

        // Apply custom styles if provided
        if (options.style) {
          for (var prop in options.style) {
            if (options.style.hasOwnProperty(prop)) {
              wrapper.style[prop] = options.style[prop];
            }
          }
        }

        // Create clickable link
        var link = document.createElement('a');
        // Use absolute URL from server (already includes base URL)
        link.href = data.clickUrl;
        link.target = '_blank';
        link.rel = 'noopener sponsored';
        link.style.display = 'block';

        // Create image
        var img = document.createElement('img');
        img.src = ad.imageUrl;
        img.alt = ad.altText || 'Advertisement';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';

        if (ad.width) {
          img.style.width = ad.width + 'px';
        }
        if (ad.height) {
          img.style.maxHeight = ad.height + 'px';
        }

        // Create impression tracking pixel
        var pixel = document.createElement('img');
        // Use absolute URL from server (already includes base URL)
        pixel.src = data.impressionUrl;
        pixel.alt = '';
        pixel.style.position = 'absolute';
        pixel.style.width = '1px';
        pixel.style.height = '1px';
        pixel.style.opacity = '0';
        pixel.style.pointerEvents = 'none';

        // Assemble the ad
        link.appendChild(img);
        wrapper.appendChild(link);
        wrapper.appendChild(pixel);

        // Clear container and insert ad
        container.innerHTML = '';
        container.appendChild(wrapper);

        // Fire loaded callback if provided
        if (typeof options.onLoad === 'function') {
          options.onLoad(ad);
        }
      })
      .catch(function(error) {
        console.error('[CommunityAds] Failed to load ad:', error);
        if (typeof options.onError === 'function') {
          options.onError(error);
        }
      });
  };

  /**
   * Auto-initialize ads with data attributes
   * Usage: <div data-community-ad data-placement="banner" data-site="wesley-chapel"></div>
   */
  function autoInit() {
    var adContainers = document.querySelectorAll('[data-community-ad]');
    adContainers.forEach(function(container, index) {
      var placement = container.getAttribute('data-placement') || 'inline';
      // data-site can be a website ID (e.g., 'wesley-chapel') for targeting
      var site = container.getAttribute('data-site') || DEFAULT_WEBSITE;
      var containerId = 'community-ad-' + index + '-' + Date.now();
      container.id = containerId;

      window.CommunityAds.load({
        container: '#' + containerId,
        placement: placement,
        site: site
      });
    });
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
`.trim();

  return new NextResponse(embedScript, {
    status: 200,
    headers: corsHeaders,
  });
}
