import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItineraryDisplay } from '../ItineraryDisplay';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/types/core.types';

// Mock data generators
import { createMockItinerary, createMockDestination, createMockActivity } from '../../__tests__/test-utils';

describe('ItineraryDisplay Component', () => {
  let mockItinerary: GeneratePersonalizedItineraryOutput;

  beforeEach(() => {
    // Reset mock data before each test
    mockItinerary = createMockItinerary();
  });

  describe('Rendering', () => {
    it('should render the itinerary title and summary', () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      expect(screen.getByText(mockItinerary.title)).toBeInTheDocument();
      expect(screen.getByText(mockItinerary.summary)).toBeInTheDocument();
    });

    it('should display all destinations in the switcher', () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      mockItinerary.destinations.forEach(destination => {
        expect(screen.getByText(destination.city)).toBeInTheDocument();
      });
    });

    it('should show the first destination by default', () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      const firstDestination = mockItinerary.destinations[0];
      expect(screen.getByText(firstDestination.city)).toHaveAttribute('aria-selected', 'true');
    });

    it('should render with custom className', () => {
      const { container } = render(
        <ItineraryDisplay
          initialItinerary={mockItinerary}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Destination Switching', () => {
    it('should switch destinations when tab is clicked', async () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      const secondDestination = mockItinerary.destinations[1];
      const tab = screen.getByRole('tab', { name: secondDestination.city });

      await userEvent.click(tab);

      expect(tab).toHaveAttribute('aria-selected', 'true');
      // Check that activities from the second destination are visible
      expect(screen.getByText(secondDestination.days[0].activities[0].title)).toBeInTheDocument();
    });

    it('should support keyboard navigation between destinations', async () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      const firstTab = screen.getByRole('tab', { name: mockItinerary.destinations[0].city });
      firstTab.focus();

      // Press arrow right to move to next tab
      fireEvent.keyDown(firstTab, { key: 'ArrowRight', code: 'ArrowRight' });

      const secondTab = screen.getByRole('tab', { name: mockItinerary.destinations[1].city });
      expect(secondTab).toHaveFocus();
    });
  });

  describe('Activity Interactions', () => {
    it('should expand activity details when clicked', async () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      const activity = mockItinerary.destinations[0].days[0].activities[0];
      const activityCard = screen.getByText(activity.title);

      await userEvent.click(activityCard);

      // Check that expanded content is visible
      expect(screen.getByText(activity.description)).toBeInTheDocument();
    });

    it('should collapse activity when clicked again', async () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      const activity = mockItinerary.destinations[0].days[0].activities[0];
      const activityCard = screen.getByText(activity.title);

      // Expand
      await userEvent.click(activityCard);
      expect(screen.getByText(activity.description)).toBeInTheDocument();

      // Collapse
      await userEvent.click(activityCard);
      expect(screen.queryByText(activity.description)).not.toBeInTheDocument();
    });

    it('should handle multiple expanded activities', async () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      const activities = mockItinerary.destinations[0].days[0].activities;
      const firstActivity = screen.getByText(activities[0].title);
      const secondActivity = screen.getByText(activities[1].title);

      // Expand both
      await userEvent.click(firstActivity);
      await userEvent.click(secondActivity);

      // Both should be expanded
      expect(screen.getByText(activities[0].description)).toBeInTheDocument();
      expect(screen.getByText(activities[1].description)).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should render export menu button', () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('should open export menu when clicked', async () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      // Check that export options are visible
      expect(screen.getByText('Copy as Text')).toBeInTheDocument();
      expect(screen.getByText('Copy as Markdown')).toBeInTheDocument();
      expect(screen.getByText('Add to Calendar')).toBeInTheDocument();
      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
    });
  });

  describe('Feedback Handling', () => {
    it('should call onRequestChanges when feedback is submitted', async () => {
      const mockOnRequestChanges = jest.fn();
      render(
        <ItineraryDisplay
          initialItinerary={mockItinerary}
          onRequestChanges={mockOnRequestChanges}
        />
      );

      // Simulate feedback submission
      const feedbackInput = screen.getByPlaceholderText(/suggest changes/i);
      await userEvent.type(feedbackInput, 'Add more museums');

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);

      expect(mockOnRequestChanges).toHaveBeenCalledWith('Add more museums');
    });

    it('should disable feedback form when loading', () => {
      render(
        <ItineraryDisplay
          initialItinerary={mockItinerary}
          isLoading={true}
        />
      );

      const feedbackInput = screen.getByPlaceholderText(/suggest changes/i);
      expect(feedbackInput).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export itinerary options/i })).toBeInTheDocument();
    });

    it('should announce destination changes to screen readers', async () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      const secondTab = screen.getByRole('tab', { name: mockItinerary.destinations[1].city });
      await userEvent.click(secondTab);

      // Check for live region update
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(`Now viewing ${mockItinerary.destinations[1].city}`);
    });

    it('should trap focus within export menu when open', async () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBeGreaterThan(0);

      // Tab should cycle within menu
      menuItems[0].focus();
      fireEvent.keyDown(menuItems[0], { key: 'Tab' });
      expect(menuItems[1]).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should display error message for invalid itinerary data', () => {
      const invalidItinerary = { ...mockItinerary, destinations: [] };

      render(<ItineraryDisplay initialItinerary={invalidItinerary as any} />);

      expect(screen.getByText(/no destinations available/i)).toBeInTheDocument();
    });

    it('should handle missing activity data gracefully', () => {
      const itineraryWithMissingData = {
        ...mockItinerary,
        destinations: [{
          ...mockItinerary.destinations[0],
          days: [{
            ...mockItinerary.destinations[0].days[0],
            activities: []
          }]
        }]
      };

      render(<ItineraryDisplay initialItinerary={itineraryWithMissingData as any} />);

      expect(screen.getByText(/no activities planned/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should memoize expensive computations', () => {
      const { rerender } = render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      const renderSpy = jest.spyOn(React, 'createElement');

      // Rerender with same props
      rerender(<ItineraryDisplay initialItinerary={mockItinerary} />);

      // Component should not re-render unnecessarily
      expect(renderSpy).toHaveBeenCalledTimes(0);
    });

    it('should lazy load export formatters', async () => {
      render(<ItineraryDisplay initialItinerary={mockItinerary} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      const pdfOption = screen.getByText('Export as PDF');

      // PDF formatter should only load when needed
      const loadSpy = jest.spyOn(window, 'fetch');
      await userEvent.click(pdfOption);

      await waitFor(() => {
        expect(loadSpy).toHaveBeenCalled();
      });
    });
  });
});