/**
 * Focus management utilities for accessibility
 */

/**
 * Trap focus within a container element
 * @param container The container element to trap focus within
 * @returns Cleanup function to remove event listeners
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) return () => {};

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    // Shift + Tab
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);
  firstFocusable.focus();

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Restore focus to a previously focused element
 * @param element The element to restore focus to
 */
export function restoreFocus(element: HTMLElement | null) {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
}

/**
 * Get all focusable elements within a container
 * @param container The container element
 * @returns Array of focusable elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(elements);
}

/**
 * Move focus to the first focusable element in a container
 * @param container The container element
 */
export function focusFirstElement(container: HTMLElement) {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }
}

/**
 * Announce message to screen readers
 * @param message The message to announce
 * @param priority The priority level ('polite' or 'assertive')
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove the announcement after it's been read
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if an element is visible and not hidden
 * @param element The element to check
 * @returns Boolean indicating if element is visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetParent !== null
  );
}

/**
 * Navigate through a list of elements with arrow keys
 * @param elements Array of elements to navigate
 * @param currentIndex Current focused element index
 * @param direction Navigation direction ('next' or 'previous')
 * @returns New index after navigation
 */
export function navigateElements(
  elements: HTMLElement[],
  currentIndex: number,
  direction: 'next' | 'previous' | 'first' | 'last'
): number {
  let newIndex = currentIndex;

  switch (direction) {
    case 'next':
      newIndex = (currentIndex + 1) % elements.length;
      break;
    case 'previous':
      newIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
      break;
    case 'first':
      newIndex = 0;
      break;
    case 'last':
      newIndex = elements.length - 1;
      break;
  }

  if (elements[newIndex] && isElementVisible(elements[newIndex])) {
    elements[newIndex].focus();
    return newIndex;
  }

  return currentIndex;
}