/**
 * 8-frame Pinto spinner with cross-fade blending. Ported from
 * `/Users/Development/interface/src/components/LoadingSpinner.tsx` — same
 * frames, same cadence, so the dashboard's loading look matches the main app.
 */
import { useEffect, useState } from "react";

const svgs = Object.values(
  import.meta.glob<{ default: string }>("@/assets/spinner/Spinner-*.svg", { eager: true }),
).map((m) => m.default);

interface Props {
  size?: number;
  duration?: number;
  repeat?: boolean;
  className?: string;
  onComplete?: () => void;
}

export function LoadingSpinner({
  size = 40,
  duration = 100,
  repeat = true,
  className = "",
  onComplete,
}: Props) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [nextFrame, setNextFrame] = useState(1);
  const [blendAmount, setBlendAmount] = useState(0);

  const frames = Array.from({ length: 8 }, (_, i) => ({ src: svgs[i], duration }));

  useEffect(() => {
    const iv = setInterval(() => {
      setBlendAmount((prev) => {
        const next = prev + 0.1;
        if (next >= 1) {
          setCurrentFrame(nextFrame);
          setNextFrame(nextFrame < frames.length - 1 ? nextFrame + 1 : 0);
          if (!repeat && nextFrame === 0) onComplete?.();
          return 0;
        }
        return next;
      });
    }, duration / 10);
    return () => clearInterval(iv);
  }, [nextFrame, frames.length, duration, repeat, onComplete]);

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <div className="hidden">
        {frames.map((f, i) => (
          <img key={`pre-${i}`} src={f.src} alt="" />
        ))}
      </div>
      <div className="relative h-full w-full">
        <img
          src={frames[currentFrame].src}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          style={{ opacity: 1 - blendAmount }}
        />
        <img
          src={frames[nextFrame].src}
          alt=""
          className="absolute inset-0 h-full w-full object-contain mix-blend-multiply"
          style={{ opacity: blendAmount }}
        />
      </div>
    </div>
  );
}

export function CenteredSpinner({
  size = 48,
  label,
  minHeight = 260,
}: {
  size?: number;
  label?: string;
  minHeight?: number | string;
}) {
  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-3 py-8"
      style={{ minHeight }}
    >
      <LoadingSpinner size={size} />
      {label && <span className="pinto-sm-light text-pinto-gray-4">{label}</span>}
    </div>
  );
}
