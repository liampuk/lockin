import { useState, useEffect } from "react";
import "./App.css";
import { Overlay } from "./Overlay";
import Scene from "./Scene";

function App() {
  const [isLocked, setIsLocked] = useState(false);

  // Update body background for correct overscroll color on macOS/iOS
  useEffect(() => {
    const bgColor = isLocked ? "#333" : "#eee";
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;
    document.body.style.transition = "background-color 1000ms";
  }, [isLocked]);

  return (
    <div
      className="w-full min-h-screen transition-colors duration-1000"
      style={{ backgroundColor: isLocked ? "#333" : "#eee" }}
    >
      {/* Hero section with 3D scene */}
      <div className="relative w-full h-screen">
        <Scene isLocked={isLocked} setIsLocked={setIsLocked} />
        <Overlay isLocked={isLocked} />
      </div>
    </div>
  );
}

export default App;
