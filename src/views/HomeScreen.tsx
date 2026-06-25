import React from 'react';
import { Play, Flame, Sparkles, Clock, Target, Trophy, BookOpen, Mic, Award, Zap, Lock, Coins } from 'lucide-react';
import type { UserProfile, VoiceRecording } from '../services/db';
import { dbService } from '../services/db';
import { getDailyChallengeForDay } from '../data/missions';
import type { Mission } from '../data/missions';

interface HomeScreenProps {
  profile: UserProfile;
  missions: Mission[];
  unlockedCount: number;
  dayOffset: number;
  onNavigate: (tab: string) => void;
  onSelectMission: (mission: Mission) => void;
  onSelectDailyChallenge: (duration?: number) => void;
  dailyChallengeCount: number;
  onOpenAbout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  missions,
  unlockedCount,
  dayOffset,
  onNavigate,
  onSelectMission,
  onSelectDailyChallenge,
  dailyChallengeCount,
  onOpenAbout
}) => {
  // Local state for Custom Speaking Mode selection
  const [selectedDurationOption, setSelectedDurationOption] = React.useState<number | 'custom'>(60);
  const [customSliderDuration, setCustomSliderDuration] = React.useState<number>(180);
  
  // Local state for recordings
  const [recordings, setRecordings] = React.useState<VoiceRecording[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchRecordings = async () => {
      try {
        const data = await dbService.getRecordings();
        if (isMounted) {
          setRecordings(data);
        }
      } catch (err) {
        console.error('Error fetching recordings in HomeScreen:', err);
      }
    };
    fetchRecordings();
    return () => {
      isMounted = false;
    };
  }, [profile.completedMissions]);

  // Tactile clicking ripple effect helper
  const triggerRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rippleContainer = document.createElement('span');
    rippleContainer.className = 'metallic-ripple-container';

    const rippleCircle = document.createElement('span');
    rippleCircle.className = 'metallic-ripple-circle';
    rippleCircle.style.left = `${x}px`;
    rippleCircle.style.top = `${y}px`;

    rippleContainer.appendChild(rippleCircle);
    btn.appendChild(rippleContainer);

    setTimeout(() => {
      rippleContainer.remove();
    }, 350);
  };

  const handleRippleClick = (e: React.MouseEvent<HTMLButtonElement>, callback: () => void) => {
    triggerRipple(e);
    setTimeout(() => {
      callback();
    }, 120);
  };

  const getChallengeProgressLimit = (count: number) => {
    if (count < 5) return { name: `Challenge ${count + 1} / 5`, seconds: 30 };
    if (count < 10) return { name: `Challenge ${count + 1} / 10`, seconds: 40 };
    if (count < 15) return { name: `Challenge ${count + 1} / 15`, seconds: 50 };
    if (count < 20) return { name: `Challenge ${count + 1} / 20`, seconds: 60 };
    return { name: `Challenge ${count + 1}`, seconds: 60 };
  };
  const currentLimit = getChallengeProgressLimit(dailyChallengeCount);

  // Determine next mission to complete
  const completedIds = Object.keys(profile.completedMissions).map(Number);
  const nextMission = missions.find(m => m.id <= unlockedCount && !completedIds.includes(m.id)) || 
                      missions.find(m => m.id <= unlockedCount) || 
                      missions[0];

  // Calculate speaking minutes
  const totalSpeakingSeconds = recordings.reduce((acc, r) => acc + r.duration, 0);
  const totalSpeakingMinutes = (totalSpeakingSeconds / 60).toFixed(1);

  // Level Progression details
  const currentLvlNum = Math.floor(profile.xp / 100) + 1;
  const currentLvlXP = profile.xp % 100;

  // Time based greeting
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get active avatar description icon
  const getAvatarEmoji = () => {
    if (profile.avatar === 'student') return '🎓';
    if (profile.avatar === 'professional') return '💼';
    if (profile.avatar === 'traveler') return '✈️';
    return '🚀';
  };

  // Calculate weekly consistency grid (Monday to Sunday of the current week, timezone-safe)
  const weeklyConsistency = (() => {
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const isSameDay = (date1: Date, date2: Date) => {
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate();
    };
    
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + dayOffset);
    
    const currentDay = baseDate.getDay();
    const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
    
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - daysToSubtract);
    
    return daysOfWeek.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      
      const hasActivity = recordings.some(r => isSameDay(new Date(r.timestamp), d));
      const isToday = isSameDay(d, baseDate);
      
      return {
        label,
        active: hasActivity,
        isToday,
        date: d
      };
    });
  })();

  // Calculate customized milestones progress
  const masteredCount = Object.values(profile.completedMissions).filter(m => m.stars >= 3).length;
  const weeklyEnduranceMinutes = 10;
  const weeklyEndurancePercent = Math.min(100, Math.round((parseFloat(totalSpeakingMinutes) / weeklyEnduranceMinutes) * 100));

  return (
    <div style={{ padding: '16px 0 32px' }}>
      
      {/* ─── TOP HEADER (Apple-style Polish & Cleanliness) ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'var(--surface-elevated)',
            border: '1px solid rgba(244, 201, 93, 0.18)', // Engraved gold bezel
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {getAvatarEmoji()}
          </div>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
              {getGreeting()}
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '-1px' }}>
              {profile.username}
            </h2>
          </div>
        </div>

        {/* Streak Flame Pill in Gold */}
        <div 
          onClick={() => onNavigate('achievements')}
          className="btn-tactile-press"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(244, 201, 93, 0.08)',
            border: '1px solid rgba(244, 201, 93, 0.2)',
            padding: '6px 14px',
            borderRadius: '20px',
            color: 'var(--secondary)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(244, 201, 93, 0.04)'
          }}
        >
          <Flame size={14} fill="var(--secondary)" />
          <span>{profile.streak} Day Streak</span>
        </div>
      </div>

      {/* ─── SECTION 1: LEARN & PRACTICE (Rose Gold theme, `#D88BA0`) ─── */}
      <div style={{ padding: '0 20px', marginTop: '8px', marginBottom: '12px', textAlign: 'left' }}>
        <h3 style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'Manrope' }}>
          Learn & Practice
        </h3>
      </div>

      {/* Guided Practice Card (Refined Editorial Visual Layout) */}
      {nextMission && (
        <div className="card-secondary" style={{
          padding: '24px',
          border: '1px solid rgba(216, 139, 160, 0.18)', // Rose gold bezel outline
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle editorial/script-inspired background texture */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '20px',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0,
            opacity: 0.03, // 3% opacity as requested
            filter: 'blur(0.5px)' // Slight blur
          }}>
            {/* Soft manuscript-style structure with faint horizontal text lines */}
            <div style={{
              padding: '24px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              fontFamily: 'serif'
            }}>
              <div style={{ borderBottom: '1px solid #FFFFFF', height: '16px', width: '92%' }}></div>
              <div style={{ borderBottom: '1px solid #FFFFFF', height: '16px', width: '85%' }}></div>
              <div style={{ borderBottom: '1px solid #FFFFFF', height: '16px', width: '95%' }}></div>
              <div style={{ borderBottom: '1px solid #FFFFFF', height: '16px', width: '78%' }}></div>
              <div style={{ borderBottom: '1px solid #FFFFFF', height: '16px', width: '88%' }}></div>
              <div style={{ borderBottom: '1px solid #FFFFFF', height: '16px', width: '90%' }}></div>
            </div>
          </div>

          {/* Content Wrapper to overlay above background texture */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            
            {/* [LEARN & PRACTICE] Category Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <span style={{
                fontSize: '11px',
                color: 'var(--primary)', // `#D88BA0`
                fontWeight: 700,
                letterSpacing: '1.5px',
                fontFamily: 'Manrope',
                textTransform: 'uppercase'
              }}>
                Learn & Practice
              </span>
              <span style={{
                fontSize: '9px',
                background: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                {nextMission.difficulty}
              </span>
            </div>

            {/* Title: 🎤 Guided Practice */}
            <h3 style={{ 
              fontSize: '22px', 
              fontWeight: 700, 
              color: 'var(--text-primary)', 
              margin: '0 0 6px 0', 
              fontFamily: 'Manrope', 
              lineHeight: '1.3',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>🎤</span> Guided Practice
            </h3>

            {/* Description: Follow guided scripts and improve speaking confidence. */}
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--text-secondary)', 
              margin: '0 0 20px 0', 
              lineHeight: '1.5',
              fontWeight: 500 
            }}>
              Follow guided scripts and improve speaking confidence.
            </p>

            {/* Dynamic Active Script Info Box (Premium Editorial Reading Area) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.015)',
              border: '1px solid rgba(216, 139, 160, 0.08)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Active Script Focus
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0', fontFamily: 'Manrope' }}>
                {nextMission.title}
              </h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4', fontStyle: 'italic', opacity: 0.8 }}>
                "{nextMission.content ? (nextMission.content.length > 85 ? nextMission.content.slice(0, 85) + '...' : nextMission.content) : 'Practice reading cadence, breath control, and emotional resonance.'}"
              </p>
            </div>

            {/* Footer Row: Metadata and Start Practice Button */}
            <div style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                  <Clock size={13} style={{ color: 'var(--primary)' }} />
                  <span>{nextMission.estimated_duration}s target</span>
                </div>
              </div>
              
              <button
                onClick={(e) => handleRippleClick(e, () => onSelectMission(nextMission))}
                className="btn-premium btn-tactile-press"
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: 'var(--primary)', // `#D88BA0`
                  color: 'var(--bg-deep)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'transform 0.15s ease'
                }}
              >
                <Play size={12} fill="var(--bg-deep)" /> Start Practice
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Quick Access links to Script Library and Voice Diary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        margin: '12px 16px'
      }}>
        {/* Script Library tab link */}
        <div 
          onClick={() => onNavigate('journey')}
          className="card-minimal"
          style={{
            margin: 0,
            padding: '16px',
            background: 'var(--surface)',
            border: '1px solid rgba(216, 139, 160, 0.12)', // Rose gold bezel
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '10px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'transform 0.2s ease'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(216, 139, 160, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <BookOpen size={16} />
          </div>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Script Library
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
              Browse 150+ custom scenarios
            </span>
          </div>
        </div>

        {/* Voice Diary tab link */}
        <div 
          onClick={() => onNavigate('diary')}
          className="card-minimal"
          style={{
            margin: 0,
            padding: '16px',
            background: 'var(--surface)',
            border: '1px solid rgba(216, 139, 160, 0.12)', // Rose gold bezel
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '10px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'transform 0.2s ease'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(216, 139, 160, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Mic size={16} />
          </div>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Voice Diary
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
              Record vocal sessions freely
            </span>
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: PROVE YOURSELF (Gold theme, `#F4C95D`) ─── */}
      <div style={{ padding: '0 20px', marginTop: '24px', marginBottom: '12px', textAlign: 'left' }}>
        <h3 style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'Manrope' }}>
          Prove Yourself
        </h3>
      </div>

      {/* Daily Challenge Card (Trophy motif, Test -> Achieve -> Earn) */}
      <div className="card-secondary" style={{
        border: '1px solid rgba(244, 201, 93, 0.18)', // Premium gold bezel tint
        background: 'var(--surface)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={16} style={{ color: 'var(--secondary)' }} fill="rgba(244, 201, 93, 0.15)" />
            <h4 style={{ color: 'var(--secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              Daily Speaking Challenge
            </h4>
          </div>
          <span style={{ fontSize: '10px', background: 'rgba(244, 201, 93, 0.1)', color: 'var(--secondary)', border: '1px solid rgba(244, 201, 93, 0.2)', padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>
            {dailyChallengeCount >= 20 ? 'Custom Mode' : `Level ${dailyChallengeCount + 1}`}
          </span>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, lineHeight: '1.5', margin: '8px 0 14px', fontStyle: 'italic', opacity: 0.9, textAlign: 'left' }}>
          "{getDailyChallengeForDay(dayOffset).prompt}"
        </p>

        {/* Custom duration setup */}
        {dailyChallengeCount >= 20 ? (
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', textAlign: 'left' }}>
              Select Duration:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {[30, 45, 60, 90, 120, 'custom'].map((opt) => {
                const isSelected = selectedDurationOption === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setSelectedDurationOption(opt as any)}
                    style={{
                      padding: '6px',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid var(--secondary)' : '1px solid var(--border)',
                      background: isSelected ? 'rgba(244, 201, 93, 0.1)' : 'rgba(255,255,255,0.01)',
                      color: isSelected ? 'var(--secondary)' : 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {opt === 'custom' ? 'Custom' : `${opt}s`}
                  </button>
                );
              })}
            </div>
            
            {selectedDurationOption === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Duration Limit:</span>
                  <strong style={{ color: 'var(--secondary)' }}>{customSliderDuration}s</strong>
                </div>
                <input
                  type="range"
                  min="30"
                  max="300"
                  step="5"
                  value={customSliderDuration}
                  onChange={(e) => setCustomSliderDuration(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: 'var(--secondary)',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.12)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.04)', marginBottom: '12px', textAlign: 'left' }}>
            🎯 Complete 20 challenges to unlock Custom Mode • Progress: <strong style={{ color: 'var(--secondary)' }}>{dailyChallengeCount} / 20</strong>
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Zap size={11} fill="var(--secondary)" /> +40 XP
            </span>
            <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Coins size={11} fill="var(--secondary)" style={{ color: 'var(--secondary)' }} /> +15 Coins
            </span>
          </div>
          
          <button
            className="btn-premium btn-tactile-press btn-metallic-shine"
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'var(--secondary)',
              color: 'var(--bg-deep)'
            }}
            onClick={(e) => {
              const dur = dailyChallengeCount >= 20
                ? (selectedDurationOption === 'custom' ? customSliderDuration : (selectedDurationOption as number))
                : currentLimit.seconds;
              handleRippleClick(e, () => onSelectDailyChallenge(dur));
            }}
          >
            Start Challenge
          </button>
        </div>
      </div>

      {/* Weekly Endurance Challenge Card (Progress bar & rewards, Test -> Achieve -> Earn) */}
      <div className="card-secondary" style={{
        border: '1px solid rgba(244, 201, 93, 0.18)', // Gold bezel tint
        background: 'var(--surface)',
        marginTop: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={16} style={{ color: 'var(--secondary)' }} fill="rgba(244, 201, 93, 0.15)" />
            <h4 style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700, fontFamily: 'Manrope', margin: 0 }}>
              Weekly Endurance Workout
            </h4>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 700 }}>
            {weeklyEndurancePercent}% Done
          </span>
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', textAlign: 'left', lineHeight: '1.45', margin: '0 0 12px' }}>
          Practice speaking for at least <strong>{weeklyEnduranceMinutes} minutes</strong> this week to unlock elite vocal endurance rewards.
        </p>

        {/* Dynamic Gold Progress Tracker */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
            <span>Stamina Progress:</span>
            <span>{totalSpeakingMinutes} / {weeklyEnduranceMinutes} Mins</span>
          </div>
          <div className="xp-bar-track" style={{ height: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px' }}>
            <div className="xp-bar-fill" style={{ width: `${weeklyEndurancePercent}%`, background: 'var(--secondary)', borderRadius: '4px', height: '100%' }}></div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Weekly Reward Target
          </span>
          <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Sparkles size={11} /> +100 XP • +30 Coins
          </span>
        </div>
      </div>

      {/* Milestone Tasks Card (Trophy goals, locked/checkmark indicators) */}
      <div className="card-secondary" style={{
        border: '1px solid rgba(244, 201, 93, 0.18)', // Gold bezel tint
        background: 'var(--surface)',
        marginTop: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Target size={16} style={{ color: 'var(--secondary)' }} />
          <h4 style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700, fontFamily: 'Manrope', margin: 0 }}>
            Milestone Tasks
          </h4>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Milestone 1: Mastered scripts */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '10px 12px',
            textAlign: 'left'
          }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: masteredCount >= 3 ? 'rgba(67, 217, 163, 0.1)' : 'rgba(244, 201, 93, 0.06)',
              border: masteredCount >= 3 ? '1px solid var(--success)' : '1px solid rgba(244, 201, 93, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: masteredCount >= 3 ? 'var(--success)' : 'var(--secondary)',
              fontSize: '11px',
              flexShrink: 0
            }}>
              {masteredCount >= 3 ? '✓' : <Lock size={10} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                Fluency Peak Milestone
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Complete 3 scripts with a 3+ star rating (Progress: {masteredCount}/3)
              </div>
            </div>
          </div>

          {/* Milestone 2: Habit streak */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '10px 12px',
            textAlign: 'left'
          }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: profile.streak >= 7 ? 'rgba(67, 217, 163, 0.1)' : 'rgba(244, 201, 93, 0.06)',
              border: profile.streak >= 7 ? '1px solid var(--success)' : '1px solid rgba(244, 201, 93, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: profile.streak >= 7 ? 'var(--success)' : 'var(--secondary)',
              fontSize: '11px',
              flexShrink: 0
            }}>
              {profile.streak >= 7 ? '✓' : <Lock size={10} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                Habit Pioneer Milestone
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Reach a 7-day practice streak (Progress: {profile.streak}/7 days)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. PROGRESS SNAPSHOT (Clean Gamification Dashboard - Now as Footer Summary) ─── */}
      <div style={{ padding: '0 20px', marginTop: '24px', marginBottom: '10px', textAlign: 'left' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Streak & Practice Snapshot
        </span>
      </div>
      
      <div className="card-secondary" style={{ padding: '18px 20px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
        {/* Level and XP */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Level {currentLvlNum} Practitioner</span>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{currentLvlXP} / 100 XP</span>
          </div>
          <div className="xp-bar-track" style={{ height: '6px' }}>
            <div className="xp-bar-fill" style={{ width: `${currentLvlXP}%`, background: 'var(--primary)' }}></div>
          </div>
        </div>

        {/* 7-Day Weekly Consistency Grid */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
            <span>Weekly Consistency</span>
            <span style={{ color: 'var(--secondary)' }}>Habit Streak</span>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '8px',
            padding: '4px 0'
          }}>
            {weeklyConsistency.map((day, idx) => {
              const isActiveToday = day.isToday;
              const isCompleted = day.active;
              
              // Base styling for inactive day: dark neutral (#171A22) with low contrast border
              let cellBg = '#171A22';
              let cellBorder = '1px solid rgba(255, 255, 255, 0.05)';
              let cellColor = 'var(--text-muted)';
              let cellTextWeight = 500;
              
              if (isActiveToday) {
                // Active day = PRIMARY accent (#D88BA0)
                cellBg = 'rgba(216, 139, 160, 0.2)';
                cellBorder = '1.5px solid var(--primary)';
                cellColor = 'var(--primary)';
                cellTextWeight = 700;
              } else if (isCompleted) {
                // Completed day = subtle filled state
                cellBg = 'rgba(216, 139, 160, 0.12)';
                cellBorder = '1px solid rgba(216, 139, 160, 0.25)';
                cellColor = 'var(--primary)';
                cellTextWeight = 700;
              }
              
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  {/* Square cell */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '8px',
                    background: cellBg,
                    border: cellBorder,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: cellColor,
                    fontWeight: cellTextWeight,
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}>
                    {isCompleted ? '✓' : ''}
                  </div>
                  {/* Single day label */}
                  <span style={{
                    fontSize: '10px',
                    color: isActiveToday ? 'var(--primary)' : isCompleted ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: isActiveToday || isCompleted ? 700 : 500,
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── ABOUT BUTTON ─── */}
      <div style={{ padding: '0 16px', marginTop: '24px' }}>
        <button
          onClick={(e) => handleRippleClick(e, onOpenAbout)}
          className="btn-secondary btn-tactile-press"
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '16px' }}>ℹ️</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
            About Application & Developer Info
          </span>
        </button>
      </div>
    </div>
  );
};

export default HomeScreen;
