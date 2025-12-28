'use client';

import { useRef, useEffect, useState } from 'react';
import { wrapEmailContent, type EmailWrapperOptions } from '@/lib/email-utils';
import { cn } from '@/lib/utils';
import { Maximize2, Minimize2, Monitor, Smartphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';

interface EmailPreviewProps {
  content: string;
  subject?: string;
  className?: string;
  showToolbar?: boolean;
  showSubject?: boolean;
  scale?: number;
  maxHeight?: string;
  /** Options for email wrapper (header button, pricing link, etc.) */
  wrapperOptions?: EmailWrapperOptions;
}

export function EmailPreview({
  content,
  subject,
  className,
  showToolbar = true,
  showSubject = true,
  scale = 1,
  maxHeight = '600px',
  wrapperOptions,
}: EmailPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(500);
  const [key, setKey] = useState(0); // Force re-render key

  // Generate the full email HTML
  const fullEmailHtml = wrapEmailContent(content, wrapperOptions);

  // Update iframe content
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(fullEmailHtml);
    doc.close();

    // Adjust iframe height to content
    const adjustHeight = () => {
      if (doc.body) {
        const height = doc.body.scrollHeight;
        setIframeHeight(Math.min(height + 40, parseInt(maxHeight) || 600));
      }
    };

    // Wait for content to load
    setTimeout(adjustHeight, 100);
    setTimeout(adjustHeight, 500);
  }, [fullEmailHtml, key, maxHeight]);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  return (
    <div className={cn("flex flex-col", className, isFullscreen && "fixed inset-4 z-50 bg-background rounded-lg shadow-2xl")}>
      {showToolbar && (
        <div className="flex items-center justify-between p-2 border-b bg-muted/30 rounded-t-lg">
          <div className="flex items-center gap-1">
            <Toggle
              size="sm"
              pressed={viewMode === 'desktop'}
              onPressedChange={() => setViewMode('desktop')}
              title="Desktop View"
            >
              <Monitor className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={viewMode === 'mobile'}
              onPressedChange={() => setViewMode('mobile')}
              title="Mobile View"
            >
              <Smartphone className="h-4 w-4" />
            </Toggle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              title="Refresh Preview"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {showSubject && subject && (
        <div className="px-4 py-2 border-b bg-white">
          <div className="text-xs text-muted-foreground">Subject</div>
          <div className="font-medium text-sm">{subject}</div>
        </div>
      )}

      <div
        className={cn(
          "flex-1 bg-zinc-100 p-4 overflow-auto rounded-b-lg",
          isFullscreen ? "h-full" : ""
        )}
        style={{ maxHeight: isFullscreen ? 'calc(100% - 80px)' : maxHeight }}
      >
        <div
          className={cn(
            "mx-auto transition-all duration-300 bg-white shadow-sm rounded-lg overflow-hidden",
            viewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-[650px]'
          )}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <iframe
            key={key}
            ref={iframeRef}
            title="Email Preview"
            className="w-full border-0"
            style={{
              height: `${iframeHeight}px`,
              minHeight: '200px',
            }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

// Thumbnail version for cards/lists
interface EmailPreviewThumbnailProps {
  content: string;
  className?: string;
  height?: number;
  /** Options for email wrapper (header button, pricing link, etc.) */
  wrapperOptions?: EmailWrapperOptions;
}

export function EmailPreviewThumbnail({
  content,
  className,
  height = 200,
  wrapperOptions,
}: EmailPreviewThumbnailProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fullEmailHtml = wrapEmailContent(content, wrapperOptions);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(fullEmailHtml);
    doc.close();
  }, [fullEmailHtml]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-zinc-100 rounded-md border",
        className
      )}
      style={{ height: `${height}px` }}
    >
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: 'scale(0.35)',
          width: '286%',
          height: '286%',
        }}
      >
        <iframe
          ref={iframeRef}
          title="Email Preview Thumbnail"
          className="w-full h-full border-0 pointer-events-none"
          sandbox="allow-same-origin"
        />
      </div>
      {/* Overlay to prevent interactions */}
      <div className="absolute inset-0 bg-transparent cursor-pointer" />
    </div>
  );
}
