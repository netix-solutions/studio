import { NextRequest, NextResponse } from 'next/server';

/**
 * Wix Embed Code Generator
 *
 * Returns the embed code snippets that Wix users should paste into their websites.
 * Provides multiple integration options:
 * 1. Simple iframe embed
 * 2. Wix Custom HTML element code
 * 3. Wix Velo (Corvid) integration code
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || request.nextUrl.host;
  const baseUrl = `${protocol}://${host}`;

  // Get parameters
  const website = request.nextUrl.searchParams.get('website') || '';
  const placement = request.nextUrl.searchParams.get('placement') || 'inline';
  const theme = request.nextUrl.searchParams.get('theme') || 'auto';
  const responsive = request.nextUrl.searchParams.get('responsive') !== 'false';
  const branding = request.nextUrl.searchParams.get('branding') !== 'false';

  // Build the iframe URL
  const iframeParams = new URLSearchParams({
    website,
    placement,
    theme,
    responsive: responsive.toString(),
    branding: branding.toString(),
  });
  const iframeUrl = `${baseUrl}/api/ads/wix-embed?${iframeParams.toString()}`;

  // Generate different embed code options
  const embedCodes = {
    // Simple iframe embed - works in Wix "Embed HTML" or "Custom Element"
    iframe: {
      name: 'Simple Iframe',
      description: 'Paste this into a Wix "Embed HTML" or "Custom Element" block',
      instructions: [
        '1. In Wix Editor, click "Add" (+) button',
        '2. Select "Embed" → "Embed a Widget" or "Custom Embeds" → "Embed HTML"',
        '3. Click "Enter Code" and paste the code below',
        '4. Resize the element to fit your layout (recommended: 300x100 or 600x200)',
      ],
      code: `<iframe
  src="${iframeUrl}"
  style="width: 100%; height: 100%; border: none; overflow: hidden;"
  scrolling="no"
  frameborder="0"
  allowtransparency="true"
  loading="lazy"
  title="Community Advertisement">
</iframe>`,
    },

    // Responsive iframe with auto-sizing container
    responsiveIframe: {
      name: 'Responsive Iframe',
      description: 'Self-sizing iframe that maintains 3:1 aspect ratio',
      instructions: [
        '1. In Wix Editor, click "Add" (+) button',
        '2. Select "Embed" → "Embed HTML"',
        '3. Click "Enter Code" and paste the code below',
        '4. The ad will automatically resize to fit its container width',
      ],
      code: `<div style="position: relative; width: 100%; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
  <iframe
    src="${iframeUrl}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    scrolling="no"
    frameborder="0"
    allowtransparency="true"
    loading="lazy"
    title="Community Advertisement">
  </iframe>
</div>`,
    },

    // Wix Custom HTML with JavaScript communication
    wixHtmlElement: {
      name: 'Wix HTML Element with Events',
      description: 'Advanced embed with parent-child communication',
      instructions: [
        '1. In Wix Editor, add an "Embed HTML" element',
        '2. Paste this code to enable ad tracking events',
        '3. You can listen for ad events in Wix Velo',
      ],
      code: `<div id="wix-ad-wrapper" style="position: relative; width: 100%; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
  <iframe
    id="wix-ad-frame"
    src="${iframeUrl}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    scrolling="no"
    frameborder="0"
    allowtransparency="true"
    loading="lazy"
    title="Community Advertisement">
  </iframe>
</div>

<script>
(function() {
  // Listen for messages from the ad iframe
  window.addEventListener('message', function(event) {
    if (!event.data || event.data.source !== 'community-ads') return;

    // Forward events to Wix Velo if available
    if (window.wixDevelopersAnalytics) {
      window.wixDevelopersAnalytics.trackEvent(event.data.type, event.data.data);
    }

    // Log for debugging
    console.log('[CommunityAd]', event.data.type, event.data.data);
  });

  // Handle visibility for ad rotation optimization
  document.addEventListener('visibilitychange', function() {
    var iframe = document.getElementById('wix-ad-frame');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        source: 'wix-parent',
        type: 'visibility',
        visible: !document.hidden
      }, '*');
    }
  });
})();
</script>`,
    },

    // Wix Velo (Corvid) integration code
    wixVelo: {
      name: 'Wix Velo Integration',
      description: 'For developers using Wix Velo (Corvid)',
      instructions: [
        '1. Add an HTML iframe element to your page and give it an ID (e.g., #adFrame)',
        '2. In your page code, add this Velo code to initialize the ad',
        '3. The ad will automatically sync with page visibility',
      ],
      code: `// Wix Velo Page Code
// Add this to your page's code panel

import wixWindow from 'wix-window';

$w.onReady(function () {
  // Set the iframe source
  const adUrl = "${iframeUrl}";

  // If using an HTML iframe component
  $w('#adFrame').src = adUrl;

  // Handle page visibility changes
  wixWindow.onVisibilityChange((isVisible) => {
    $w('#adFrame').postMessage({
      source: 'wix-parent',
      type: 'visibility',
      visible: isVisible
    });
  });

  // Listen for ad events
  $w('#adFrame').onMessage((event) => {
    if (event.data.source !== 'community-ads') return;

    switch (event.data.type) {
      case 'loaded':
        console.log('Ads loaded:', event.data.data.adCount);
        break;
      case 'click':
        console.log('Ad clicked:', event.data.data.businessName);
        break;
      case 'error':
        console.error('Ad error:', event.data.data.message);
        break;
    }
  });
});`,
    },

    // Minimal embed for space-constrained areas
    minimal: {
      name: 'Minimal Embed',
      description: 'Compact code for simple integration',
      instructions: [
        '1. Add an "Embed HTML" element in Wix Editor',
        '2. Paste this minimal code',
        '3. Resize to desired dimensions',
      ],
      code: `<iframe src="${iframeUrl}" style="width:300px;height:100px;border:none;" frameborder="0" loading="lazy"></iframe>`,
    },
  };

  const response = {
    success: true,
    website,
    placement,
    theme,
    responsive,
    branding,
    iframeUrl,
    embedCodes,
    documentation: {
      overview: 'Wix-optimized ad embed codes for Community Ads',
      supportedThemes: ['auto', 'light', 'dark'],
      dimensions: {
        standard: '300x100',
        large: '600x200',
        aspectRatio: '3:1',
      },
      events: [
        { type: 'ready', description: 'Iframe is ready to display ads' },
        { type: 'loaded', description: 'Ads have been fetched from server' },
        { type: 'adDisplayed', description: 'An ad is now visible' },
        { type: 'firstAdDisplayed', description: 'The first ad has loaded' },
        { type: 'click', description: 'User clicked on an ad' },
        { type: 'error', description: 'An error occurred' },
        { type: 'resize', description: 'Iframe requests a size change' },
      ],
      parentCommands: [
        { type: 'pause', description: 'Pause ad rotation' },
        { type: 'resume', description: 'Resume ad rotation' },
        { type: 'refresh', description: 'Fetch new ads from server' },
        { type: 'visibility', description: 'Inform ad of page visibility state' },
      ],
    },
  };

  return NextResponse.json(response, { headers: corsHeaders });
}
