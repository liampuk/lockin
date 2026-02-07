import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  lazy,
  Suspense,
} from "react";
import "./App.css";
import { Overlay } from "./Overlay";
import { useSyncLockedIn } from "../hooks/useSyncLockedIn";

const Scene = lazy(() => import("@lockedin/scene").then((m) => ({ default: m.Scene })));

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

  useLayoutEffect(() => {
    const bgColor = isLocked ? "#333" : "#eee";

    if (!transitionInitializedRef.current) {
      document.documentElement.style.backgroundColor = bgColor;
      document.body.style.backgroundColor = bgColor;

      const rafId = requestAnimationFrame(() => {
        document.documentElement.style.transition = "background-color 1000ms";
        document.body.style.transition = "background-color 1000ms";
        transitionInitializedRef.current = true;
      });

      return () => cancelAnimationFrame(rafId);
    } else {
      document.documentElement.style.backgroundColor = bgColor;
      document.body.style.backgroundColor = bgColor;
    }
  }, [isLocked]);

  useEffect(() => {
    if (currentlyLockedIn !== isLocked && initialAnimationComplete.current) {
      setIsLocked(currentlyLockedIn);
    }
  }, [currentlyLockedIn]);

  return (
    <div
      className="w-full min-h-screen transition-colors duration-1000"
      style={{ backgroundColor: isLocked ? "#333" : "#eee" }}
    >
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
