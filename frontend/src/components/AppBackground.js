import React, { useEffect, useRef } from 'react';

export default function AppBackground() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const starsRef  = useRef([]);
  const lastRef   = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    // Generate stars ONCE
    const COUNT = 80;
    starsRef.current = Array.from({ length: COUNT }, () => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      r:       Math.random() * 1.4 + 0.3,
      speed:   Math.random() * 0.15 + 0.03,
      opacity: Math.random() * 0.5 + 0.1,
      pulse:   Math.random() * Math.PI * 2,
    }));

    // Throttled RAF — only render every ~50ms (20fps) instead of 60fps
    // This prevents the requestAnimationFrame handler taking 130ms+
    const FRAME_MS = 50;

    const draw = (timestamp) => {
      if (timestamp - lastRef.current < FRAME_MS) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      lastRef.current = timestamp;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Deep space background
      ctx.fillStyle = '#050b18';
      ctx.fillRect(0, 0, width, height);

      // Subtle nebula blobs — drawn with flat fills, no gradients
      const blobs = [
        { x: width * 0.2, y: height * 0.3, r: 280, color: 'rgba(99,102,241,0.04)' },
        { x: width * 0.8, y: height * 0.6, r: 320, color: 'rgba(139,92,246,0.03)' },
        { x: width * 0.5, y: height * 0.8, r: 200, color: 'rgba(59,130,246,0.03)' },
      ];
      blobs.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
      });

      // Stars
      starsRef.current.forEach(star => {
        star.y -= star.speed;
        star.pulse += 0.04;
        if (star.y < -2) {
          star.y = height + 2;
          star.x = Math.random() * width;
        }
        const alpha = star.opacity + Math.sin(star.pulse) * 0.15;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,255,${Math.max(0, Math.min(1, alpha))})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const handleResize = () => {
      resize();
      // Regenerate stars on resize
      starsRef.current = starsRef.current.map(s => ({
        ...s,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}