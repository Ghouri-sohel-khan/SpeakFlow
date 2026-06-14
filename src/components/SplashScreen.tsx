import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinished: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Show splash screen for 3 seconds, then start fading
    const timerFade = setTimeout(() => {
      setFade(true);
    }, 2800);

    // Completely unload splash screen after fade animation (0.5s)
    const timerFinished = setTimeout(() => {
      onFinished();
    }, 3300);

    return () => {
      clearTimeout(timerFade);
      clearTimeout(timerFinished);
    };
  }, [onFinished]);

  // Mock text scrolling upward in the background
  const scrollerLines = [
    'I went to a market yesterday.',
    'I visited a market yesterday.',
    'Yesterday I spent time at a local market.',
    'I went shopping at a nearby market.',
    'Speaking English everyday makes me feel more confident.',
    'My favorite hobby is reading books, which helps me learn.',
    'We went to a beautiful park yesterday and talked for hours.',
    'Exercising regularly can double your energy levels.',
    'Captivating an audience requires structured content.',
    'Effective leadership hinges on the capacity to cultivate safety.'
  ];

  return (
    <div className={`splash-container ${fade ? 'fade-out-anim' : ''}`} style={{
      transition: 'opacity 0.5s ease',
      opacity: fade ? 0 : 1
    }}>
      {/* Background scrolling text */}
      <div className="splash-prompter-scroller">
        {/* Double the lines to create a seamless infinite loop */}
        {[...scrollerLines, ...scrollerLines, ...scrollerLines].map((line, idx) => (
          <div key={idx} className="splash-prompter-line">
            {line}
          </div>
        ))}
      </div>

      {/* Main Logo Card */}
      <div className="splash-logo-wrapper">
        <div className="splash-glow-ring"></div>
        <div className="soundwave-line"></div>
        <div className="soundwave-line"></div>
        <div className="soundwave-line"></div>
        <div className="splash-logo-s">S</div>
      </div>

      <div className="splash-text-scroller">
        <h1 className="splash-title">SpeakFlow</h1>
        <div className="splash-tagline">
          <span>READ.</span>
          <span>SPEAK.</span>
          <span>IMPROVE.</span>
          <span>REPEAT.</span>
        </div>
      </div>
    </div>
  );
};

// Add standard styles dynamically if not loaded in keyframes
const styleTag = document.createElement('style');
styleTag.innerHTML = `
  @keyframes fade-out-anim {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(styleTag);

export default SplashScreen;
