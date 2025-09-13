'use client';

import { useState } from 'react';
import { 
  Share2, 
  Download, 
  Calendar, 
  Copy, 
  Link, 
  FileText,
  Check,
  X,
  FileDown
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import jsPDF from 'jspdf';

interface ExportMenuProps {
  itinerary: GeneratePersonalizedItineraryOutput;
  className?: string;
}

export function ExportMenu({ itinerary, className = '' }: ExportMenuProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [exportingType, setExportingType] = useState<string | null>(null);

  const showFeedback = (type: string) => {
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const formatItineraryAsText = (): string => {
    let text = `${itinerary.title}\n`;
    text += `${itinerary.destination}\n`;
    text += `${itinerary.itinerary.length} days\n\n`;
    
    itinerary.itinerary.forEach((day) => {
      text += `Day ${day.day} - ${day.date}\n`;
      text += `${day.title}\n\n`;
      
      day.activities.forEach((activity) => {
        text += `  ${activity.time}: ${activity.description}\n`;
        if (activity.address) {
          text += `  📍 ${activity.address}\n`;
        }
        text += '\n';
      });
    });
    
    if (itinerary.quickTips && itinerary.quickTips.length > 0) {
      text += '\nTravel Tips:\n';
      itinerary.quickTips.forEach((tip) => {
        text += `• ${tip}\n`;
      });
    }
    
    return text;
  };

  const formatItineraryAsMarkdown = (): string => {
    let md = `# ${itinerary.title}\n\n`;
    md += `**Destination:** ${itinerary.destination}\n`;
    md += `**Duration:** ${itinerary.itinerary.length} days\n\n`;
    
    itinerary.itinerary.forEach((day) => {
      md += `## Day ${day.day} - ${day.date}\n`;
      md += `### ${day.title}\n\n`;
      
      day.activities.forEach((activity) => {
        md += `- **${activity.time}:** ${activity.description}\n`;
        if (activity.address) {
          md += `  - 📍 *${activity.address}*\n`;
        }
      });
      md += '\n';
    });
    
    if (itinerary.quickTips && itinerary.quickTips.length > 0) {
      md += '## Travel Tips\n\n';
      itinerary.quickTips.forEach((tip) => {
        md += `- ${tip}\n`;
      });
    }
    
    return md;
  };

  const copyToClipboard = async (format: 'text' | 'markdown') => {
    try {
      const content = format === 'markdown' 
        ? formatItineraryAsMarkdown() 
        : formatItineraryAsText();
      
      await navigator.clipboard.writeText(content);
      showFeedback(format);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateICS = (): string => {
    const events: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nomad Navigator//EN'];
    
    itinerary.itinerary.forEach((day) => {
      const date = new Date(day.date);
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
      
      day.activities.forEach((activity, index) => {
        events.push('BEGIN:VEVENT');
        events.push(`UID:${dateStr}-${index}@nomadnavigator`);
        events.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
        
        // Parse time and create proper datetime
        const [time, period] = activity.time.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : hours;
        
        events.push(`DTSTART:${dateStr}T${String(adjustedHours).padStart(2, '0')}${String(minutes || 0).padStart(2, '0')}00`);
        events.push(`DTEND:${dateStr}T${String(adjustedHours + 1).padStart(2, '0')}${String(minutes || 0).padStart(2, '0')}00`);
        events.push(`SUMMARY:${activity.description}`);
        
        if (activity.address) {
          events.push(`LOCATION:${activity.address}`);
        }
        
        events.push(`DESCRIPTION:${activity.description}\\nCategory: ${activity.category}`);
        events.push('END:VEVENT');
      });
    });
    
    events.push('END:VCALENDAR');
    return events.join('\r\n');
  };

  const exportToCalendar = () => {
    setExportingType('calendar');
    
    try {
      const icsContent = generateICS();
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${itinerary.title.replace(/\s+/g, '_')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showFeedback('calendar');
    } catch (err) {
      console.error('Failed to export calendar:', err);
    } finally {
      setExportingType(null);
    }
  };

  const exportToPDF = () => {
    setExportingType('pdf');
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const lineHeight = 7;
      let yPosition = margin;
      
      // Add title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(itinerary.title, margin, yPosition);
      yPosition += 15;
      
      // Add destination and duration
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Destination: ${itinerary.destination}`, margin, yPosition);
      yPosition += lineHeight;
      doc.text(`Duration: ${itinerary.itinerary.length} days`, margin, yPosition);
      yPosition += 15;
      
      // Add days
      itinerary.itinerary.forEach((day) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = margin;
        }
        
        // Day header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Day ${day.day} - ${day.date}`, margin, yPosition);
        yPosition += lineHeight;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'italic');
        doc.text(day.title, margin, yPosition);
        yPosition += 10;
        
        // Activities
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        day.activities.forEach((activity) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = margin;
          }
          
          doc.text(`${activity.time}: ${activity.description}`, margin + 5, yPosition);
          yPosition += lineHeight - 1;
          
          if (activity.address) {
            doc.setFontSize(9);
            doc.text(`Location: ${activity.address}`, margin + 10, yPosition);
            doc.setFontSize(10);
            yPosition += lineHeight - 1;
          }
        });
        
        yPosition += 5;
      });
      
      // Add travel tips if available
      if (itinerary.quickTips && itinerary.quickTips.length > 0) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = margin;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Travel Tips', margin, yPosition);
        yPosition += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        itinerary.quickTips.forEach((tip) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = margin;
          }
          
          // Wrap long text
          const lines = doc.splitTextToSize(`• ${tip}`, pageWidth - margin * 2);
          lines.forEach((line: string) => {
            doc.text(line, margin, yPosition);
            yPosition += lineHeight - 1;
          });
        });
      }
      
      // Save the PDF
      doc.save(`${itinerary.title.replace(/\s+/g, '_')}.pdf`);
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
    const shareText = `Check out my trip itinerary: ${itinerary.title}\n\n${formatItineraryAsText()}`;
    
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`min-h-[44px] px-4 ${className}`}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
          <DropdownMenuItem 
            onClick={() => copyToClipboard('text')}
            className="flex items-center gap-2 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            <Copy className="h-4 w-4" />
            <span>Copy as Text</span>
            {copiedType === 'text' && (
              <Check className="h-4 w-4 ml-auto text-green-500" />
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => copyToClipboard('markdown')}
            className="flex items-center gap-2 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span>Copy as Markdown</span>
            {copiedType === 'markdown' && (
              <Check className="h-4 w-4 ml-auto text-green-500" />
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={exportToCalendar}
            disabled={exportingType === 'calendar'}
            className="flex items-center gap-2 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            <Calendar className="h-4 w-4" />
            <span>Add to Calendar</span>
            {copiedType === 'calendar' && (
              <Check className="h-4 w-4 ml-auto text-green-500" />
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={exportToPDF}
            disabled={exportingType === 'pdf'}
            className="flex items-center gap-2 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            <FileDown className="h-4 w-4" />
            <span>Export as PDF</span>
            {copiedType === 'pdf' && (
              <Check className="h-4 w-4 ml-auto text-green-500" />
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={shareLink}
            className="flex items-center gap-2 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            <Link className="h-4 w-4" />
            <span>Share Link</span>
            {copiedType === 'share' && (
              <Check className="h-4 w-4 ml-auto text-green-500" />
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
          >
            <Check className="h-4 w-4" />
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