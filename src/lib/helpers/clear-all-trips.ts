// Utility function to clear all trips
export function clearAllTrips() {
  // Clear from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('recentSearches');
    localStorage.removeItem('viewingTrip');
  }
}