import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, ChevronLeft, Volume2, Mic, Home } from 'lucide-react';
import type { Mission } from '../data/missions';
import { dbService } from '../services/db';

interface TeleprompterScreenProps {
  mission: Mission;
  onBack: () => void;
  onGoHome: () => void;
  onFinish: (stats: {
    duration: number;
    wordsRead: number;
    wpm: number;
    stars: number;
    completionRate: number;
    recordingId: string;
  }) => void;
}

class AmbientMusicPlayer {
  private ctx: AudioContext | null = null;
  public isPlaying = false;
  private activeNodes: AudioNode[] = [];
  private intervalId: any = null;
  private masterGainNode: GainNode | null = null;

  constructor() {}

  start(volumePercentage: number = 15) {
    if (this.isPlaying) return;
    this.isPlaying = true;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGainNode = this.ctx.createGain();
      // Peak master gain for soft pad synth is 0.15
      const gainValue = (volumePercentage / 100) * 0.15;
      this.masterGainNode.gain.setValueAtTime(gainValue, this.ctx.currentTime);
      this.masterGainNode.connect(this.ctx.destination);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);
      filter.connect(this.masterGainNode);

      // Relaxing chord progression (Cmaj9, Fmaj9, Asus7, Gsus4)
      const chords = [
        [130.81, 164.81, 196.00, 246.94, 293.66], // C3, E3, G3, B3, D4 (Cmaj9)
        [174.61, 220.00, 261.63, 329.63, 392.00], // F3, A3, C4, E4, G4 (Fmaj9)
        [110.00, 146.83, 196.00, 220.00, 293.66], // A2, D3, G3, A3, D4 (Asus7)
        [146.83, 196.00, 220.00, 293.66, 392.00]  // D3, G3, A3, D4, G4 (Gsus4)
      ];

      let chordIdx = 0;
      
      const playChord = () => {
        if (!this.ctx || this.ctx.state === 'suspended') return;
        const now = this.ctx.currentTime;
        const notes = chords[chordIdx];
        chordIdx = (chordIdx + 1) % chords.length;

        notes.forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();

          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          
          gainNode.gain.setValueAtTime(0, now);
          const delay = idx * 0.15;
          const noteAttack = 2.0;
          const noteHold = 3.0;
          const noteRelease = 3.0;

          gainNode.gain.setValueAtTime(0, now + delay);
          gainNode.gain.linearRampToValueAtTime(0.08, now + delay + noteAttack);
          gainNode.gain.setValueAtTime(0.08, now + delay + noteAttack + noteHold);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + noteAttack + noteHold + noteRelease);

          osc.connect(gainNode);
          gainNode.connect(filter);
          
          osc.start(now + delay);
          osc.stop(now + delay + noteAttack + noteHold + noteRelease);

          this.activeNodes.push(osc);
          this.activeNodes.push(gainNode);
        });
      };

      playChord();
      this.intervalId = setInterval(playChord, 7500);
    } catch (e) {
      console.warn('Web Audio Ambient pad failed to initialize:', e);
    }
  }

  setVolume(volumePercentage: number) {
    if (this.ctx && this.masterGainNode) {
      const gainValue = (volumePercentage / 100) * 0.15;
      this.masterGainNode.gain.linearRampToValueAtTime(gainValue, this.ctx.currentTime + 0.1);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {}
      this.ctx = null;
    }
    this.masterGainNode = null;
    this.activeNodes = [];
  }
}

