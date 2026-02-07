import { useEffect, useState, useRef } from "react";

interface OverlayProps {
  isLocked: boolean;
}

const SCRAMBLE_CHARS = "abcdefghijklmnopqrstuvwxyz";

const SOCIAL_SITES = [
  "Instagram",
  "TikTok",
  "Twitter",
  "Facebook",
  "YouTube",
  "Reddit",
  "Snapchat",
  "LinkedIn",
];

function useCyclingScrambleText(
  words: string[],
  displayDuration: number = 2000,
  scrambleDuration: number = 400
) {
  const [displayText, setDisplayText] = useState(words[0]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const scheduleNext = () => {
      timeoutRef.current = window.setTimeout(() => {
        const nextIndex = (currentIndex + 1) % words.length;
        const fromWord = words[currentIndex];
        const toWord = words[nextIndex];
        const maxLength = Math.max(fromWord.length, toWord.length);

        startTimeRef.current = performance.now();

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTimeRef.current;
          const progress = Math.min(elapsed / scrambleDuration, 1);

          // Ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3);

          // Number of characters resolved to target
          const resolvedCount = Math.floor(eased * maxLength);

          let result = "";
          for (let i = 0; i < maxLength; i++) {
            if (i < resolvedCount) {
              result += toWord[i] || "";
            } else if (i < toWord.length) {
              result +=
                SCRAMBLE_CHARS[
                  Math.floor(Math.random() * SCRAMBLE_CHARS.length)
                ];
            }
          }

          setDisplayText(result);

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            setCurrentIndex(nextIndex);
          }
        };

        animationRef.current = requestAnimationFrame(animate);
      }, displayDuration);
    };

    scheduleNext();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex, words, displayDuration, scrambleDuration]);

  return displayText;
}

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
  const socialSite = useCyclingScrambleText(SOCIAL_SITES, 2000, 400);

  return (
    <>
      <div className="absolute inset-0 pointer-events-none">
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
              className="flex flex-col items-center text-center text-[1.1em] sm:text-[1.15em] md:text-[1.5em] font-vt323 transition-all duration-1000 leading-[1.3em] sm:leading-[1em] mb-6 sm:mb-8 md:mb-12"
              style={{
                color: isLocked ? "#ccc" : "#555",
              }}
            >
              <p>
                ... is what you would see if
                <br className="sm:hidden" /> you tried to access{" "}
                <span
                  className="inline-block text-left transition-colors duration-1000"
                  style={{
                    minWidth: "4em",
                    color: isLocked ? "white" : "black",
                  }}
                >
                  {socialSite}
                </span>
              </p>
              <p>with the LockedIn extension installed.</p>
            </div>
            {/* Down chevron */}
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8 animate-bounce transition-colors duration-1000"
              style={{ color: isLocked ? "#888" : "#999" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};
