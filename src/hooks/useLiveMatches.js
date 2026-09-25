import { useEffect, useState } from 'react';
import { firestore, firebaseConfigured } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

/**
 * useLiveMatches — subscribes to Firestore liveMatches collection in real-time.
 * Falls back to polling /api/public every 15 seconds if Firebase is not configured.
 * @param {Array} initialMatches - initial matches from SSR/fetch
 */
export function useLiveMatches(initialMatches = []) {
  const [liveMatches, setLiveMatches] = useState(initialMatches);

  useEffect(() => {
    // Update whenever initialMatches change from parent (e.g., initial API load)
    setLiveMatches(initialMatches);
  }, [initialMatches]);

  useEffect(() => {
    if (firebaseConfigured && firestore) {
      // Real-time Firestore subscription — zero polling, instant updates
      const q = query(collection(firestore, 'liveMatches'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const matches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (matches.length > 0) {
          setLiveMatches(matches);
        }
      }, (err) => {
        console.warn('Firestore live scores unavailable, using SSE fallback.', err);
      });
      return () => unsubscribe();
    } else {
      // Fallback: poll SSE stream for local/non-Firebase environments
      const sse = new EventSource('/api/stream/live');
      sse.onmessage = (event) => {
        try {
          const matches = JSON.parse(event.data);
          if (Array.isArray(matches)) setLiveMatches(matches);
        } catch (e) {}
      };
      return () => sse.close();
    }
  }, []);

  return liveMatches;
}
