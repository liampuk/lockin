import { useInView } from "./useInView";

export type FlyFrom = "left" | "right" | "bottom";

export function FlyInCard({
  children,
  flyFrom = "bottom",
  delay = 0,
}: {
  children: React.ReactNode;
  flyFrom?: FlyFrom;
  delay?: number;
}) {
  const { ref, isInView } = useInView();
  const x = flyFrom === "left" ? -50 : flyFrom === "right" ? 50 : 0;
  const y = flyFrom === "bottom" ? 50 : -50;
  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translate(0)" : `translate(${x}px, ${y}px)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
