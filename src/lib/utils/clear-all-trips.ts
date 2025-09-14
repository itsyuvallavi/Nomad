// Utility to clear all trips from Firestore and localStorage
// Run this in the browser console or as a component

import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/services/firebase/auth';
import { getAuth } from 'firebase/auth';

export async function clearAllTrips() {
  try {
    // Clear localStorage
    localStorage.removeItem('recentSearches');
    localStorage.removeItem('savedTrips');
    // Clear any sync flags
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('trips_synced_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('✅ Cleared localStorage');

    // Clear Firestore trips for current user
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      const tripsRef = collection(db, 'trips');
      const querySnapshot = await getDocs(tripsRef);
      
      let deletedCount = 0;
      const deletePromises: Promise<void>[] = [];
      
      querySnapshot.forEach((docSnapshot) => {
        const tripData = docSnapshot.data();
        // Only delete trips for current user
        if (tripData.userId === user.uid) {
          deletePromises.push(deleteDoc(doc(db, 'trips', docSnapshot.id)));
          deletedCount++;
        }
      });
      
      await Promise.all(deletePromises);
      console.log(`✅ Deleted ${deletedCount} trips from Firestore`);
    } else {
      console.log('⚠️ No user logged in - only cleared localStorage');
    }
    
    // Force page refresh to update UI
    window.location.reload();
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing trips:', error);
    return false;
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).clearAllTrips = clearAllTrips;
}