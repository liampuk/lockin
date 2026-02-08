import { useState, useRef, useLayoutEffect, Suspense, lazy } from "react";
import { Overlay } from "./Overlay";
import { FlyInCard } from "./FlyInCard";
import { MediaCard } from "./MediaCard";
import { FadeInScene } from "./FadeInScene";

const BASE_URL = import.meta.env.BASE_URL;

const SceneLazy = lazy(() =>
  import("@lockedin/scene").then((m) => ({ default: m.Scene }))
);

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
        className="w-full min-h-screen px-4 sm:px-6 md:px-8 py-16 sm:py-24 transition-colors duration-1000 border-t border-gray-600 flex flex-col items-center justify-center gap-8 sm:gap-12"
        style={{ color: isLocked ? "#ccc" : "#333" }}
      >
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
          <FlyInCard flyFrom="left" delay={0}>
            <MediaCard
              src={`${BASE_URL}output1.jpg`}
              alt="Output 1"
              type="image"
              baseRotation={3}
            />
          </FlyInCard>
          <FlyInCard flyFrom="right" delay={100}>
            <MediaCard
              src={`${BASE_URL}output2.jpg`}
              alt="Output 2"
              type="image"
              baseRotation={-3}
            />
          </FlyInCard>
        </div>
        <p className="text-2xl sm:text-3xl font-vt323 text-center">
          Site coming soon
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
          <FlyInCard flyFrom="left" delay={200}>
            <MediaCard
              src={`${BASE_URL}output3.jpg`}
              alt="Output 3"
              type="image"
              baseRotation={4}
            />
          </FlyInCard>
          <FlyInCard flyFrom="right" delay={300}>
            <MediaCard
              src={`${BASE_URL}output.mp4`}
              alt="Output video"
              type="video"
              baseRotation={-1}
            />
          </FlyInCard>
        </div>
      </div>
    </div>
  );
}

export default App;
