import { useEffect, useState } from 'react';

export default function MonsterEyes() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const [intensity, setIntensity] = useState(0.8);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Blinking interval with random intensity
    const blinkInterval = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150); // Blink for 150ms
    }, Math.random() * 5000 + 2000); // Random blink every 2-7 seconds

    // Pulsing intensity for breathing effect
    const pulseInterval = setInterval(() => {
      setIntensity(0.6 + Math.random() * 0.4); // Random intensity 0.6-1.0
    }, 2000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(blinkInterval);
      clearInterval(pulseInterval);
    };
  }, []);

  const calculateEyeballPosition = (eyeX, eyeY) => {
    const dx = mousePos.x - eyeX;
    const dy = mousePos.y - eyeY;
    const angle = Math.atan2(dy, dx);
    const distance = Math.min(15, Math.sqrt(dx * dx + dy * dy) / 8); // Max move 15px
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  const leftEyePos = calculateEyeballPosition(window.innerWidth / 2 - 350, window.innerHeight / 2);
  const rightEyePos = calculateEyeballPosition(window.innerWidth / 2 + 350, window.innerHeight / 2);

  return (
    <>
      {/* Left Eye */}
      <div
        className="absolute flex items-center justify-center animate-subtle-float"
        style={{
          left: 'calc(50% - 400px)',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1,
        }}
      >
        {/* Eye outer shape */}
        <div 
          className="relative w-28 h-20 bg-black rounded-[50%] border-3 border-red-600 overflow-hidden transition-all duration-300"
          style={{
            boxShadow: `0 0 ${40 * intensity}px rgba(255,0,0,${intensity}), 0 0 ${80 * intensity}px rgba(139,0,0,${intensity * 0.6})`,
          }}
        >
          {/* Bloodshot veins effect */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-2 left-4 w-12 h-px bg-red-800 rotate-12" />
            <div className="absolute top-4 left-3 w-10 h-px bg-red-800 -rotate-6" />
            <div className="absolute bottom-3 left-5 w-8 h-px bg-red-800 rotate-3" />
            <div className="absolute top-6 right-4 w-10 h-px bg-red-800 -rotate-12" />
          </div>
          
          {/* Glowing red iris */}
          <div className="absolute inset-0 bg-gradient-radial from-red-900 via-red-700 to-black opacity-90" />
          <div className="absolute inset-0 bg-gradient-radial from-red-600/40 via-transparent to-transparent animate-pulse-slow" />
          
          {/* Vertical pupil slit */}
          <div
            className={`absolute w-2 h-14 bg-black shadow-[0_0_15px_rgba(0,0,0,1)] transition-all duration-100 ${blinking ? 'scale-y-0 opacity-0' : 'scale-y-100 opacity-100'}`}
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) translate(${leftEyePos.x}px, ${leftEyePos.y}px)`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-red-950 via-black to-red-950" />
          </div>
        </div>
      </div>

      {/* Right Eye */}
      <div
        className="absolute flex items-center justify-center animate-subtle-float-delayed"
        style={{
          left: 'calc(50% + 330px)',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1,
        }}
      >
        {/* Eye outer shape */}
        <div 
          className="relative w-28 h-20 bg-black rounded-[50%] border-3 border-red-600 overflow-hidden transition-all duration-300"
          style={{
            boxShadow: `0 0 ${40 * intensity}px rgba(255,0,0,${intensity}), 0 0 ${80 * intensity}px rgba(139,0,0,${intensity * 0.6})`,
          }}
        >
          {/* Bloodshot veins effect */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-2 left-4 w-12 h-px bg-red-800 rotate-12" />
            <div className="absolute top-4 left-3 w-10 h-px bg-red-800 -rotate-6" />
            <div className="absolute bottom-3 left-5 w-8 h-px bg-red-800 rotate-3" />
            <div className="absolute top-6 right-4 w-10 h-px bg-red-800 -rotate-12" />
          </div>
          
          {/* Glowing red iris */}
          <div className="absolute inset-0 bg-gradient-radial from-red-900 via-red-700 to-black opacity-90" />
          <div className="absolute inset-0 bg-gradient-radial from-red-600/40 via-transparent to-transparent animate-pulse-slow" />
          
          {/* Vertical pupil slit */}
          <div
            className={`absolute w-2 h-14 bg-black shadow-[0_0_15px_rgba(0,0,0,1)] transition-all duration-100 ${blinking ? 'scale-y-0 opacity-0' : 'scale-y-100 opacity-100'}`}
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) translate(${rightEyePos.x}px, ${rightEyePos.y}px)`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-red-950 via-black to-red-950" />
          </div>
        </div>
      </div>
    </>
  );
}