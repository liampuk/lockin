export function MediaCard({
  src,
  alt,
  type,
  baseRotation = 0,
}: {
  src: string;
  alt: string;
  type: "image" | "video";
  baseRotation?: number;
}) {
  return (
    <div
      className="group relative w-[min(280px,85vw)] sm:w-[min(320px,42vw)] md:w-[min(380px,42vw)] lg:w-[min(420px,400px)] xl:w-[min(480px,440px)] aspect-4/3 rounded-xl overflow-hidden bg-gray-700/50 shadow-lg transition-transform duration-300 ease-out hover:scale-105 hover:shadow-xl"
      style={{
        transform: `rotate(${baseRotation}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      {type === "image" ? (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <video
          src={src}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          muted
          loop
          playsInline
          autoPlay
        />
      )}
    </div>
  );
}
