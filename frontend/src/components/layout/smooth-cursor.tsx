"use client";

// Port of the Framer "Smoothcursor" component (spring-follow arrow that rotates with movement direction,
// squishes while moving and on click). Hidden on touch, narrow or portrait screens.
import { motion, useSpring } from "motion/react";
import { useEffect, useRef, useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const canShow = () => {
  const isPortrait = window.innerHeight > window.innerWidth;
  const isNarrow = window.innerWidth < 768;
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  return !(isPortrait || isNarrow || isTouch);
};

function CursorSVG({ invert }: { invert?: boolean }) {
  const inner = invert ? "white" : "black";
  const outer = invert ? "black" : "white";
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 50 54" fill="none">
      <g filter="url(#smooth-cursor-shadow)">
        <path
          d="M42.6817 41.1495L27.5103 6.79925C26.7269 5.02557 24.2082 5.02558 23.3927 6.79925L7.59814 41.1495C6.75833 42.9759 8.52712 44.8902 10.4125 44.1954L24.3757 39.0496C24.8829 38.8627 25.4385 38.8627 25.9422 39.0496L39.8121 44.1954C41.6849 44.8902 43.4884 42.9759 42.6817 41.1495Z"
          fill={inner}
        />
        <path
          d="M43.7146 40.6933L28.5431 6.34306C27.3556 3.65428 23.5772 3.69516 22.3668 6.32755L6.57226 40.6778C5.3134 43.4156 7.97238 46.298 10.803 45.2549L24.7662 40.109C25.0221 40.0147 25.2999 40.0156 25.5494 40.1082L39.4193 45.254C42.2261 46.2953 44.9254 43.4347 43.7146 40.6933Z"
          stroke={outer}
          strokeWidth={2.25825}
        />
      </g>
      <defs>
        <filter id="smooth-cursor-shadow" x={0.602397} y={0.952444} width={49.0584} height={52.428} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy={2.25825} />
          <feGaussianBlur stdDeviation={2.25825} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
      </defs>
    </svg>
  );
}

export function SmoothCursor({
  cursorSize = 40,
  stiffness = 400,
  damping = 45,
  mass = 1,
  hideSystemCursor = true,
  enableBlendMode = false,
  invertIconColors = false,
  enableClickEffect = true,
}: {
  cursorSize?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
  hideSystemCursor?: boolean;
  enableBlendMode?: boolean;
  invertIconColors?: boolean;
  enableClickEffect?: boolean;
}) {
  const visible = useSyncExternalStore(subscribe, canShow, () => false);
  const cursorX = useSpring(-100, { stiffness, damping, mass });
  const cursorY = useSpring(-100, { stiffness, damping, mass });
  const rotation = useSpring(0, { stiffness: 300, damping: 60 });
  const scale = useSpring(1, { stiffness: 500, damping: 35 });
  const lastPos = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastTime = useRef(0);
  const prevAngle = useRef(0);
  const accRotation = useRef(0);
  const raf = useRef<number | null>(null);
  const down = useRef(false);

  useEffect(() => {
    if (!visible) return;
    lastTime.current = Date.now();
    const move = (e: MouseEvent) => {
      const pos = { x: e.clientX, y: e.clientY };
      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt > 0) velocity.current = { x: (pos.x - lastPos.current.x) / dt, y: (pos.y - lastPos.current.y) / dt };
      lastTime.current = now;
      lastPos.current = pos;
      const speed = Math.hypot(velocity.current.x, velocity.current.y);
      cursorX.set(pos.x);
      cursorY.set(pos.y);
      if (speed > 0.1) {
        const angle = Math.atan2(velocity.current.y, velocity.current.x) * (180 / Math.PI) + 90;
        let diff = angle - prevAngle.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        accRotation.current += diff;
        rotation.set(accRotation.current);
        prevAngle.current = angle;
        if (!down.current) {
          scale.set(0.95);
          setTimeout(() => {
            if (!down.current) scale.set(1);
          }, 150);
        }
      }
    };
    const onMove = (e: MouseEvent) => {
      if (raf.current) return;
      raf.current = requestAnimationFrame(() => {
        move(e);
        raf.current = null;
      });
    };
    const onDown = () => {
      down.current = true;
      if (enableClickEffect) scale.set(0.7);
    };
    const onUp = () => {
      down.current = false;
      if (enableClickEffect) scale.set(1);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onUp);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [visible, cursorX, cursorY, rotation, scale, enableClickEffect]);

  if (!visible) return null;
  return (
    <>
      {hideSystemCursor && <style>{`* { cursor: none !important; }`}</style>}
      <motion.div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          x: cursorX,
          y: cursorY,
          rotate: rotation,
          scale,
          zIndex: 999999,
          pointerEvents: "none",
          willChange: "transform",
          mixBlendMode: enableBlendMode ? "difference" : "normal",
          width: cursorSize,
          height: cursorSize,
          marginLeft: -cursorSize / 2,
          marginTop: -cursorSize / 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CursorSVG invert={invertIconColors} />
      </motion.div>
    </>
  );
}
