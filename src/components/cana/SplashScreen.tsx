import { useEffect, useState } from "react";
import { Logo } from "@/components/layout/Logo";

interface SplashScreenProps {
  /** Called once the splash has fully faded out and should be unmounted. */
  onDone: () => void;
  /** How long the logo stays fully visible before fading, in ms. */
  hold?: number;
}

/**
 * Full-screen intro shown before the landing page.
 * White background, full company logo centered. No motion yet — this is the
 * static version so we can confirm the effect before adding the sunrise animation.
 */
export function SplashScreen({ onDone, hold = 3000 }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Respect reduced-motion: skip the splash entirely.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone();
      return;
    }

    const fadeTimer = window.setTimeout(() => setFading(true), hold);
    const doneTimer = window.setTimeout(onDone, hold + 600); // +600ms fade-out
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [hold, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity [transition-duration:600ms] ease-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <Logo size="lg" variant="dark" className="scale-90 sm:scale-110 lg:scale-125" />
    </div>
  );
}
