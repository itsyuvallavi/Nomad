'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Share2,
  Calendar,
  Copy,
  Link,
  FileText,
  Check,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/types/core.types';
import {
  formatAsText,
  formatAsMarkdown,
  formatAsICS,
  formatAsPDF,
  type FormatterResult
} from '../utils/exportFormatters';
import { ExportErrorBoundary } from '@/components/common/ErrorBoundary';

interface ExportMenuProps {
  itinerary: GeneratePersonalizedItineraryOutput;
  className?: string;
}

function ExportMenuComponent({ itinerary, className = '' }: ExportMenuProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const showFeedback = (type: string) => {
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Focus management for menu open/close
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (previousFocusRef.current) {
      // Restore focus when menu closes
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  const handleDownload = (result: FormatterResult) => {
    if (result.content instanceof Blob) {
      const url = URL.createObjectURL(result.content);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const copyToClipboard = async (format: 'text' | 'markdown') => {
    try {
      const result = format === 'markdown'
        ? formatAsMarkdown({ itinerary })
        : formatAsText({ itinerary });

      if (typeof result.content === 'string') {
        await navigator.clipboard.writeText(result.content);
        showFeedback(format);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const exportToCalendar = async () => {
    setExportingType('calendar');

    try {
      const result = formatAsICS({ itinerary });
      handleDownload(result);
      showFeedback('calendar');
    } catch (err) {
      console.error('Failed to export calendar:', err);
    } finally {
      setExportingType(null);
    }
  };

  const exportToPDF = async () => {
    setExportingType('pdf');

    try {
      const result = await formatAsPDF({ itinerary });
      handleDownload(result);
      showFeedback('pdf');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setExportingType(null);
    }
  };

  const shareLink = async () => {
    // For MVP, we'll copy a formatted version to clipboard
    // In production, this would generate an actual shareable URL
    const textResult = formatAsText({ itinerary });
    const shareText = `Check out my trip itinerary: ${itinerary.title}\n\n${textResult.content}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: itinerary.title,
          text: shareText,
        });
        showFeedback('share');
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback to copying to clipboard
      await navigator.clipboard.writeText(shareText);
      showFeedback('share');
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            size="sm"
            className={`min-h-[44px] px-4 ${className}`}
            aria-label="Export itinerary options"
            aria-haspopup="true"
            aria-expanded={isOpen}
          >
            <Share2 className="h-4 w-4 mr-2" aria-hidden="true" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 bg-slate-800 border-slate-700"
          onEscapeKeyDown={() => setIsOpen(false)}
        >
          <DropdownMenuItem
            onClick={() => copyToClipboard('text')}
            className="flex items-center gap-2 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer focus:bg-slate-700 focus:text-white focus:outline-none"
            aria-label="Copy itinerary as plain text"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            <span>Copy as Text</span>
            {copiedType === 'text' && (
              <Check className="h-4 w-4 ml-auto text-green-500" aria-label="Copied successfully" />
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => copyToClipboard('markdown')}
            className="flex items-center gap-2 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer focus:bg-slate-700 focus:text-white focus:outline-none"
            aria-label="Copy itinerary as markdown"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>Copy as Markdown</span>
            {copiedType === 'markdown' && (
              <Check className="h-4 w-4 ml-auto text-green-500" aria-label="Copied successfully" />
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={exportToCalendar}
            disabled={exportingType === 'calendar'}
            className="flex items-center gap-2 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer focus:bg-slate-700 focus:text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export itinerary to calendar file"
            aria-disabled={exportingType === 'calendar'}
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span>{exportingType === 'calendar' ? 'Exporting...' : 'Add to Calendar'}</span>
            {copiedType === 'calendar' && (
              <Check className="h-4 w-4 ml-auto text-green-500" aria-label="Downloaded successfully" />
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={exportToPDF}
            disabled={exportingType === 'pdf'}
            className="flex items-center gap-2 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer focus:bg-slate-700 focus:text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export itinerary as PDF"
            aria-disabled={exportingType === 'pdf'}
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            <span>{exportingType === 'pdf' ? 'Generating PDF...' : 'Export as PDF'}</span>
            {copiedType === 'pdf' && (
              <Check className="h-4 w-4 ml-auto text-green-500" aria-label="Downloaded successfully" />
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={shareLink}
            className="flex items-center gap-2 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer focus:bg-slate-700 focus:text-white focus:outline-none"
            aria-label="Share itinerary link"
          >
            <Link className="h-4 w-4" aria-hidden="true" />
            <span>Share Link</span>
            {copiedType === 'share' && (
              <Check className="h-4 w-4 ml-auto text-green-500" aria-label="Shared successfully" />
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Floating feedback toast */}
      <AnimatePresence>
        {copiedType && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>
              {copiedType === 'text' && 'Copied as text!'}
              {copiedType === 'markdown' && 'Copied as markdown!'}
              {copiedType === 'calendar' && 'Calendar file downloaded!'}
              {copiedType === 'pdf' && 'PDF downloaded!'}
              {copiedType === 'share' && 'Copied share link!'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Export the component wrapped with error boundary
export function ExportMenu(props: ExportMenuProps) {
  return (
    <ExportErrorBoundary>
      <ExportMenuComponent {...props} />
    </ExportErrorBoundary>
  );
}