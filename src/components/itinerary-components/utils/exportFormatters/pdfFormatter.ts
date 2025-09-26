/**
 * PDF export formatter for itineraries
 */

import jsPDF from 'jspdf';
import type { FormatterOptions, FormatterResult } from './types';

interface PDFConfig {
  margin: number;
  lineHeight: number;
  pageWidth: number;
  pageHeight: number;
}

class PDFBuilder {
  private doc: jsPDF;
  private config: PDFConfig;
  private yPosition: number;

  constructor() {
    this.doc = new jsPDF();
    this.config = {
      margin: 20,
      lineHeight: 7,
      pageWidth: this.doc.internal.pageSize.getWidth(),
      pageHeight: this.doc.internal.pageSize.getHeight()
    };
    this.yPosition = this.config.margin;
  }

  private checkPageBreak(requiredSpace: number = 20): void {
    if (this.yPosition > this.config.pageHeight - requiredSpace) {
      this.doc.addPage();
      this.yPosition = this.config.margin;
    }
  }

  private addTitle(title: string): void {
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.config.margin, this.yPosition);
    this.yPosition += 15;
  }

  private addMetadata(destination: string, duration: number): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Destination: ${destination}`, this.config.margin, this.yPosition);
    this.yPosition += this.config.lineHeight;
    this.doc.text(`Duration: ${duration} days`, this.config.margin, this.yPosition);
    this.yPosition += 15;
  }

  private addDay(day: any): void {
    this.checkPageBreak(40);

    // Day header
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`Day ${day.day} - ${day.date}`, this.config.margin, this.yPosition);
    this.yPosition += this.config.lineHeight;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text(day.title, this.config.margin, this.yPosition);
    this.yPosition += 10;

    // Activities
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    day.activities.forEach((activity: any) => {
      this.checkPageBreak();

      this.doc.text(
        `${activity.time}: ${activity.description}`,
        this.config.margin + 5,
        this.yPosition
      );
      this.yPosition += this.config.lineHeight - 1;

      if (activity.address) {
        this.doc.setFontSize(9);
        this.doc.text(
          `Location: ${activity.address}`,
          this.config.margin + 10,
          this.yPosition
        );
        this.doc.setFontSize(10);
        this.yPosition += this.config.lineHeight - 1;
      }
    });

    this.yPosition += 5;
  }

  private addTravelTips(tips: string[]): void {
    this.checkPageBreak(40);

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Travel Tips', this.config.margin, this.yPosition);
    this.yPosition += this.config.lineHeight;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    tips.forEach((tip) => {
      this.checkPageBreak();

      // Wrap long text
      const lines = this.doc.splitTextToSize(
        `• ${tip}`,
        this.config.pageWidth - this.config.margin * 2
      );
      lines.forEach((line: string) => {
        this.doc.text(line, this.config.margin, this.yPosition);
        this.yPosition += this.config.lineHeight - 1;
      });
    });
  }

  public build(itinerary: any): Blob {
    // Add title and metadata
    this.addTitle(itinerary.title);
    this.addMetadata(itinerary.destination, itinerary.itinerary.length);

    // Add days
    itinerary.itinerary.forEach((day: any) => {
      this.addDay(day);
    });

    // Add travel tips if available
    if (itinerary.quickTips && itinerary.quickTips.length > 0) {
      this.addTravelTips(itinerary.quickTips);
    }

    // Return as blob
    const pdfOutput = this.doc.output('blob');
    return pdfOutput;
  }

  public getFilename(title: string | undefined): string {
    return `${(title || 'itinerary').replace(/\s+/g, '_')}.pdf`;
  }
}

export async function formatAsPDF({ itinerary }: FormatterOptions): Promise<FormatterResult> {
  try {
    const builder = new PDFBuilder();
    const pdfBlob = builder.build(itinerary);

    return {
      content: pdfBlob,
      mimeType: 'application/pdf',
      filename: builder.getFilename(itinerary.title)
    };
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw new Error('PDF generation failed');
  }
}