import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityCard } from '../Activity-card';
import type { Activity } from '@/services/ai/types/core.types';
import { createMockActivity } from '../../__tests__/test-utils';

describe('ActivityCard Component', () => {
  let mockActivity: Activity;

  beforeEach(() => {
    mockActivity = createMockActivity({
      title: 'Eiffel Tower Visit',
      time: '10:00 AM',
      duration: '2 hours',
      location: 'Champ de Mars, Paris',
      description: 'Iconic iron lattice tower with panoramic city views',
      tips: 'Book tickets in advance to skip the lines',
      cost_estimate: '$30-50 per person'
    });
  });

  describe('Rendering', () => {
    it('should render activity title and time', () => {
      render(<ActivityCard activity={mockActivity} />);

      expect(screen.getByText('Eiffel Tower Visit')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    });

    it('should display duration badge', () => {
      render(<ActivityCard activity={mockActivity} />);

      expect(screen.getByText('2 hours')).toBeInTheDocument();
    });

    it('should show location with map icon', () => {
      render(<ActivityCard activity={mockActivity} />);

      expect(screen.getByText('Champ de Mars, Paris')).toBeInTheDocument();
      expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <ActivityCard activity={mockActivity} className="custom-activity-card" />
      );

      expect(container.firstChild).toHaveClass('custom-activity-card');
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalActivity = createMockActivity({
        title: 'Museum Visit',
        time: '2:00 PM'
      });

      render(<ActivityCard activity={minimalActivity} />);

      expect(screen.getByText('Museum Visit')).toBeInTheDocument();
      expect(screen.queryByText('Duration')).not.toBeInTheDocument();
      expect(screen.queryByText('Cost')).not.toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Functionality', () => {
    it('should be collapsed by default', () => {
      render(<ActivityCard activity={mockActivity} />);

      expect(screen.queryByText(mockActivity.description)).not.toBeInTheDocument();
    });

    it('should expand when clicked', async () => {
      render(<ActivityCard activity={mockActivity} />);

      const card = screen.getByRole('button', { name: /expand activity details/i });
      await userEvent.click(card);

      expect(screen.getByText(mockActivity.description)).toBeInTheDocument();
      expect(screen.getByText(mockActivity.tips!)).toBeInTheDocument();
    });

    it('should collapse when clicked again', async () => {
      render(<ActivityCard activity={mockActivity} />);

      const card = screen.getByRole('button', { name: /expand activity details/i });

      // Expand
      await userEvent.click(card);
      expect(screen.getByText(mockActivity.description)).toBeInTheDocument();

      // Collapse
      await userEvent.click(card);
      expect(screen.queryByText(mockActivity.description)).not.toBeInTheDocument();
    });

    it('should be controlled by isExpanded prop when provided', () => {
      const { rerender } = render(
        <ActivityCard activity={mockActivity} isExpanded={true} />
      );

      expect(screen.getByText(mockActivity.description)).toBeInTheDocument();

      rerender(<ActivityCard activity={mockActivity} isExpanded={false} />);
      expect(screen.queryByText(mockActivity.description)).not.toBeInTheDocument();
    });

    it('should call onToggle when expanded state changes', async () => {
      const mockOnToggle = jest.fn();
      render(
        <ActivityCard
          activity={mockActivity}
          onToggle={mockOnToggle}
        />
      );

      const card = screen.getByRole('button', { name: /expand activity details/i });
      await userEvent.click(card);

      expect(mockOnToggle).toHaveBeenCalledWith(true);
    });
  });

  describe('Activity Details', () => {
    it('should display all activity details when expanded', async () => {
      render(<ActivityCard activity={mockActivity} />);

      const card = screen.getByRole('button', { name: /expand activity details/i });
      await userEvent.click(card);

      // Check all details are visible
      expect(screen.getByText(mockActivity.description)).toBeInTheDocument();
      expect(screen.getByText('Tips')).toBeInTheDocument();
      expect(screen.getByText(mockActivity.tips!)).toBeInTheDocument();
      expect(screen.getByText('Estimated Cost')).toBeInTheDocument();
      expect(screen.getByText('$30-50 per person')).toBeInTheDocument();
    });

    it('should display activity type badge when available', () => {
      const activityWithType = {
        ...mockActivity,
        type: 'Sightseeing' as const
      };

      render(<ActivityCard activity={activityWithType} />);
      expect(screen.getByText('Sightseeing')).toBeInTheDocument();
    });

    it('should show booking information when available', async () => {
      const activityWithBooking = {
        ...mockActivity,
        booking_required: true,
        booking_link: 'https://example.com/book'
      };

      render(<ActivityCard activity={activityWithBooking} isExpanded={true} />);

      expect(screen.getByText(/booking required/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /book now/i })).toHaveAttribute(
        'href',
        'https://example.com/book'
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ActivityCard activity={mockActivity} />);

      const card = screen.getByRole('button', { name: /expand activity details/i });
      expect(card).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update ARIA expanded state', async () => {
      render(<ActivityCard activity={mockActivity} />);

      const card = screen.getByRole('button', { name: /expand activity details/i });

      await userEvent.click(card);
      expect(card).toHaveAttribute('aria-expanded', 'true');

      await userEvent.click(card);
      expect(card).toHaveAttribute('aria-expanded', 'false');
    });

    it('should be keyboard navigable', async () => {
      render(<ActivityCard activity={mockActivity} />);

      const card = screen.getByRole('button', { name: /expand activity details/i });
      card.focus();

      // Expand with Enter key
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
      expect(screen.getByText(mockActivity.description)).toBeInTheDocument();

      // Collapse with Space key
      fireEvent.keyDown(card, { key: ' ', code: 'Space' });
      expect(screen.queryByText(mockActivity.description)).not.toBeInTheDocument();
    });

    it('should have descriptive labels for screen readers', () => {
      render(<ActivityCard activity={mockActivity} />);

      expect(screen.getByLabelText(/activity time/i)).toHaveTextContent('10:00 AM');
      expect(screen.getByLabelText(/activity duration/i)).toHaveTextContent('2 hours');
      expect(screen.getByLabelText(/activity location/i)).toHaveTextContent('Champ de Mars, Paris');
    });
  });

  describe('Visual States', () => {
    it('should show hover state', async () => {
      render(<ActivityCard activity={mockActivity} />);

      const card = screen.getByRole('button', { name: /expand activity details/i });
      await userEvent.hover(card);

      expect(card).toHaveClass('hover:shadow-lg');
    });

    it('should have smooth transitions', () => {
      render(<ActivityCard activity={mockActivity} />);

      const card = screen.getByRole('button', { name: /expand activity details/i });
      expect(card).toHaveClass('transition-all');
    });

    it('should show chevron rotation on expand', async () => {
      render(<ActivityCard activity={mockActivity} />);

      const chevron = screen.getByTestId('expand-chevron');
      expect(chevron).toHaveClass('rotate-0');

      const card = screen.getByRole('button', { name: /expand activity details/i });
      await userEvent.click(card);

      expect(chevron).toHaveClass('rotate-180');
    });
  });

  describe('Time Formatting', () => {
    it('should handle various time formats', () => {
      const testCases = [
        { input: '14:30', expected: '2:30 PM' },
        { input: '09:00', expected: '9:00 AM' },
        { input: '12:00', expected: '12:00 PM' },
        { input: '00:00', expected: '12:00 AM' }
      ];

      testCases.forEach(({ input, expected }) => {
        const activity = createMockActivity({ time: input });
        const { rerender } = render(<ActivityCard activity={activity} />);

        expect(screen.getByText(expected)).toBeInTheDocument();
        rerender(<></>); // Clear for next test
      });
    });
  });

  describe('Cost Display', () => {
    it('should format cost estimates correctly', () => {
      const testCases = [
        { input: '$50', display: '$50' },
        { input: '€30-50', display: '€30-50' },
        { input: 'Free', display: 'Free' },
        { input: '¥1000-2000', display: '¥1000-2000' }
      ];

      testCases.forEach(({ input, display }) => {
        const activity = createMockActivity({ cost_estimate: input });
        render(<ActivityCard activity={activity} isExpanded={true} />);

        expect(screen.getByText(display)).toBeInTheDocument();
      });
    });

    it('should show "Free" badge for free activities', () => {
      const freeActivity = createMockActivity({ cost_estimate: 'Free' });
      render(<ActivityCard activity={freeActivity} />);

      const freeBadge = screen.getByText('Free');
      expect(freeBadge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  describe('Integration with Parent Components', () => {
    it('should work within a list of activities', () => {
      const activities = [
        createMockActivity({ title: 'Morning Activity' }),
        createMockActivity({ title: 'Afternoon Activity' }),
        createMockActivity({ title: 'Evening Activity' })
      ];

      render(
        <div>
          {activities.map((activity, index) => (
            <ActivityCard key={index} activity={activity} />
          ))}
        </div>
      );

      expect(screen.getByText('Morning Activity')).toBeInTheDocument();
      expect(screen.getByText('Afternoon Activity')).toBeInTheDocument();
      expect(screen.getByText('Evening Activity')).toBeInTheDocument();
    });
  });
});