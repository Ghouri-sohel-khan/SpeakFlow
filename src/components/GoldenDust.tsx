import React, { useEffect, useRef } from 'react';

export const GoldenDust: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || 412);
    let height = (canvas.height = canvas.offsetHeight || 844);

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = canvas.offsetWidth || 412;
        height = canvas.height = canvas.offsetHeight || 844;
      }
    };
    window.addEventListener('resize', handleResize);

    // Create particles
    const particleCount = 30;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      opacitySpeed: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.6 + 0.6,
        speedX: (Math.random() - 0.5) * 0.16,
        speedY: -Math.random() * 0.22 - 0.08, // float upwards slowly
        opacity: Math.random() * 0.5 + 0.1,
        opacitySpeed: (Math.random() * 0.005 + 0.002) * (Math.random() > 0.5 ? 1 : -1)
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Opacity oscillation
        p.opacity += p.opacitySpeed;
        if (p.opacity > 0.65 || p.opacity < 0.1) {
          p.opacitySpeed = -p.opacitySpeed;
        }

        // Loop bounds
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10 || p.x > width + 10) {
          p.x = Math.random() * width;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#D4AF37';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2, // Layered behind screen views content but above solid background glows
        opacity: 0.6
      }}
    />
  );
};

export default GoldenDust;
