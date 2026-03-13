import React, { useEffect, useRef } from 'react';

interface RevealParticlesProps {
  nodeId: string;
  x: number;
  y: number;
  outcome: 'success' | 'fail';
  onComplete: () => void;
}

const PARTICLE_COUNT = 24;
const DURATION = 1200; // ms

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

const WIN_COLORS = ['#f59e0b', '#fbbf24', '#10b981', '#34d399', '#fcd34d', '#ffffff'];
const LOSE_COLORS = ['#ef4444', '#f87171', '#991b1b', '#7f1d1d', '#fca5a5'];

const RevealParticles: React.FC<RevealParticlesProps> = ({ x, y, outcome, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = outcome === 'success' ? WIN_COLORS : LOSE_COLORS;

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = outcome === 'success'
        ? 2 + Math.random() * 5
        : 1 + Math.random() * 3;

      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (outcome === 'success' ? 2 : 0),
        size: outcome === 'success' ? 3 + Math.random() * 5 : 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.015 + Math.random() * 0.01,
      };
    });

    let animFrame: number;
    const start = Date.now();

    const animate = () => {
      const elapsed = Date.now() - start;
      if (elapsed > DURATION) {
        onComplete();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (outcome === 'success') {
          // Rounded squares for confetti look
          ctx.beginPath();
          const half = p.size / 2;
          ctx.roundRect(p.x - half, p.y - half, p.size, p.size, 1);
          ctx.fill();
        } else {
          // Circles for lose
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animFrame);
  }, [x, y, outcome, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default RevealParticles;
