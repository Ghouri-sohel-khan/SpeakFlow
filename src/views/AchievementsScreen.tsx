import React, { useState, useEffect, useRef } from 'react';
import { Lock, Play, Pause, Volume2, Flame, Clock } from 'lucide-react';
import type { UserProfile, VoiceRecording } from '../services/db';
import { dbService } from '../services/db';

interface AchievementsScreenProps {
  profile: UserProfile;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ profile }) => {
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [playingId, setPlayingId] = useState<number | string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load recordings chronologically to track progress from Day 1 to Now
  useEffect(() => {
    let isMounted = true;
    const loadRecordings = async () => {
      try {
        const data = await dbService.getRecordings();
        if (isMounted) {
          const sorted = [...data].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          setRecordings(sorted);
        }
      } catch (err) {
        console.error('Error loading recordings in ConfidenceVault:', err);
      }
    };
    loadRecordings();
    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Floating background sparkles (Rose gold and gold dust)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 392);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 700);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedY: number;
      speedX: number;
    }> = [];

    for (let i = 0; i < 20; i++) {
      const isGold = Math.random() > 0.7;
      const color = isGold
        ? 'rgba(244, 201, 93, 0.04)' // Very soft gold
        : 'rgba(216, 139, 160, 0.04)'; // Very soft rose

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        color: color,
        speedY: Math.random() * 0.4 + 0.1,
        speedX: Math.random() * 0.2 - 0.1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Audio Playback Controller
  const handlePlayRecording = (id: number | string, audioUrl?: string) => {
    if (!audioUrl) return;

    if (playingId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play().catch((err) => console.error('Audio play error:', err));
      setPlayingId(id);
      audioRef.current.onended = () => {
        setPlayingId(null);
      };
    }
  };

  // 🧬 Layer 1: Calculations & Helpers
  const totalSpeakingSeconds = recordings.reduce((acc, r) => acc + r.duration, 0);
  const totalMinutes = (totalSpeakingSeconds / 60).toFixed(1);
  
  // Calculate dynamic confidence score (growth driven)
  const confidenceScore = recordings.length === 0
    ? 50
    : Math.min(96, 50 + Math.round(recordings.length * 3.5));

  // Timeline transformation milestones
  const stages = [
    {
      level: 1,
      title: 'Hesitant Speaking',
      desc: 'Starting point. Short replies, frequent pauses, and building speech blocks.',
      target: 0,
      icon: '🌱'
    },
    {
      level: 2,
      title: 'Basic Fluency',
      desc: 'Forming full sentences without breaking vocal rhythm or speed limits.',
      target: 3,
      icon: '🌿'
    },
    {
      level: 3,
      title: 'Confident Sentences',
      desc: 'Structured deliveries featuring dynamic vocal pitch and pacing.',
      target: 7,
      icon: '🎙️'
    },
    {
      level: 4,
      title: 'Natural Flow',
      desc: 'Continuous storytelling with minimal filler words and natural phrasing.',
      target: 15,
      icon: '🌊'
    },
    {
      level: 5,
      title: 'Masterful Delivery',
      desc: 'Complete vocal authority, elite articulation, and peak emotional confidence.',
      target: 30,
      icon: '👑'
    }
  ];

  // Helper to determine next locked node index
  const nextLockedIndex = stages.findIndex((s) => recordings.length < s.target);

  // Sparkline SVG renderer for Voice Clarity Trend
  const renderClarityTrend = () => {
    const points = recordings.slice(-6).map((r) => r.completionRate || 70);
    if (points.length === 0) {
      return (
        <svg width="110" height="24" style={{ opacity: 0.25 }}>
          <path d="M 0 12 Q 25 12, 55 12 T 110 12" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />
        </svg>
      );
    }

    const width = 110;
    const height = 24;
    const maxVal = 100;
    const minVal = 50;
    const valRange = maxVal - minVal;

    const coords = points.map((val, idx) => {
      const x = points.length > 1 ? (idx / (points.length - 1)) * width : width / 2;
      const norm = Math.max(0, Math.min(1, (val - minVal) / valRange));
      const y = height - (norm * (height - 4) + 2);
      return { x, y };
    });

    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i].x} ${coords[i].y}`;
    }

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Subtle glow underneath spline path */}
        <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Sparkle on end point */}
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3" fill="var(--primary)" />
      </svg>
    );
  };

  const getConfidenceLabel = (accuracy: number) => {
    if (accuracy >= 85) return { text: 'Strong Confidence', color: 'var(--success)', bg: 'rgba(67, 217, 163, 0.08)' };
    if (accuracy >= 70) return { text: 'Improving', color: 'var(--secondary)', bg: 'rgba(244, 201, 93, 0.08)' };
    return { text: 'Hesitant', color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.03)' };
  };

  return (
    <div style={{ padding: '16px 0 32px', position: 'relative' }}>
      {/* Sparkles Canvas backing */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px' }}>
        {/* Screen Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Manrope', color: 'var(--text-primary)' }}>
            Confidence Vault
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Evidence of your spoken transformation over time
          </p>
        </div>

        {/* 🧬 LAYER 1: "YOU TODAY" (Top Hero Section) */}
        <div className="card-secondary" style={{ padding: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px' }}>
              Your Current State
            </span>
            <span className="gold-tag" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Practitioner
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Big Circular Score */}
            <div style={{
              width: '82px',
              height: '82px',
              borderRadius: '50%',
              background: 'rgba(216, 139, 160, 0.08)',
              border: '2px solid var(--primary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'Manrope' }}>
                {confidenceScore}%
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>
                Confidence
              </span>
            </div>

            {/* Core Metrics */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <Flame size={14} style={{ color: 'var(--secondary)' }} fill="var(--secondary)" />
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Practice Streak:</span>
                </div>
                <strong style={{ fontSize: '14px', color: '#FFFFFF' }}>{profile.streak} Days</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <Clock size={14} style={{ color: 'var(--primary)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Vocal Workouts:</span>
                </div>
                <strong style={{ fontSize: '14px', color: '#FFFFFF' }}>{totalMinutes} Mins</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Voice Clarity:</span>
                <div>{renderClarityTrend()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 GAME-CHANGING FEATURE: “BEFORE vs NOW COMPARISON” */}
        {recordings.length >= 2 ? (
          <div className="card-secondary" style={{ padding: '20px', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '11px', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '14px', textAlign: 'left' }}>
              Before vs Now Comparison
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Day 1 - First Recording */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '14px 12px',
                textAlign: 'center',
                position: 'relative'
              }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Day 1 (First)
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'Manrope', marginBottom: '2px' }}>
                  {recordings[0].wpm} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>WPM</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Accuracy: <strong style={{ color: 'var(--primary)' }}>{recordings[0].completionRate}%</strong>
                </div>
                <button
                  onClick={() => handlePlayRecording('first_rec', recordings[0].audioUrl)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: 'none',
                    background: playingId === 'first_rec' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                    color: playingId === 'first_rec' ? '#0B0D12' : 'var(--primary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {playingId === 'first_rec' ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: '2px' }} />}
                </button>
              </div>

              {/* Today - Latest Recording */}
              <div style={{
                background: 'rgba(216, 139, 160, 0.03)',
                border: '1px solid rgba(216, 139, 160, 0.2)',
                borderRadius: '16px',
                padding: '14px 12px',
                textAlign: 'center',
                position: 'relative'
              }}>
                <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Today (Latest)
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'Manrope', marginBottom: '2px' }}>
                  {recordings[recordings.length - 1].wpm} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>WPM</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Accuracy: <strong style={{ color: 'var(--primary)' }}>{recordings[recordings.length - 1].completionRate}%</strong>
                </div>
                <button
                  onClick={() => handlePlayRecording('latest_rec', recordings[recordings.length - 1].audioUrl)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: 'none',
                    background: playingId === 'latest_rec' ? 'var(--primary)' : 'rgba(216, 139, 160, 0.1)',
                    color: playingId === 'latest_rec' ? '#0B0D12' : 'var(--primary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {playingId === 'latest_rec' ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: '2px' }} />}
                </button>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: '1.4' }}>
              💡 Play back both recordings sequentially. Hear how your pronunciation, rhythm, and structural pauses have shifted over your journey.
            </p>
          </div>
        ) : (
          <div className="card-secondary" style={{ padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
            <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '10px' }}>
              Before vs Now Comparison
            </h4>
            <div style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1.5px dashed var(--border)',
              borderRadius: '16px',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Volume2 size={24} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Locked Feature</span>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                Log at least <strong>2 voice recordings</strong> to unlock your side-by-side comparative evolution player.
              </p>
            </div>
          </div>
        )}

        {/* 📈 LAYER 2: "TRANSFORMATION MAP" (Main Timeline Section) */}
        <div className="card-secondary" style={{ padding: '20px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '11px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '20px', textAlign: 'left' }}>
            Transformation Map
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '16px' }}>
            {/* Timeline Vertical Spine Connecting Line */}
            <div style={{
              position: 'absolute',
              top: '16px',
              bottom: '16px',
              left: '32px',
              width: '2px',
              background: 'rgba(255, 255, 255, 0.05)',
              zIndex: 1
            }} />
            
            {/* Active Highlight Spine overlay */}
            <div style={{
              position: 'absolute',
              top: '16px',
              height: `${Math.min(100, Math.max(0, (recordings.length / 30) * 100))}%`,
              left: '32px',
              width: '2px',
              background: 'var(--primary)',
              zIndex: 2,
              transition: 'height 0.5s ease'
            }} />

            {/* Stages Nodes */}
            {stages.map((stage, idx) => {
              const isUnlocked = recordings.length >= stage.target;
              const isNextLocked = idx === nextLockedIndex;
              const isCurrent = isUnlocked && (idx === stages.length - 1 || recordings.length < stages[idx + 1].target);

              return (
                <div key={stage.level} style={{
                  display: 'flex',
                  gap: '20px',
                  marginBottom: idx === stages.length - 1 ? '0' : '24px',
                  position: 'relative',
                  zIndex: 10,
                  opacity: isUnlocked ? 1 : 0.6
                }}>
                  {/* Node Circle Pin */}
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: isUnlocked ? (isCurrent ? 'var(--primary)' : 'var(--surface-elevated)') : '#0B0D12',
                    border: isUnlocked 
                      ? `2px solid ${isCurrent ? 'var(--primary)' : 'rgba(216, 139, 160, 0.6)'}` 
                      : '2px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    color: isUnlocked ? (isCurrent ? '#0B0D12' : 'var(--primary)') : 'var(--text-muted)',
                    boxShadow: isCurrent ? '0 0 15px rgba(216, 139, 160, 0.2)' : 'none',
                    flexShrink: 0,
                    transition: 'all 0.3s ease'
                  }}>
                    {isUnlocked ? (stage.level === 5 ? '👑' : '✓') : <Lock size={12} />}
                  </div>

                  {/* Node Description Text */}
                  <div style={{ textAlign: 'left', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>
                        STAGE {stage.level}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize: '9px', background: 'rgba(216, 139, 160, 0.15)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                          Current State
                        </span>
                      )}
                    </div>
                    
                    <h5 style={{ fontSize: '15px', fontWeight: 700, color: isUnlocked ? '#FFFFFF' : 'var(--text-secondary)', fontFamily: 'Manrope', margin: 0 }}>
                      {stage.title}
                    </h5>
                    
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                      {stage.desc}
                    </p>

                    {/* Identity-Driven Locking State Indicator */}
                    {isNextLocked && (
                      <div style={{
                        marginTop: '8px',
                        background: 'rgba(216, 139, 160, 0.06)',
                        border: '1px dashed rgba(216, 139, 160, 0.2)',
                        borderRadius: '10px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        color: 'var(--primary)',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        width: 'fit-content'
                      }}>
                        🧬 Next version of you unlocks in {stage.target - recordings.length} more voice session{stage.target - recordings.length > 1 ? 's' : ''}
                      </div>
                    )}
                    
                    {!isUnlocked && !isNextLocked && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Unlocks at {stage.target} recorded sessions
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 🎧 LAYER 3: "VOICE MEMORY WALL" (Voice Diary Trophies) */}
        <div className="card-secondary" style={{ padding: '20px', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Voice Memory Wall
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {recordings.length} Vaulted Clips
            </span>
          </div>

          {recordings.length === 0 ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1.5px dashed var(--border)',
              borderRadius: '16px',
              padding: '30px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Volume2 size={24} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <h5 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                Begin your speaking journey
              </h5>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                Your voice recordings will serve as real, audible trophies. Record your first speaking session to start building your timeline.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Render recordings in reverse chronological order so latest is on top */}
              {[...recordings].reverse().map((rec) => {
                const isPlaying = playingId === rec.id;
                const conf = getConfidenceLabel(rec.completionRate);
                
                return (
                  <div
                    key={rec.id}
                    style={{
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    {/* Playback Control */}
                    <button
                      onClick={() => handlePlayRecording(rec.id, rec.audioUrl)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: 'none',
                        background: isPlaying ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                        color: isPlaying ? '#0B0D12' : 'var(--primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: '2.5px' }} />}
                    </button>

                    {/* Meta & Metrics info */}
                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '13px', color: '#FFFFFF', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {new Date(rec.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {rec.duration}s
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '9px',
                          background: conf.bg,
                          color: conf.color,
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          {conf.text}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {rec.wpm} WPM • {rec.completionRate}% Acc
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AchievementsScreen;
