import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DestinationSwitcher } from '../DestinationSwitcher';
import type { Destination } from '@/services/ai/types/core.types';
import { createMockDestination } from '../../__tests__/test-utils';

describe('DestinationSwitcher Component', () => {
  let mockDestinations: Destination[];
  const mockOnDestinationChange = jest.fn();

  beforeEach(() => {
    mockDestinations = [
      createMockDestination({ city: 'Paris', country: 'France', days_count: 3 }),
      createMockDestination({ city: 'Rome', country: 'Italy', days_count: 2 }),
      createMockDestination({ city: 'Barcelona', country: 'Spain', days_count: 2 })
    ];
    mockOnDestinationChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render all destinations as tabs', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      mockDestinations.forEach(dest => {
        expect(screen.getByRole('tab', { name: dest.city })).toBeInTheDocument();
      });
    });

    it('should display day count for each destination', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      expect(screen.getByText('3 days')).toBeInTheDocument();
      expect(screen.getAllByText('2 days')).toHaveLength(2);
    });

    it('should mark active destination', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={1}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const romeTab = screen.getByRole('tab', { name: 'Rome' });
      expect(romeTab).toHaveAttribute('aria-selected', 'true');
      expect(romeTab).toHaveClass('border-b-2', 'border-blue-500');
    });

    it('should show destination order numbers', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
          className="custom-switcher"
        />
      );

      expect(container.firstChild).toHaveClass('custom-switcher');
    });
  });

  describe('Tab Interaction', () => {
    it('should call onDestinationChange when tab clicked', async () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const romeTab = screen.getByRole('tab', { name: 'Rome' });
      await userEvent.click(romeTab);

      expect(mockOnDestinationChange).toHaveBeenCalledWith(1);
    });

    it('should not call onChange when clicking active tab', async () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const parisTab = screen.getByRole('tab', { name: 'Paris' });
      await userEvent.click(parisTab);

      expect(mockOnDestinationChange).not.toHaveBeenCalled();
    });

    it('should update visual state on hover', async () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const romeTab = screen.getByRole('tab', { name: 'Rome' });
      await userEvent.hover(romeTab);

      expect(romeTab).toHaveClass('hover:bg-slate-700');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate with arrow keys', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const parisTab = screen.getByRole('tab', { name: 'Paris' });
      parisTab.focus();

      // Press right arrow
      fireEvent.keyDown(parisTab, { key: 'ArrowRight', code: 'ArrowRight' });
      expect(mockOnDestinationChange).toHaveBeenCalledWith(1);

      // Reset and test left arrow
      mockOnDestinationChange.mockClear();
      fireEvent.keyDown(parisTab, { key: 'ArrowLeft', code: 'ArrowLeft' });
      // Should wrap to last destination
      expect(mockOnDestinationChange).toHaveBeenCalledWith(2);
    });

    it('should wrap around at boundaries', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={2} // Last destination
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const barcelonaTab = screen.getByRole('tab', { name: 'Barcelona' });
      barcelonaTab.focus();

      // Press right arrow - should wrap to first
      fireEvent.keyDown(barcelonaTab, { key: 'ArrowRight', code: 'ArrowRight' });
      expect(mockOnDestinationChange).toHaveBeenCalledWith(0);
    });

    it('should activate tab with Enter key', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const romeTab = screen.getByRole('tab', { name: 'Rome' });
      romeTab.focus();

      fireEvent.keyDown(romeTab, { key: 'Enter', code: 'Enter' });
      expect(mockOnDestinationChange).toHaveBeenCalledWith(1);
    });

    it('should activate tab with Space key', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const barcelonaTab = screen.getByRole('tab', { name: 'Barcelona' });
      barcelonaTab.focus();

      fireEvent.keyDown(barcelonaTab, { key: ' ', code: 'Space' });
      expect(mockOnDestinationChange).toHaveBeenCalledWith(2);
    });

    it('should jump to first tab with Home key', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={2}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const barcelonaTab = screen.getByRole('tab', { name: 'Barcelona' });
      barcelonaTab.focus();

      fireEvent.keyDown(barcelonaTab, { key: 'Home', code: 'Home' });
      expect(mockOnDestinationChange).toHaveBeenCalledWith(0);
    });

    it('should jump to last tab with End key', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const parisTab = screen.getByRole('tab', { name: 'Paris' });
      parisTab.focus();

      fireEvent.keyDown(parisTab, { key: 'End', code: 'End' });
      expect(mockOnDestinationChange).toHaveBeenCalledWith(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Destination navigation');

      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab, index) => {
        expect(tab).toHaveAttribute('aria-selected', index === 0 ? 'true' : 'false');
        expect(tab).toHaveAttribute('tabIndex', index === 0 ? '0' : '-1');
      });
    });

    it('should update aria-selected when active changes', () => {
      const { rerender } = render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      let parisTab = screen.getByRole('tab', { name: 'Paris' });
      let romeTab = screen.getByRole('tab', { name: 'Rome' });

      expect(parisTab).toHaveAttribute('aria-selected', 'true');
      expect(romeTab).toHaveAttribute('aria-selected', 'false');

      rerender(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={1}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      expect(parisTab).toHaveAttribute('aria-selected', 'false');
      expect(romeTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should have descriptive labels for screen readers', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const parisTab = screen.getByRole('tab', { name: 'Paris' });
      expect(parisTab).toHaveAttribute('aria-label', 'Destination 1: Paris, 3 days');
    });

    it('should announce destination changes', async () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const romeTab = screen.getByRole('tab', { name: 'Rome' });
      await userEvent.click(romeTab);

      // Check for live region update
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent('Now viewing Rome, Italy');
    });
  });

  describe('Responsive Design', () => {
    it('should scroll horizontally on mobile', () => {
      // Mock window width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveClass('overflow-x-auto');
    });

    it('should show scroll indicators when overflow', () => {
      // Create many destinations to force overflow
      const manyDestinations = Array.from({ length: 10 }, (_, i) =>
        createMockDestination({ city: `City ${i + 1}` })
      );

      render(
        <DestinationSwitcher
          destinations={manyDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const container = screen.getByRole('tablist').parentElement;
      expect(container).toHaveClass('relative');
      // Scroll indicators would be visible
    });
  });

  describe('Edge Cases', () => {
    it('should handle single destination', () => {
      render(
        <DestinationSwitcher
          destinations={[mockDestinations[0]]}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const tab = screen.getByRole('tab');
      expect(tab).toBeInTheDocument();
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });

    it('should handle empty destinations array', () => {
      render(
        <DestinationSwitcher
          destinations={[]}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      expect(screen.getByText(/no destinations available/i)).toBeInTheDocument();
    });

    it('should handle invalid activeDestination index', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={10} // Out of bounds
          onDestinationChange={mockOnDestinationChange}
        />
      );

      // Should default to first destination
      const parisTab = screen.getByRole('tab', { name: 'Paris' });
      expect(parisTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should handle destinations with long names', () => {
      const longNameDestination = createMockDestination({
        city: 'São Paulo de Olivença',
        country: 'Brazil'
      });

      render(
        <DestinationSwitcher
          destinations={[longNameDestination, ...mockDestinations]}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const longTab = screen.getByRole('tab', { name: 'São Paulo de Olivença' });
      expect(longTab).toHaveClass('truncate'); // Should truncate long names
    });
  });

  describe('Visual Indicators', () => {
    it('should show flight icon between destinations', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const flightIcons = screen.getAllByTestId('flight-icon');
      expect(flightIcons).toHaveLength(mockDestinations.length - 1); // One less than destinations
    });

    it('should highlight active tab with different styling', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={1}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const activeTab = screen.getByRole('tab', { name: 'Rome' });
      const inactiveTabs = [
        screen.getByRole('tab', { name: 'Paris' }),
        screen.getByRole('tab', { name: 'Barcelona' })
      ];

      expect(activeTab).toHaveClass('bg-slate-700', 'text-white');
      inactiveTabs.forEach(tab => {
        expect(tab).not.toHaveClass('bg-slate-700');
      });
    });

    it('should show transition effects', () => {
      render(
        <DestinationSwitcher
          destinations={mockDestinations}
          activeDestination={0}
          onDestinationChange={mockOnDestinationChange}
        />
      );

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveClass('transition-all', 'duration-200');
      });
    });
  });
});