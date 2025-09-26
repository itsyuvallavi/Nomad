import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportMenu } from '../Export-menu';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/types/core.types';
import { createMockItinerary } from '../../__tests__/test-utils';

// Mock the clipboard API
const mockClipboard = {
  writeText: jest.fn(),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

// Mock the share API
const mockShare = jest.fn();
Object.assign(navigator, {
  share: mockShare,
});

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('ExportMenu Component', () => {
  let mockItinerary: GeneratePersonalizedItineraryOutput;

  beforeEach(() => {
    mockItinerary = createMockItinerary();
    mockClipboard.writeText.mockClear();
    mockShare.mockClear();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the export button', () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export itinerary options/i });
      expect(exportButton).toBeInTheDocument();
      expect(exportButton).toHaveTextContent('Export');
    });

    it('should render with custom className', () => {
      render(<ExportMenu itinerary={mockItinerary} className="custom-export-menu" />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      expect(exportButton).toHaveClass('custom-export-menu');
    });

    it('should have proper ARIA attributes', () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const trigger = screen.getByRole('button', { name: /export itinerary options/i });
      expect(trigger).toHaveAttribute('aria-haspopup', 'true');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Menu Interaction', () => {
    it('should open menu when clicked', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      expect(screen.getByText('Copy as Text')).toBeInTheDocument();
      expect(screen.getByText('Copy as Markdown')).toBeInTheDocument();
      expect(screen.getByText('Add to Calendar')).toBeInTheDocument();
      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
      expect(screen.getByText('Share Link')).toBeInTheDocument();
    });

    it('should update ARIA expanded when menu opens', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const trigger = screen.getByRole('button', { name: /export itinerary options/i });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await userEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('should close menu on escape key', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      expect(screen.getByText('Copy as Text')).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Copy as Text')).not.toBeInTheDocument();
      });
    });

    it('should close menu when clicking outside', async () => {
      render(
        <div>
          <ExportMenu itinerary={mockItinerary} />
          <button>Outside button</button>
        </div>
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      expect(screen.getByText('Copy as Text')).toBeInTheDocument();

      const outsideButton = screen.getByText('Outside button');
      await userEvent.click(outsideButton);

      await waitFor(() => {
        expect(screen.queryByText('Copy as Text')).not.toBeInTheDocument();
      });
    });
  });

  describe('Copy to Clipboard Functions', () => {
    it('should copy text format to clipboard', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const copyTextOption = screen.getByText('Copy as Text');
      await userEvent.click(copyTextOption);

      expect(mockClipboard.writeText).toHaveBeenCalled();
      const copiedText = mockClipboard.writeText.mock.calls[0][0];
      expect(copiedText).toContain(mockItinerary.title);

      // Check for success feedback
      await waitFor(() => {
        expect(screen.getByText('Copied as text!')).toBeInTheDocument();
      });
    });

    it('should copy markdown format to clipboard', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const copyMarkdownOption = screen.getByText('Copy as Markdown');
      await userEvent.click(copyMarkdownOption);

      expect(mockClipboard.writeText).toHaveBeenCalled();
      const copiedText = mockClipboard.writeText.mock.calls[0][0];
      expect(copiedText).toContain('#'); // Markdown heading

      // Check for success feedback
      await waitFor(() => {
        expect(screen.getByText('Copied as markdown!')).toBeInTheDocument();
      });
    });

    it('should show check icon after successful copy', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const copyTextOption = screen.getByText('Copy as Text');
      await userEvent.click(copyTextOption);

      await waitFor(() => {
        const checkIcon = screen.getByLabelText('Copied successfully');
        expect(checkIcon).toBeInTheDocument();
      });
    });

    it('should handle clipboard errors gracefully', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const copyTextOption = screen.getByText('Copy as Text');
      await userEvent.click(copyTextOption);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to copy:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Calendar Export', () => {
    it('should trigger calendar download', async () => {
      const mockLink = document.createElement('a');
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
      const clickSpy = jest.spyOn(mockLink, 'click');

      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const calendarOption = screen.getByText('Add to Calendar');
      await userEvent.click(calendarOption);

      await waitFor(() => {
        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(clickSpy).toHaveBeenCalled();
        expect(mockLink.download).toContain('.ics');
      });

      createElementSpy.mockRestore();
    });

    it('should show loading state during calendar export', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const calendarOption = screen.getByText('Add to Calendar');
      await userEvent.click(calendarOption);

      expect(screen.getByText('Exporting...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Exporting...')).not.toBeInTheDocument();
      });
    });

    it('should disable calendar option while exporting', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const calendarOption = screen.getByRole('menuitem', { name: /add to calendar/i });
      await userEvent.click(calendarOption);

      expect(calendarOption).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('PDF Export', () => {
    it('should trigger PDF download', async () => {
      const mockLink = document.createElement('a');
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
      const clickSpy = jest.spyOn(mockLink, 'click');

      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const pdfOption = screen.getByText('Export as PDF');
      await userEvent.click(pdfOption);

      await waitFor(() => {
        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(clickSpy).toHaveBeenCalled();
        expect(mockLink.download).toContain('.pdf');
      });

      createElementSpy.mockRestore();
    });

    it('should show loading state during PDF generation', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const pdfOption = screen.getByText('Export as PDF');
      await userEvent.click(pdfOption);

      expect(screen.getByText('Generating PDF...')).toBeInTheDocument();
    });

    it('should handle PDF generation errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock PDF formatter to throw error
      jest.mock('../utils/exportFormatters', () => ({
        ...jest.requireActual('../utils/exportFormatters'),
        formatAsPDF: jest.fn().mockRejectedValue(new Error('PDF generation failed'))
      }));

      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const pdfOption = screen.getByText('Export as PDF');
      await userEvent.click(pdfOption);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to generate PDF:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Share Functionality', () => {
    it('should use native share API when available', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const shareOption = screen.getByText('Share Link');
      await userEvent.click(shareOption);

      expect(mockShare).toHaveBeenCalledWith({
        title: mockItinerary.title,
        text: expect.stringContaining(mockItinerary.title)
      });

      // Check for success feedback
      await waitFor(() => {
        expect(screen.getByText('Copied share link!')).toBeInTheDocument();
      });
    });

    it('should fallback to clipboard when share API unavailable', async () => {
      // Remove share API
      delete (navigator as any).share;

      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const shareOption = screen.getByText('Share Link');
      await userEvent.click(shareOption);

      expect(mockClipboard.writeText).toHaveBeenCalled();

      // Restore share API
      Object.assign(navigator, { share: mockShare });
    });

    it('should handle share cancellation gracefully', async () => {
      mockShare.mockRejectedValue(new Error('User cancelled'));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const shareOption = screen.getByText('Share Link');
      await userEvent.click(shareOption);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Share cancelled or failed');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Feedback Toast', () => {
    it('should show floating toast notification', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const copyTextOption = screen.getByText('Copy as Text');
      await userEvent.click(copyTextOption);

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveClass('fixed', 'bottom-4', 'right-4');
    });

    it('should auto-dismiss toast after 2 seconds', async () => {
      jest.useFakeTimers();

      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const copyTextOption = screen.getByText('Copy as Text');
      await userEvent.click(copyTextOption);

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();

      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(toast).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should use appropriate message for each export type', async () => {
      const exportTypes = [
        { option: 'Copy as Text', message: 'Copied as text!' },
        { option: 'Copy as Markdown', message: 'Copied as markdown!' },
        { option: 'Add to Calendar', message: 'Calendar file downloaded!' },
        { option: 'Export as PDF', message: 'PDF downloaded!' },
        { option: 'Share Link', message: 'Copied share link!' }
      ];

      for (const { option, message } of exportTypes) {
        render(<ExportMenu itinerary={mockItinerary} />);

        const exportButton = screen.getByRole('button', { name: /export/i });
        await userEvent.click(exportButton);

        const menuOption = screen.getByText(option);
        await userEvent.click(menuOption);

        await waitFor(() => {
          expect(screen.getByText(message)).toBeInTheDocument();
        });

        // Clean up for next iteration
        const { unmount } = render(<div />);
        unmount();
      }
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      exportButton.focus();

      // Open with Enter key
      await userEvent.keyboard('{Enter}');
      expect(screen.getByText('Copy as Text')).toBeInTheDocument();

      // Navigate with arrow keys
      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByText('Copy as Markdown')).toHaveFocus();
    });

    it('should maintain focus management', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      exportButton.focus();
      expect(exportButton).toHaveFocus();

      await userEvent.click(exportButton);

      // After closing, focus should return to trigger
      await userEvent.keyboard('{Escape}');
      await waitFor(() => {
        expect(exportButton).toHaveFocus();
      });
    });

    it('should have ARIA live region for feedback', async () => {
      render(<ExportMenu itinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const copyTextOption = screen.getByText('Copy as Text');
      await userEvent.click(copyTextOption);

      const liveRegion = await screen.findByRole('alert');
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });
  });
});