export const TeleprompterScreen: React.FC<TeleprompterScreenProps> = ({
  mission,
  onBack,
  onGoHome,
  onFinish
}) => {
  const [selectedVariationIdx, setSelectedVariationIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0); // 0.75 (Slow), 1.0 (Normal), 1.3 (Fast)
  const [activeLineIdx, setActiveLineIdx] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [pendingExitType, setPendingExitType] = useState<'back' | 'home' | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(400);

  const [ambientEnabled, setAmbientEnabled] = useState<boolean>(() => localStorage.getItem('speakflow_ambient_music') !== 'false');
  const [ambientVolume, setAmbientVolume] = useState<number>(() => Number(localStorage.getItem('speakflow_ambient_volume') || '15'));
  const ambientMusicPlayerRef = useRef<AmbientMusicPlayer | null>(null);

  const activeText = selectedVariationIdx === 0 ? mission.content : mission.variations[selectedVariationIdx - 1] || mission.content;
  
  // Split text into lines: either by clauses or 4-7 words per line
  const lines = React.useMemo(() => {
    const clauses = activeText.split(/(?<=[.,!?;])\s+/);
    const finalLines: string[] = [];
    clauses.forEach(c => {
      const words = c.split(' ');
      if (words.length > 8) {
        for (let i = 0; i < words.length; i += 6) {
          finalLines.push(words.slice(i, i + 6).join(' '));
        }
      } else {
        finalLines.push(c);
      }
    });
    return finalLines;
  }, [activeText]);

  // WPM scrolling references and handlers
  const totalWords = activeText.split(' ').length;
  const targetWPM = Math.round((totalWords / mission.estimated_duration) * 60);

  // Dynamic layout calculations
  const Y_start = Math.round(containerHeight * 0.75);
  const Y_read = Math.round(containerHeight * 0.62);
  const maxScroll = (lines.length - 1) * 72 + (Y_start - Y_read);
  
  // Canvas / Audio Recording references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Time tracker for recording length
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs for smooth scroller
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const scrollYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Measure container height
  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  // Initialize ambient player
  useEffect(() => {
    ambientMusicPlayerRef.current = new AmbientMusicPlayer();
    return () => {
      if (ambientMusicPlayerRef.current) {
        ambientMusicPlayerRef.current.stop();
      }
    };
  }, []);

  // Sync ambient play/pause and volume changes with state
  useEffect(() => {
    if (isPlaying && ambientEnabled) {
      if (ambientMusicPlayerRef.current) {
        if (!ambientMusicPlayerRef.current.isPlaying) {
          ambientMusicPlayerRef.current.start(ambientVolume);
        } else {
          ambientMusicPlayerRef.current.setVolume(ambientVolume);
        }
      }
    } else {
      ambientMusicPlayerRef.current?.stop();
    }
  }, [isPlaying, ambientEnabled, ambientVolume]);

  // Core teleprompter scrolling loop (animation frame driven)
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000; // seconds elapsed
      lastTimeRef.current = time;

      const activeWPM = targetWPM * speedMultiplier;
      const totalDuration = (totalWords * 60) / activeWPM;
      const speed = maxScroll / Math.max(1, totalDuration); // pixels per second

      scrollYRef.current += speed * delta;

      if (scrollYRef.current >= maxScroll) {
        scrollYRef.current = maxScroll;
        if (viewportRef.current) {
          viewportRef.current.style.transform = `translateY(${Y_start - scrollYRef.current}px)`;
        }
        setIsPlaying(false);
        stopRecordingAndFinish();
      } else {
        if (viewportRef.current) {
          viewportRef.current.style.transform = `translateY(${Y_start - scrollYRef.current}px)`;
        }
        animationFrameRef.current = requestAnimationFrame(loop);
      }

      // Update activeLineIdx for guide intersection
      const currentLine = Math.min(
        lines.length - 1,
        Math.max(0, Math.round((scrollYRef.current - (Y_start - Y_read)) / 72))
      );
      setActiveLineIdx(prev => {
        if (prev !== currentLine) return currentLine;
        return prev;
      });
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, lines, targetWPM, speedMultiplier, totalWords, containerHeight, Y_start, Y_read, maxScroll]);

  // Audio Waveform Visualizer & Microphone Setup
  useEffect(() => {
    if (isRecording) {
      startVisualizer();
    } else {
      stopVisualizer();
    }
    return () => stopVisualizer();
  }, [isRecording]);

  const startVisualizer = async () => {
    try {
      // 1. Get audio stream from user mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Set up HTML5 Audio Recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Calculate scores and trigger callback
        const finalSecs = Math.max(1, recordingSeconds);
        const completionRate = Math.min(100, Math.round(((activeLineIdx + 1) / lines.length) * 100));
        const wordsRead = completionRate === 100 ? totalWords : Math.round(totalWords * (completionRate / 100));
        const wpmAchieved = Math.round((wordsRead / finalSecs) * 60);
        
        // Calculate stars
        let stars = 1;
        if (completionRate > 50) {
          if (completionRate < 100) {
            stars = 2;
          } else {
            // Check speed comparison
            const ratio = wpmAchieved / targetWPM;
            if (ratio >= 0.8 && ratio <= 1.2) stars = 5;
            else if (ratio >= 0.6 && ratio <= 1.4) stars = 4;
            else if (ratio >= 0.4 && ratio <= 1.6) stars = 3;
            else stars = 2;
          }
        }

        // Save recording to IndexedDB
        const recordingId = await dbService.saveRecording({
          missionId: mission.id,
          title: mission.title,
          level: mission.difficulty,
          timestamp: Date.now(),
          audioBlob,
          duration: finalSecs,
          wordsRead,
          wpm: wpmAchieved,
          stars,
          completionRate
        });

        onFinish({
          duration: finalSecs,
          wordsRead,
          wpm: wpmAchieved,
          stars,
          completionRate,
          recordingId
        });
      };

      mediaRecorder.start();

      // 3. Setup Canvas visualizer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        if (!canvasRef.current) return;
        animationFrameIdRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw bars centered
        const barWidth = (canvas.width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
          
          ctx.fillStyle = `rgba(212, 175, 55, ${0.4 + (barHeight / canvas.height)})`;
          ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth - 4, barHeight);
          
          x += barWidth;
        }
      };

      draw();
    } catch (err) {
      console.warn('Microphone permission denied or unsupported. Falling back to mock voice recorder.', err);
      // Fallback visualizer: draw mock sine wave
      startMockVisualizer();
    }
  };

  const startMockVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const drawMock = () => {
      if (!canvasRef.current) return;
      animationFrameIdRef.current = requestAnimationFrame(drawMock);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + Math.sin(x * 0.05 + phase) * 15 * Math.sin(phase * 0.2);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      phase += 0.15;
    };
    drawMock();
  };

  const stopVisualizer = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // Recording timer control
  const startRecording = () => {
    setIsRecording(true);
    setIsPlaying(true);
    setRecordingSeconds(0);

    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingAndFinish = () => {
    setIsPlaying(false);
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Mock finishing if mic isn't active
      mockRecordingSaveAndFinish();
    }
  };

  const mockRecordingSaveAndFinish = async () => {
    // Generate empty mock audio blob
    const mockBlob = new Blob([], { type: 'audio/webm' });
    const finalSecs = Math.max(1, recordingSeconds);
    const completionRate = Math.min(100, Math.round(((activeLineIdx + 1) / lines.length) * 100));
    const wordsRead = completionRate === 100 ? totalWords : Math.round(totalWords * (completionRate / 100));
    const wpmAchieved = Math.round((wordsRead / finalSecs) * 60);
    
    let stars = 1;
    if (completionRate > 50) {
      if (completionRate < 100) stars = 2;
      else {
        const ratio = wpmAchieved / targetWPM;
        if (ratio >= 0.8 && ratio <= 1.2) stars = 5;
        else if (ratio >= 0.6 && ratio <= 1.4) stars = 4;
        else if (ratio >= 0.4 && ratio <= 1.6) stars = 3;
        else stars = 2;
      }
    }

    const recordingId = await dbService.saveRecording({
      missionId: mission.id,
      title: mission.title,
      level: mission.difficulty,
      timestamp: Date.now(),
      audioBlob: mockBlob,
      duration: finalSecs,
      wordsRead,
      wpm: wpmAchieved,
      stars,
      completionRate
    });

    onFinish({
      duration: finalSecs,
      wordsRead,
      wpm: wpmAchieved,
      stars,
      completionRate,
      recordingId
    });
  };

  const togglePlayback = () => {
    if (!isRecording) {
      // Start practice with recording
      startRecording();
    } else {
      // Pause/Resume teleprompter scrolling
      setIsPlaying(prev => !prev);
    }
  };

  // Convert seconds to readable MM:SS format
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Exit flow handlers
  const handleExitAttempt = (type: 'back' | 'home') => {
    if (isRecording || isPlaying) {
      setIsPlaying(false);
      setPendingExitType(type);
    } else {
      if (type === 'back') {
        onBack();
      } else {
        onGoHome();
      }
    }
  };

  // Viewport scroll offset translation
  const translateYOffset = Y_start - scrollYRef.current;

  return (
    <div className="prompter-container" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 50
      }}>
        <button
          onClick={() => handleExitAttempt('back')}
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'color 0.2s ease',
            padding: '4px 8px',
            borderRadius: '8px'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#F8FAFC')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
        >
          <ChevronLeft size={20} /> Back
        </button>
        
        <div style={{ textAlign: 'center', maxWidth: '50%' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Outfit', color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {mission.title}
          </h3>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Mission {mission.id} • {mission.type.toUpperCase()}
          </span>
        </div>

        <button
          onClick={() => handleExitAttempt('home')}
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'color 0.2s ease',
            padding: '4px 8px',
            borderRadius: '8px'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#F8FAFC')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
          title="Go Home"
        >
          <Home size={18} />
        </button>
      </div>

      {/* Variation Selection Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', scrollbarWidth: 'none' }}>
        <button
          onClick={() => {
            if (!isRecording) {
              setSelectedVariationIdx(0);
              setActiveLineIdx(0);
              scrollYRef.current = 0;
              if (viewportRef.current) viewportRef.current.style.transform = `translateY(${Y_start}px)`;
            }
          }}
          disabled={isRecording}
          style={{
            flexShrink: 0,
            padding: '6px 12px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '11px',
            fontWeight: 700,
            background: selectedVariationIdx === 0 ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
            color: '#fff',
            cursor: isRecording ? 'not-allowed' : 'pointer'
          }}
        >
          Original Text
        </button>
        {mission.variations.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (!isRecording) {
                setSelectedVariationIdx(idx + 1);
                setActiveLineIdx(0);
                scrollYRef.current = 0;
                if (viewportRef.current) viewportRef.current.style.transform = `translateY(${Y_start}px)`;
              }
            }}
            disabled={isRecording}
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '11px',
              fontWeight: 700,
              background: selectedVariationIdx === idx + 1 ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              cursor: isRecording ? 'not-allowed' : 'pointer'
            }}
          >
            Variation {idx + 1}
          </button>
        ))}
      </div>

      {/* Prompter Scrolling Viewport */}
      <div className="prompter-text-area" ref={containerRef}>
        {/* Floating Recording Indicator Badge */}
        {isRecording && (
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(239, 68, 68, 0.25)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            padding: '4px 10px',
            borderRadius: '20px',
            fontFamily: 'Outfit',
            fontSize: '11px',
            fontWeight: 700,
            color: '#fca5a5',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'fade-in 0.25s ease-out'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#ef4444',
              display: 'inline-block',
              animation: 'breathe 1.5s infinite'
            }} />
            <span>🎤 RECORDING</span>
            <span style={{ color: '#fff', marginLeft: '4px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '6px' }}>
              {formatTime(recordingSeconds)}
            </span>
          </div>
        )}

        {/* Background Waveform Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            height: '40px',
            width: 'calc(100% - 40px)',
            opacity: 0.15,
            pointerEvents: 'none',
            zIndex: 2,
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
          width="380"
          height="40"
        />

        {/* Shading Top */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100px',
          background: 'linear-gradient(to bottom, #0F172A 0%, rgba(15, 23, 42, 0) 100%)',
          zIndex: 10,
          pointerEvents: 'none'
        }} />

        {/* Reading Guide Line */}
        <div className="prompter-reading-guide" />

        <div ref={viewportRef} className="prompter-scroller-viewport" style={{ transform: `translateY(${translateYOffset}px)` }}>
          {lines.map((line, idx) => {
            const isActive = idx === activeLineIdx;
            const isPassed = idx < activeLineIdx;
            return (
              <div
                key={idx}
                className={`prompter-line ${isActive ? 'active' : isPassed ? 'passed' : ''}`}
                style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {line}
              </div>
            );
          })}
        </div>

        {/* Shading Bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100px',
          background: 'linear-gradient(to top, #111827 0%, rgba(17, 24, 39, 0) 100%)',
          zIndex: 10,
          pointerEvents: 'none'
        }} />
      </div>

      {/* Recording Waveform & Speed HUD */}
      <div style={{ padding: '12px 16px', background: '#0a0d14', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        {/* Compressed Single-Row Ambient & Speed Dashboard */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
          {/* Ambient Music Toggle & Vol Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                const newVal = !ambientEnabled;
                setAmbientEnabled(newVal);
                localStorage.setItem('speakflow_ambient_music', String(newVal));
              }}
              style={{
                background: 'none',
                border: 'none',
                color: ambientEnabled ? '#fff' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                padding: '4px 6px',
                borderRadius: '6px'
              }}
            >
              <Volume2 size={13} style={{ color: ambientEnabled ? 'var(--primary)' : '#64748B' }} />
              <span>Music: {ambientEnabled ? 'ON' : 'OFF'}</span>
            </button>
            
            {ambientEnabled && (
              <input
                type="range"
                min="0"
                max="100"
                value={ambientVolume}
                onChange={(e) => {
                  const volVal = Number(e.target.value);
                  setAmbientVolume(volVal);
                  localStorage.setItem('speakflow_ambient_volume', String(volVal));
                }}
                style={{
                  width: '60px',
                  height: '3px',
                  borderRadius: '1.5px',
                  outline: 'none',
                  background: 'rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  WebkitAppearance: 'none'
                }}
              />
            )}
          </div>

          {/* Speed Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.35)' }}>
              Scroll WPM: <strong style={{ color: '#fff' }}>{Math.round(targetWPM * speedMultiplier)}</strong>
            </span>

            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {([
                { label: 'Slow', mult: 0.75 },
                { label: 'Normal', mult: 1.0 },
                { label: 'Fast', mult: 1.3 }
              ]).map((spd) => (
                <button
                  key={spd.label}
                  onClick={() => setSpeedMultiplier(spd.mult)}
                  style={{
                    padding: '3px 6px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '9px',
                    fontWeight: 700,
                    background: speedMultiplier === spd.mult ? 'var(--primary)' : 'none',
                    color: speedMultiplier === spd.mult ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {spd.label === 'Normal' ? '1.0x' : spd.label === 'Slow' ? '0.75x' : '1.3x'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          {/* Main Record Trigger */}
          <button
            onClick={togglePlayback}
            className="btn-premium"
            style={{
              flex: 2,
              padding: '10px 16px',
              fontSize: '13px',
              borderRadius: '12px',
              height: '42px',
              background: isRecording && !isPlaying ? 'rgba(255, 255, 255, 0.1)' : '',
              border: isRecording && !isPlaying ? '1px solid var(--border)' : '',
              color: isRecording && !isPlaying ? '#fff' : ''
            }}
          >
            {isRecording ? (
              isPlaying ? (
                <>
                  <Pause size={15} fill="#fff" /> Pause Scroll
                </>
              ) : (
                <>
                  <Play size={15} fill="#fff" /> Resume Scroll
                </>
              )
            ) : (
              <>
                <Mic size={15} /> Tap to Record & Read
              </>
            )}
          </button>

          {/* Stop Action */}
          {isRecording && (
            <button
              onClick={stopRecordingAndFinish}
              className="btn-secondary"
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: '13px',
                borderRadius: '12px',
                height: '42px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444'
              }}
            >
              <Square size={14} fill="#ef4444" /> Stop & Save
            </button>
          )}
        </div>
      </div>

      {/* Exit Confirmation Dialog Modal */}
      {pendingExitType !== null && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          animation: 'fade-in 0.25s ease-out'
        }}>
          <div className="glass-card" style={{
            padding: '24px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(15, 23, 42, 0.95)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
            width: '100%',
            maxWidth: '320px',
            animation: 'pop-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px', fontFamily: 'Outfit' }}>
              Leave this session?
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', marginBottom: '20px' }}>
              Your current speaking practice progress will not be saved.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn-premium"
                style={{ width: '100%', padding: '12px 16px' }}
                onClick={() => {
                  setPendingExitType(null);
                  setIsPlaying(true); // Resume scrolling
                }}
              >
                Continue Reading
              </button>
              <button
                className="btn-secondary"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#94A3B8'
                }}
                onClick={() => {
                  const type = pendingExitType;
                  setPendingExitType(null);
                  if (type === 'back') {
                    onBack();
                  } else {
                    onGoHome();
                  }
                }}
              >
                {pendingExitType === 'home' ? 'Go Home' : 'Go Back'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TeleprompterScreen;
