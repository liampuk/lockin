import {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  Suspense,
  lazy,
} from "react";
import { Overlay } from "./Overlay";

const SceneLazy = lazy(() =>
  import("@lockedin/scene").then((m) => ({ default: m.Scene }))
);

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

  useLayoutEffect(() => {
    const bgColor = isLocked ? "#333" : "#eee";
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;
  }, [isLocked]);

  return (
    <div
      className="w-full min-h-screen transition-colors duration-1000"
      style={{ backgroundColor: isLocked ? "#333" : "#eee" }}
    >
      <div className="relative w-full h-screen">
        <Suspense fallback={<div className="w-full h-full min-h-[400px]" />}>
          <FadeInScene>
            <SceneLazy
              isLocked={isLocked}
              setIsLocked={setIsLocked}
              initialAnimationComplete={initialAnimationComplete}
              allowControl
            />
          </FadeInScene>
        </Suspense>
        <Overlay isLocked={isLocked} />
      </div>
      <div
        className="w-full h-screen px-4 sm:px-6 md:px-8 py-16 sm:py-24 transition-colors duration-1000"
        style={{ color: isLocked ? "#ccc" : "#333" }}
      >
        {/* Add your content here */}
      </div>
    </div>
  );
}

export default App;
