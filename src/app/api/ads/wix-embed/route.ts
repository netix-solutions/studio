import { NextRequest, NextResponse } from 'next/server';

/**
 * Wix-Optimized Ad Embed Route
 *
 * This endpoint serves a complete, self-contained HTML page designed specifically
 * for Wix websites. It's optimized for:
 * - Wix's sandboxed iframe environment
 * - Custom HTML elements in Wix Editor
 * - Wix Velo (Corvid) integration
 * - Responsive design within Wix layouts
 * - Cross-origin communication with postMessage
 *
 * Usage in Wix:
 * 1. Add an "Embed HTML" or "Custom Element" in Wix Editor
 * 2. Use an iframe pointing to this endpoint
 * 3. The ad will automatically size and rotate
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
  const placementParam = request.nextUrl.searchParams.get('placement') || 'inline';
  const themeParam = request.nextUrl.searchParams.get('theme') || 'auto'; // auto, light, dark
  const responsiveParam = request.nextUrl.searchParams.get('responsive') !== 'false';

  // Self-contained HTML page for Wix iframe
  const wixEmbedHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="robots" content="noindex, nofollow">
  <title>Community Ad</title>
  <style>
    /* Reset and base styles optimized for Wix iframe */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100%;
    }

    /* Theme support */
    body.theme-light {
      background: #ffffff;
    }

    body.theme-dark {
      background: #1a1a1a;
    }

    body.theme-auto {
      background: transparent;
    }

    /* Main ad container */
    .wix-ad-container {
      position: relative;
      width: 100%;
      max-width: 300px;
      aspect-ratio: 3 / 1;
      overflow: hidden;
      border-radius: 8px;
      background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
    }

    body.theme-dark .wix-ad-container {
      background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    /* Responsive sizing */
    .wix-ad-container.responsive {
      max-width: 100%;
      width: 100%;
      height: auto;
    }

    /* Loading state */
    .wix-ad-container.loading::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    /* Ad link wrapper */
    .wix-ad-link {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      text-decoration: none;
      cursor: pointer;
      outline: none;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .wix-ad-link:hover {
      transform: scale(1.015);
    }

    .wix-ad-link:active {
      transform: scale(0.985);
    }

    .wix-ad-link:focus {
      outline: 2px solid #4a90d9;
      outline-offset: 2px;
    }

    /* Ad image */
    .wix-ad-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
    }

    .wix-ad-img.loaded {
      opacity: 1;
    }

    .wix-ad-img.fade-out {
      opacity: 0;
    }

    /* Tracking pixel */
    .wix-ad-pixel {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }

    /* Error state */
    .wix-ad-error {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: #888;
      font-size: 12px;
      text-align: center;
      padding: 10px;
    }

    body.theme-dark .wix-ad-error {
      color: #666;
    }

    /* Rotation indicator (subtle) */
    .wix-ad-rotation-indicator {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      background: rgba(74, 144, 217, 0.6);
      width: 0%;
      transition: width linear;
    }

    body.theme-dark .wix-ad-rotation-indicator {
      background: rgba(74, 144, 217, 0.8);
    }
  </style>
</head>
<body class="theme-${themeParam}">
  <div class="wix-ad-container ${responsiveParam ? 'responsive' : ''} loading" id="ad-container">
    <!-- Ad content will be injected here -->
  </div>

  <script>
    (function() {
      'use strict';

      // Configuration
      var CONFIG = {
        baseUrl: '${baseUrl}',
        serveAllEndpoint: '${baseUrl}/api/ads/serve-all',
        website: '${websiteParam}',
        placement: '${placementParam}',
        rotationInterval: 7500,
        transitionDuration: 500,
        cacheDuration: 60000,
        responsive: ${responsiveParam},
        maxRotationDuration: 300000 // 5 minutes - stop rotation after this to save resources
      };

      // State
      var state = {
        ads: [],
        currentAdId: null,
        currentAdIndex: -1,
        rotationTimer: null,
        rotationStopTimer: null,
        progressTimer: null,
        cache: null,
        cacheTimestamp: 0,
        isVisible: true,
        retryCount: 0,
        maxRetries: 3,
        rotationStopped: false
      };

      // DOM Elements
      var container = document.getElementById('ad-container');

      /**
       * Send message to parent Wix page
       */
      function postToParent(type, data) {
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              source: 'community-ads',
              type: type,
              data: data
            }, '*');
          }
        } catch (e) {
          // Cross-origin restriction - ignore
        }
      }

      /**
       * Listen for messages from parent Wix page
       */
      window.addEventListener('message', function(event) {
        if (!event.data || event.data.source !== 'wix-parent') return;

        switch (event.data.type) {
          case 'pause':
            stopRotation();
            break;
          case 'resume':
            startRotation();
            break;
          case 'refresh':
            state.cache = null;
            fetchAds();
            break;
          case 'visibility':
            state.isVisible = event.data.visible;
            if (state.isVisible) {
              startRotation();
            } else {
              stopRotation();
            }
            break;
        }
      });

      /**
       * Handle visibility changes
       */
      document.addEventListener('visibilitychange', function() {
        state.isVisible = !document.hidden;
        if (state.isVisible) {
          startRotation();
        } else {
          stopRotation();
        }
      });

      /**
       * Fetch ads from server
       */
      function fetchAds() {
        // Check cache
        var now = Date.now();
        if (state.cache && (now - state.cacheTimestamp) < CONFIG.cacheDuration) {
          handleAdsLoaded(state.cache);
          return;
        }

        var url = CONFIG.serveAllEndpoint + '?placement=' + encodeURIComponent(CONFIG.placement);
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
              state.cache = data.ads;
              state.cacheTimestamp = Date.now();
              state.retryCount = 0;
              handleAdsLoaded(data.ads);
            } else {
              showError('No ads available');
            }
          })
          .catch(function(error) {
            console.error('[WixAd] Fetch error:', error);
            state.retryCount++;

            if (state.retryCount < state.maxRetries) {
              // Exponential backoff retry
              setTimeout(fetchAds, Math.pow(2, state.retryCount) * 1000);
            } else {
              showError('Unable to load ads');
            }
          });
      }

      /**
       * Handle ads loaded
       */
      function handleAdsLoaded(ads) {
        state.ads = ads;
        container.classList.remove('loading');

        // Display first ad
        displayAd(true);

        // Start rotation if multiple ads
        if (ads.length > 1) {
          startRotation();
        }

        // Notify parent
        postToParent('loaded', { adCount: ads.length });
      }

      /**
       * Select next ad using weighted random
       */
      function selectNextAd() {
        if (!state.ads || state.ads.length === 0) return null;
        if (state.ads.length === 1) return state.ads[0];

        // Filter out current ad
        var available = state.ads.filter(function(ad) {
          return ad.id !== state.currentAdId;
        });

        if (available.length === 0) {
          available = state.ads;
        }

        // Weighted random selection
        var totalWeight = available.reduce(function(sum, ad) {
          return sum + (ad.weight || 1);
        }, 0);

        var random = Math.random() * totalWeight;

        for (var i = 0; i < available.length; i++) {
          random -= available[i].weight || 1;
          if (random <= 0) return available[i];
        }

        return available[available.length - 1];
      }

      /**
       * Display an ad
       */
      function displayAd(isInitial) {
        var ad = selectNextAd();
        if (!ad) return;

        state.currentAdId = ad.id;

        var businessName = ad.customerName || ad.name || 'Advertisement';

        // Create new ad elements
        var link = document.createElement('a');
        link.className = 'wix-ad-link';
        link.href = ad.clickUrl;
        link.target = '_blank';
        link.rel = 'noopener sponsored';
        link.title = businessName;
        link.setAttribute('aria-label', 'Advertisement: ' + businessName);

        // Track click via postMessage as well
        link.addEventListener('click', function() {
          postToParent('click', { adId: ad.id, businessName: businessName });
        });

        var img = document.createElement('img');
        img.className = 'wix-ad-img';
        img.src = ad.imageUrl;
        img.alt = ad.altText || businessName;
        img.setAttribute('loading', 'eager');

        // Handle image load
        img.onload = function() {
          img.classList.add('loaded');
          if (isInitial) {
            postToParent('firstAdDisplayed', { adId: ad.id });
          }
        };

        img.onerror = function() {
          console.error('[WixAd] Image failed to load:', ad.imageUrl);
          // Try next ad
          if (state.ads.length > 1) {
            state.currentAdId = ad.id; // Mark as current so it gets skipped
            setTimeout(function() { displayAd(isInitial); }, 100);
          }
        };

        link.appendChild(img);

        // Create tracking pixel
        var pixel = document.createElement('img');
        pixel.className = 'wix-ad-pixel';
        pixel.src = ad.impressionUrl;
        pixel.alt = '';
        pixel.setAttribute('aria-hidden', 'true');

        if (isInitial) {
          // Initial load - just swap content
          container.innerHTML = '';
          container.appendChild(link);
          container.appendChild(pixel);
          resetProgressBar();
        } else {
          // Transition - fade out then swap
          var existingImg = container.querySelector('.wix-ad-img');
          if (existingImg) {
            existingImg.classList.remove('loaded');
            existingImg.classList.add('fade-out');
          }

          setTimeout(function() {
            container.innerHTML = '';
            container.appendChild(link);
            container.appendChild(pixel);
            resetProgressBar();
          }, CONFIG.transitionDuration);
        }

        // Notify parent
        postToParent('adDisplayed', {
          adId: ad.id,
          businessName: businessName,
          isInitial: isInitial
        });
      }

      /**
       * Reset and animate progress bar
       */
      function resetProgressBar() {
        // Remove existing progress bar
        var existing = container.querySelector('.wix-ad-rotation-indicator');
        if (existing) existing.remove();

        if (state.ads.length <= 1) return;

        // Create new progress bar
        var progress = document.createElement('div');
        progress.className = 'wix-ad-rotation-indicator';
        container.appendChild(progress);

        // Animate
        requestAnimationFrame(function() {
          progress.style.transitionDuration = CONFIG.rotationInterval + 'ms';
          progress.style.width = '100%';
        });
      }

      /**
       * Start ad rotation
       */
      function startRotation() {
        if (state.rotationTimer) return;
        if (state.ads.length <= 1) return;
        if (!state.isVisible) return;
        if (state.rotationStopped) return; // Don't restart if permanently stopped

        state.rotationTimer = setInterval(function() {
          displayAd(false);
        }, CONFIG.rotationInterval);

        // Schedule permanent stop after 5 minutes to save resources
        if (!state.rotationStopTimer) {
          state.rotationStopTimer = setTimeout(function() {
            state.rotationStopped = true;
            stopRotation();
            postToParent('rotationStopped', { reason: 'timeout', duration: CONFIG.maxRotationDuration });
          }, CONFIG.maxRotationDuration);
        }
      }

      /**
       * Stop ad rotation
       */
      function stopRotation() {
        if (state.rotationTimer) {
          clearInterval(state.rotationTimer);
          state.rotationTimer = null;
        }
      }

      /**
       * Show error message
       */
      function showError(message) {
        container.classList.remove('loading');
        container.innerHTML = '<div class="wix-ad-error">' + message + '</div>';
        postToParent('error', { message: message });
      }

      /**
       * Handle responsive sizing in Wix
       */
      function handleResize() {
        if (!CONFIG.responsive) return;

        var width = window.innerWidth;
        var height = Math.round(width / 3); // 3:1 aspect ratio

        // Notify parent of size requirements
        postToParent('resize', { width: width, height: height });
      }

      // Handle resize
      window.addEventListener('resize', handleResize);

      // Initialize
      function init() {
        handleResize();
        fetchAds();

        // Notify parent that iframe is ready
        postToParent('ready', {
          version: '1.0.0',
          website: CONFIG.website,
          placement: CONFIG.placement
        });
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

  return new NextResponse(wixEmbedHtml, {
    status: 200,
    headers: corsHeaders,
  });
}
