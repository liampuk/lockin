import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import './App.css';
import { Overlay } from './Overlay';
import { useSyncLockedIn } from '../hooks/useSyncLockedIn';

const Scene = lazy(() => import('./Scene'));

/** Fades in only after the Canvas has had a chance to paint (avoids pop). */
function FadeInScene({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className="w-full h-full transition-opacity duration-500 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {children}
    </div>
  );
}

function App() {
  const [isLocked, setIsLocked] = useState(false);
  const initialAnimationComplete = useRef(false);

  const currentlyLockedIn = useSyncLockedIn();
  const transitionInitializedRef = useRef(false);

  // Update body background for correct overscroll color on macOS/iOS
  // Use useLayoutEffect to set synchronously before paint to prevent flash
  useLayoutEffect(() => {
    const bgColor = isLocked ? '#333' : '#eee';

    // Initialize transition only once, after first render
    if (!transitionInitializedRef.current) {
      // Set initial color immediately without transition to prevent flash on mount
      document.documentElement.style.backgroundColor = bgColor;
      document.body.style.backgroundColor = bgColor;

      // Set transition on next frame to allow initial paint without transition
      const rafId = requestAnimationFrame(() => {
        document.documentElement.style.transition = 'background-color 1000ms';
        document.body.style.transition = 'background-color 1000ms';
        transitionInitializedRef.current = true;
      });

      return () => cancelAnimationFrame(rafId);
    } else {
      // After transition is initialized, always ensure background is set
      // This prevents white flash during re-renders after animation completes
      document.documentElement.style.backgroundColor = bgColor;
      document.body.style.backgroundColor = bgColor;
    }
  }, [isLocked]);

  useEffect(() => {
    console.log('@@ currentlyLockedIn', currentlyLockedIn);
    if (currentlyLockedIn !== isLocked && initialAnimationComplete.current) {
      setIsLocked(currentlyLockedIn);
    }
  }, [currentlyLockedIn]);

  return (
    <div
      className="w-full min-h-screen transition-colors duration-1000"
      style={{ backgroundColor: isLocked ? '#333' : '#eee' }}
    >
      {/* Hero section with 3D scene (lazy-loaded to keep initial bundle small) */}
      <div className="relative w-full h-screen">
        <Suspense fallback={<div className="w-full h-full min-h-[400px]" />}>
          <FadeInScene>
            <Scene
              isLocked={isLocked}
              setIsLocked={setIsLocked}
              initialAnimationComplete={initialAnimationComplete}
            />
          </FadeInScene>
        </Suspense>
        <Overlay isLocked={isLocked} />
      </div>
    </div>
  );
}

export default App;
