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
  var AD_SERVE_ALL_ENDPOINT = AD_SERVER_BASE + '/api/ads/serve-all';
  var DEFAULT_WEBSITE = '${websiteParam}';
  var ROTATION_INTERVAL = 7500; // 7.5 seconds
  var TRANSITION_DURATION = 500; // 0.5 second transition

  // Display dimensions (scaled down from 600x200 to 300x100)
  var DISPLAY_WIDTH = 300;
  var DISPLAY_HEIGHT = 100;

  // Global ad instance registry for cross-instance synchronization
  var adInstances = [];
  var adsCache = null;
  var adsCacheTimestamp = 0;
  var ADS_CACHE_DURATION = 60000; // 1 minute cache

  // CommunityAds global object
  window.CommunityAds = window.CommunityAds || {};

  /**
   * Generate a unique instance ID
   */
  function generateInstanceId() {
    return 'ca-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }

  /**
   * Get currently displayed ad IDs across all instances
   */
  function getCurrentlyDisplayedAdIds() {
    var displayedIds = [];
    for (var i = 0; i < adInstances.length; i++) {
      if (adInstances[i].currentAdId) {
        displayedIds.push(adInstances[i].currentAdId);
      }
    }
    return displayedIds;
  }

  /**
   * Select a random ad, avoiding currently displayed ads if possible
   */
  function selectNextAd(ads, currentAdId) {
    if (!ads || ads.length === 0) return null;
    if (ads.length === 1) return ads[0];

    var displayedIds = getCurrentlyDisplayedAdIds();

    // Filter out currently displayed ads (including our own current ad)
    var availableAds = ads.filter(function(ad) {
      return displayedIds.indexOf(ad.id) === -1 || ad.id === currentAdId;
    });

    // If all ads are being displayed, use all ads but avoid our current one
    if (availableAds.length === 0) {
      availableAds = ads.filter(function(ad) {
        return ad.id !== currentAdId;
      });
    }

    // If still no options (only one ad exists), return any ad
    if (availableAds.length === 0) {
      availableAds = ads;
    }

    // Weighted random selection
    var totalWeight = availableAds.reduce(function(sum, ad) {
      return sum + (ad.weight || 1);
    }, 0);

    var random = Math.random() * totalWeight;

    for (var i = 0; i < availableAds.length; i++) {
      random -= availableAds[i].weight || 1;
      if (random <= 0) return availableAds[i];
    }

    return availableAds[availableAds.length - 1];
  }

  /**
   * Create CSS styles for ads
   */
  function injectStyles() {
    if (document.getElementById('community-ads-styles')) return;

    var style = document.createElement('style');
    style.id = 'community-ads-styles';
    style.textContent = [
      '.community-ad-wrapper {',
      '  display: inline-block;',
      '  position: relative;',
      '  width: ' + DISPLAY_WIDTH + 'px;',
      '  height: ' + DISPLAY_HEIGHT + 'px;',
      '  overflow: hidden;',
      '  border-radius: 4px;',
      '  background: #f0f0f0;',
      '}',
      '.community-ad-link {',
      '  display: block;',
      '  position: absolute;',
      '  top: 0;',
      '  left: 0;',
      '  width: 100%;',
      '  height: 100%;',
      '  text-decoration: none;',
      '  transition: transform ' + TRANSITION_DURATION + 'ms ease, box-shadow ' + TRANSITION_DURATION + 'ms ease, opacity ' + TRANSITION_DURATION + 'ms ease;',
      '  cursor: pointer;',
      '}',
      '.community-ad-link:hover {',
      '  transform: scale(1.02);',
      '  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);',
      '  opacity: 0.95;',
      '}',
      '.community-ad-link:active {',
      '  transform: scale(0.98);',
      '}',
      '.community-ad-img {',
      '  width: ' + DISPLAY_WIDTH + 'px;',
      '  height: ' + DISPLAY_HEIGHT + 'px;',
      '  object-fit: cover;',
      '  display: block;',
      '  transition: opacity ' + TRANSITION_DURATION + 'ms ease-in-out;',
      '}',
      '.community-ad-img.fade-out {',
      '  opacity: 0;',
      '}',
      '.community-ad-img.fade-in {',
      '  opacity: 1;',
      '}',
      '.community-ad-pixel {',
      '  position: absolute;',
      '  width: 1px;',
      '  height: 1px;',
      '  opacity: 0;',
      '  pointer-events: none;',
      '}'
    ].join('\\n');

    document.head.appendChild(style);
  }

  /**
   * Fetch all ads from the server
   */
  function fetchAds(placement, website, callback) {
    // Check cache first
    var now = Date.now();
    if (adsCache && (now - adsCacheTimestamp) < ADS_CACHE_DURATION) {
      callback(adsCache);
      return;
    }

    var url = AD_SERVE_ALL_ENDPOINT + '?placement=' + encodeURIComponent(placement);
    if (website) {
      url += '&website=' + encodeURIComponent(website);
    }

    fetch(url)
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        if (data.ads && data.ads.length > 0) {
          adsCache = data.ads;
          adsCacheTimestamp = Date.now();
        }
        callback(data.ads || []);
      })
      .catch(function(error) {
        console.error('[CommunityAds] Failed to fetch ads:', error);
        callback([]);
      });
  }

  /**
   * Track an impression for an ad
   */
  function trackImpression(impressionUrl) {
    var pixel = new Image();
    pixel.src = impressionUrl;
  }

  /**
   * Create an ad instance with rotation
   */
  function createAdInstance(container, options) {
    var instance = {
      id: generateInstanceId(),
      container: container,
      currentAdId: null,
      currentAdIndex: -1,
      ads: [],
      rotationTimer: null,
      placement: options.placement || 'inline',
      website: options.site || DEFAULT_WEBSITE
    };

    adInstances.push(instance);

    // Inject styles
    injectStyles();

    // Create wrapper element
    var wrapper = document.createElement('div');
    wrapper.className = 'community-ad-wrapper';
    wrapper.setAttribute('data-instance-id', instance.id);

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(wrapper);

    // Fetch ads and start rotation
    fetchAds(instance.placement, instance.website, function(ads) {
      if (ads.length === 0) {
        console.log('[CommunityAds] No ads available for placement: ' + instance.placement);
        return;
      }

      instance.ads = ads;

      // Display initial ad
      displayAd(instance, wrapper, true);

      // Start rotation if multiple ads
      if (ads.length > 1) {
        instance.rotationTimer = setInterval(function() {
          displayAd(instance, wrapper, false);
        }, ROTATION_INTERVAL);
      }

      // Fire loaded callback
      if (typeof options.onLoad === 'function') {
        options.onLoad(instance.ads[0]);
      }
    });

    return instance;
  }

  /**
   * Display an ad in the wrapper with transition
   */
  function displayAd(instance, wrapper, isInitial) {
    var ad = selectNextAd(instance.ads, instance.currentAdId);
    if (!ad) return;

    instance.currentAdId = ad.id;

    // Get business name for tooltip (prefer customerName, fallback to name)
    var businessName = ad.customerName || ad.name || 'Advertisement';

    // Create new elements
    var link = document.createElement('a');
    link.className = 'community-ad-link';
    link.href = ad.clickUrl;
    link.target = '_blank';
    link.rel = 'noopener sponsored';
    link.title = businessName; // Tooltip with business name

    var img = document.createElement('img');
    img.className = 'community-ad-img' + (isInitial ? ' fade-in' : ' fade-out');
    img.src = ad.imageUrl;
    img.alt = ad.altText || businessName;
    // Images are 600x200 but displayed at 300x100 (50% scale)
    img.width = DISPLAY_WIDTH;
    img.height = DISPLAY_HEIGHT;

    link.appendChild(img);

    // Handle transition
    if (isInitial) {
      while (wrapper.firstChild) {
        wrapper.removeChild(wrapper.firstChild);
      }
      wrapper.appendChild(link);
      trackImpression(ad.impressionUrl);
    } else {
      // Fade out existing ad
      var existingImg = wrapper.querySelector('.community-ad-img');
      if (existingImg) {
        existingImg.classList.remove('fade-in');
        existingImg.classList.add('fade-out');
      }

      // After fade out, swap content
      setTimeout(function() {
        while (wrapper.firstChild) {
          wrapper.removeChild(wrapper.firstChild);
        }
        wrapper.appendChild(link);

        // Force reflow for transition
        void img.offsetWidth;

        img.classList.remove('fade-out');
        img.classList.add('fade-in');

        trackImpression(ad.impressionUrl);
      }, TRANSITION_DURATION);
    }
  }

  /**
   * Load and display an ad in the specified container
   * @param {Object} options - Configuration options
   * @param {string} options.container - CSS selector for the container element
   * @param {string} options.placement - Ad placement type (inline)
   * @param {string} [options.site] - Optional website ID for targeting
   * @param {Object} [options.style] - Optional custom styles for the ad container
   * @param {Function} [options.onLoad] - Callback when first ad loads
   * @param {Function} [options.onError] - Callback on error
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

    try {
      createAdInstance(container, options);
    } catch (error) {
      console.error('[CommunityAds] Failed to create ad instance:', error);
      if (typeof options.onError === 'function') {
        options.onError(error);
      }
    }
  };

  /**
   * Stop rotation for all ad instances
   */
  window.CommunityAds.stopAll = function() {
    for (var i = 0; i < adInstances.length; i++) {
      if (adInstances[i].rotationTimer) {
        clearInterval(adInstances[i].rotationTimer);
        adInstances[i].rotationTimer = null;
      }
    }
  };

  /**
   * Resume rotation for all ad instances
   */
  window.CommunityAds.resumeAll = function() {
    for (var i = 0; i < adInstances.length; i++) {
      var instance = adInstances[i];
      if (!instance.rotationTimer && instance.ads.length > 1) {
        var wrapper = instance.container.querySelector('.community-ad-wrapper');
        if (wrapper) {
          instance.rotationTimer = setInterval(function() {
            displayAd(instance, wrapper, false);
          }, ROTATION_INTERVAL);
        }
      }
    }
  };

  /**
   * Get the number of active ad instances
   */
  window.CommunityAds.getInstanceCount = function() {
    return adInstances.length;
  };

  /**
   * Auto-initialize ads with data attributes
   * Usage: <div data-community-ad data-placement="inline" data-site="wesley-chapel"></div>
   */
  function autoInit() {
    var adContainers = document.querySelectorAll('[data-community-ad]');
    adContainers.forEach(function(container, index) {
      var placement = container.getAttribute('data-placement') || 'inline';
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
