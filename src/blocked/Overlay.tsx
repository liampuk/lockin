import { useEffect, useState, useRef } from "react";

interface OverlayProps {
  isLocked: boolean;
}

const SCRAMBLE_CHARS = "abcdefghijklmnopqrstuvwxyz";

function useScrambleWord(
  show: boolean,
  word: string,
  duration: number = 600,
  hideDelay: number = 0
) {
  const [displayText, setDisplayText] = useState(show ? word : "");
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const prevShowRef = useRef(show);

  useEffect(() => {
    // Skip animation if show hasn't actually changed
    if (prevShowRef.current === show) {
      return;
    }
    prevShowRef.current = show;

    const startAnimation = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      startTimeRef.current = performance.now();
      const wordLength = word.replace(/ /g, "").length; // Count non-space chars

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);

        if (show) {
          // Revealing: scramble then resolve left to right
          const resolvedCount = Math.floor(eased * word.length);
          let result = "";
          for (let i = 0; i < word.length; i++) {
            if (i < resolvedCount) {
              result += word[i];
            } else if (word[i] === " ") {
              result += " ";
            } else {
              result +=
                SCRAMBLE_CHARS[
                  Math.floor(Math.random() * SCRAMBLE_CHARS.length)
                ];
            }
          }
          setDisplayText(result);
        } else {
          // Hiding: scramble then disappear right to left
          const remainingCount = Math.floor((1 - eased) * word.length);
          let result = "";
          for (let i = 0; i < remainingCount; i++) {
            if (word[i] === " ") {
              result += " ";
            } else if (i < remainingCount - Math.floor(eased * wordLength)) {
              result += word[i];
            } else {
              result +=
                SCRAMBLE_CHARS[
                  Math.floor(Math.random() * SCRAMBLE_CHARS.length)
                ];
            }
          }
          setDisplayText(result);
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Add delay when hiding, start instantly when showing
    if (!show && hideDelay > 0) {
      timeoutRef.current = window.setTimeout(startAnimation, hideDelay);
    } else {
      startAnimation();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, word, duration, hideDelay]);

  return displayText;
}

export const Overlay = ({ isLocked }: OverlayProps) => {
  const notWord = useScrambleWord(!isLocked, "not ", 600, 0);

  return (
    <>
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="py-8 sm:py-8 md:py-12 px-4 sm:px-6 md:px-8 flex flex-col items-center justify-between h-full">
          <div className="flex flex-col items-center text-center">
            <h1
              className="text-[3em] sm:text-[3.5em] md:text-[5em] font-vt323 transition-colors duration-1000"
              style={{ color: isLocked ? "#eee" : "#333" }}
            >
              You are {notWord}locked in
            </h1>
            <h2
              className="mt-[-10px] sm:mt-[-12px] md:mt-[-16px] text-[1.4em] sm:text-[1.5em] md:text-[2em] font-vt323 transition-all duration-1000"
              style={{
                color: isLocked ? "#ccc" : "#555",
                opacity: isLocked ? 1 : 0,
              }}
            >
              This site has been blocked
            </h2>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="flex flex-col items-center text-center text-[2em] sm:text-[1.15em] md:text-[1.5em] font-vt323 transition-all duration-1000 leading-[1.3em] sm:leading-[1em] mb-6 sm:mb-8 md:mb-12"
              style={{
                color: isLocked ? "#ccc" : "#555",
              }}
            >
              <p className="">liamp.uk</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
