import { useEffect, useState } from "react";

export function useScrollOutOfView(thresholdRatio: number = 0.7) {
  const [isOutOfView, setIsOutOfView] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const threshold = window.innerHeight * thresholdRatio;
      setIsOutOfView(currentScrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // initialize
    return () => window.removeEventListener("scroll", handleScroll);
  }, [thresholdRatio]);

  return isOutOfView;
}
