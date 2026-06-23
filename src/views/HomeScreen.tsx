import React from 'react';
import { Play, Mic, BarChart2, Trophy, ChevronRight, History, Target } from 'lucide-react';
import type { UserProfile, VoiceRecording } from '../services/db';
import { dbService } from '../services/db';
import { getDailyChallengeForDay } from '../data/missions';
import type { Mission } from '../data/missions';

// Import environment background assets
import bgJungle from '../assets/bg_jungle.png';
import bgDesert from '../assets/bg_desert.png';
import bgVillage from '../assets/bg_village.png';
import bgCity from '../assets/bg_city.png';

interface HomeScreenProps {
  profile: UserProfile;
  missions: Mission[];
  unlockedCount: number;
  dayOffset: number;
  onNavigate: (tab: string) => void;
  onSelectMission: (mission: Mission) => void;
  onSelectDailyChallenge: (duration?: number) => void;
  dailyChallengeCount: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  missions,
  unlockedCount,
  dayOffset,
  onNavigate,
  onSelectMission,
  onSelectDailyChallenge,
  dailyChallengeCount
}) => {
  // Local state for Custom Speaking Mode selection
  const [selectedDurationOption, setSelectedDurationOption] = React.useState<number | 'custom'>(60);
  const [customSliderDuration, setCustomSliderDuration] = React.useState<number>(180); // 30s to 300s
  
  // Local state for recordings (to draw dynamic speaking pulse wave)
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
  }, [profile.completedMissions]); // Reload when mission gets completed

  // Ripple effect handler for tactile gold button clicking
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

  // Map nextMission tier to dynamic environment background
  const nextMissionIndex = nextMission ? ((nextMission.id - 1) % 50 + 1) : 1;
  let envBg = bgJungle;
  let envName = 'Emerald Jungle';
  let envIcon = '🌴';

  if (nextMissionIndex <= 5) {
    envBg = bgJungle;
    envName = 'Emerald Jungle';
    envIcon = '🌴';
  } else if (nextMissionIndex <= 10) {
    envBg = bgDesert;
    envName = 'Golden Dunes';
    envIcon = '🏜️';
  } else if (nextMissionIndex <= 15) {
    envBg = bgVillage;
    envName = 'Whisper Village';
    envIcon = '🏡';
  } else {
    envBg = bgCity;
    envName = 'SpeakFlow City';
    envIcon = '🏢';
  }

  // Calculate daily missions completed today
  const completedTodayCount = Object.values(profile.completedMissions).filter(m => {
    return (Date.now() - m.timestamp) < 24 * 60 * 60 * 1000;
  }).length;
  const dailyGoalMax = 5;
  const goalPercentage = Math.min(100, (completedTodayCount / dailyGoalMax) * 100);

  // Level Progression: Level = Math.floor(XP / 100) + 1
  const currentLvlNum = Math.floor(profile.xp / 100) + 1;
  const currentLvlXP = profile.xp % 100;

  // Get a list of completed missions to suggest in "Improve Again"
  const completedList = missions.filter(m => completedIds.includes(m.id));
  const improveAgainMission = completedList.length > 0 ? completedList[0] : null;

  // Time based greeting
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get active avatar description
  const getAvatarTitle = () => {
    const name = profile.avatar.charAt(0).toUpperCase() + profile.avatar.slice(1);
    if (profile.xp >= 300) return `Master ${name}`;
    if (profile.xp >= 100) return `Elite ${name}`;
    return `Novice ${name}`;
  };

  // Dynamic speaking pulse calculations
  const last3 = recordings.slice(0, 3);
  const avgWPM = last3.length > 0
    ? Math.round(last3.reduce((sum, r) => sum + r.wpm, 0) / last3.length)
    : 110;

  let improvementPercent = 10;
  if (recordings.length >= 2) {
    const latest = recordings[0].wpm;
    const prior = recordings[1].wpm;
    if (prior > 0) {
      const calc = Math.round(((latest - prior) / prior) * 100);
      if (calc > 0) improvementPercent = calc;
    }
  }

  // Generate amplitudes based on last 3 recordings' speeds
  const waveAmplitudes = last3.length > 0 
    ? last3.map(r => Math.min(45, Math.max(10, (r.wpm / 250) * 45)))
    : [20, 32, 18, 38, 22, 30]; // default layout
  while (waveAmplitudes.length < 6) {
    waveAmplitudes.push(waveAmplitudes[waveAmplitudes.length - 1] || 20);
  }

  // Draw smooth sound wave spline
  const pathD = `M 10,${50 - waveAmplitudes[0]} 
                 C 60,${50 - waveAmplitudes[1]} 120,${50 - waveAmplitudes[2]} 150,${50 - waveAmplitudes[3]} 
                 C 180,${50 - waveAmplitudes[4]} 240,${50 - waveAmplitudes[5]} 290,${50 - waveAmplitudes[0]}`;
  const fillPathD = `${pathD} L 290,70 L 10,70 Z`;

  const isVaultActive = profile.streak > 0;

  return (
    <div style={{ padding: '0 0 24px' }}>
      
      {/* ─── 1. The "Live Journey" Gateway (Adventure Hero Section - Top 40%) ─── */}
      <div style={{
        position: 'relative',
        height: '260px',
        width: '100%',
        backgroundImage: `url(${envBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '24px 18px',
        boxShadow: 'inset 0 -100px 70px -30px #0a0a0f'
      }}>
        {/* Parallax ambient drifting layers */}
        <div className="gateway-parallax-layer-1" style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(circle at 20% 30%, rgba(212, 175, 55, 0.09) 0%, transparent 60%)',
          pointerEvents: 'none',
          mixBlendMode: 'screen'
        }}></div>
        <div className="gateway-parallax-layer-2" style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(circle at 80% 70%, rgba(212, 175, 55, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none',
          mixBlendMode: 'screen'
        }}></div>

        {/* Bottom linear dark fade blend overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '100%',
          background: 'linear-gradient(to bottom, rgba(10, 10, 15, 0) 50%, rgba(10, 10, 15, 0.75) 80%, #0a0a0f 100%)',
          pointerEvents: 'none',
          zIndex: 1
        }}></div>

        {/* Top left environment stage info */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
          <span className="gold-tag" style={{ background: 'rgba(13, 13, 18, 0.88)', borderColor: 'rgba(212, 175, 55, 0.45)' }}>
            {envIcon} {envName}
          </span>
        </div>

        {/* Top Right "The Golden Vault" (Reward Gateway) */}
        <button
          onClick={(e) => handleRippleClick(e, () => onNavigate('achievements'))}
          className={`btn-tactile-press ${isVaultActive ? 'vault-ready-shimmer' : ''}`}
          style={{
            position: 'absolute',
            top: '12px',
            right: '16px',
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'rgba(13, 13, 18, 0.82)',
            border: '2px solid rgba(212, 175, 55, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
            overflow: 'hidden',
            boxShadow: isVaultActive ? '0 0 15px rgba(255, 215, 0, 0.4)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          title="Trophy Room Vault"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#FFD700" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
            <path d="M4 10c0-3 3-5 8-5s8 2 8 5" />
            <circle cx="12" cy="15" r="2.2" fill="#FFD700" />
          </svg>
          {isVaultActive && (
            <span style={{
              position: 'absolute',
              bottom: '1px',
              width: '100%',
              textAlign: 'center',
              background: 'linear-gradient(90deg, #D4AF37, #E8CC6A)',
              color: '#0d0d12',
              fontSize: '7.5px',
              fontWeight: 900,
              letterSpacing: '0.2px',
              padding: '0.5px 0',
              textShadow: '0 0 2px rgba(255,255,255,0.4)'
            }}>
              READY
            </span>
          )}
        </button>

        {/* User profile details overlay */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
          {/* Avatar Circle with metallic gold border */}
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4AF37 0%, #A88A1E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.35)',
            border: '2px solid rgba(255, 215, 0, 0.65)',
            flexShrink: 0
          }}>
            {profile.avatar === 'student' && '🎓'}
            {profile.avatar === 'professional' && '💼'}
            {profile.avatar === 'traveler' && '✈️'}
            {profile.avatar === 'entrepreneur' && '🚀'}
          </div>

          <div style={{ textAlign: 'left' }}>
            <h4 style={{ color: 'rgba(245, 240, 232, 0.7)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.5px' }}>
              {getGreeting()},
            </h4>
            <h2 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit', color: '#FFF', marginTop: '1px', textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
              {profile.username}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
              <span className="gold-tag" style={{ fontSize: '8px', padding: '1px 6px', background: 'rgba(212,175,55,0.15)' }}>
                {getAvatarTitle()}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(245, 240, 232, 0.75)', textShadow: '0 1px 2px rgba(0,0,0,0.8)', fontWeight: 500 }}>
                Level {currentLvlNum}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. "The Motivation Pulse" (Interactive Card) ─── */}
      <div className="glass-card speaking-pulse-card" style={{ margin: '-10px 16px 16px', padding: '18px 20px', borderRadius: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px' }}>📈</span>
            <span className="section-label" style={{ color: '#D4AF37', letterSpacing: '1px' }}>Speaking Pulse</span>
          </div>
          <span style={{ fontSize: '10px', background: 'rgba(212, 175, 55, 0.12)', color: '#D4AF37', padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>
            🔥 {profile.streak} Day Streak
          </span>
        </div>

        {/* Customized SVG Fluency Waveform */}
        <div style={{ position: 'relative', height: '62px', margin: '14px 0 10px', overflow: 'hidden' }}>
          <svg viewBox="0 0 300 70" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="waveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(212, 175, 55, 0.35)" />
                <stop offset="100%" stopColor="rgba(212, 175, 55, 0.0)" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A88A1E" />
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#D4AF37" />
              </linearGradient>
            </defs>
            {/* Area fill */}
            <path d={fillPathD} fill="url(#waveGrad)" style={{ transition: 'all 0.5s ease' }} />
            {/* Wave line */}
            <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="2.8" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 215, 0, 0.6))', transition: 'all 0.5s ease' }} />
            
            {/* Amplitudes dots */}
            {last3.map((rec, i) => {
              const xVal = 10 + i * 135; // Position points horizontally
              const amp = waveAmplitudes[i] || 20;
              const yVal = 50 - amp;
              return (
                <g key={rec.id}>
                  <circle cx={xVal} cy={yVal} r="4" fill="#FFF" stroke="#D4AF37" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 3px #D4AF37)' }} />
                  <text x={xVal} y={yVal - 8} fill="rgba(245, 240, 232, 0.9)" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                    {rec.wpm} WPM
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Motivational speech pulse tags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '10px' }}>
          <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#D4AF37', margin: 0, fontFamily: 'Outfit' }}>
            ✨ Aaj aapki speaking rhythm {improvementPercent}% behtar hai!
          </h4>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
            Fluent trend average: <strong style={{ color: '#fff' }}>{avgWPM} WPM</strong> over your last {Math.max(1, last3.length)} attempts.
          </p>
        </div>

        {/* Daily Goals progress integrated cleanly */}
        <div style={{ marginTop: '14px', borderTop: '1px solid rgba(212, 175, 55, 0.08)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Daily Mission Goal</span>
            <span style={{ color: '#D4AF37', fontWeight: 700 }}>{completedTodayCount} / {dailyGoalMax} completed</span>
          </div>
          <div className="xp-bar-track" style={{ height: '5px' }}>
            <div className="xp-bar-fill" style={{ width: `${goalPercentage}%` }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '6px' }}>
            <span>Total XP: {profile.xp}</span>
            <span>Next Level: {currentLvlXP}/100 XP</span>
          </div>
        </div>
      </div>

      {/* ─── 3. Next Mission vs Daily Challenge Grid Layout ─── */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Next Mission - High-Contrast Gold-Bordered Card */}
        {nextMission && (
          <div className="glass-card" style={{
            margin: 0,
            padding: '20px',
            border: '2px solid #D4AF37',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(20, 18, 28, 0.9) 100%)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(212, 175, 55, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <span className="gold-tag" style={{ marginBottom: '6px' }}>
                  <Target size={10} style={{ marginRight: '3px' }} /> Active Journey
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '8px', color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                  {nextMission.title}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Mission {nextMission.id} • {nextMission.environment} • {Math.round((nextMission.word_count / nextMission.estimated_duration) * 60)} WPM Target
                </p>
              </div>
              <button
                onClick={(e) => handleRippleClick(e, () => onSelectMission(nextMission))}
                className="btn-tactile-press btn-metallic-shine"
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #D4AF37 0%, #A88A1E 100%)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0d0d12',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(212, 175, 55, 0.35)',
                  flexShrink: 0
                }}
              >
                <Play size={20} fill="#0d0d12" style={{ marginLeft: '2px' }} />
              </button>
            </div>
            
            <div style={{ borderTop: '1px solid rgba(212, 175, 55, 0.12)', paddingTop: '10px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {profile.completedMissions[nextMission.id] ? `Best: ${profile.completedMissions[nextMission.id].stars} ⭐` : 'Unattempted'}
              </span>
              <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 700 }}>
                +{nextMission.xp} XP • +{nextMission.coins} Coins
              </span>
            </div>
          </div>
        )}

        {/* Daily Challenge - Sleek Secondary Card */}
        <div className="glass-card" style={{
          margin: 0,
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.03) 0%, rgba(20, 18, 28, 0.85) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.15)',
          padding: '16px 18px',
          borderRadius: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px' }}>🎙️</span>
              <h4 style={{ color: '#D4AF37', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                Daily Speaking Challenge
              </h4>
            </div>
            {dailyChallengeCount < 20 ? (
              <span style={{ fontSize: '10px', background: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37', padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>
                Challenge {dailyChallengeCount + 1}
              </span>
            ) : (
              <span style={{ fontSize: '10px', background: 'rgba(212, 175, 55, 0.12)', color: '#E8CC6A', padding: '3px 8px', borderRadius: '10px', fontWeight: 800 }}>
                🎉 Custom Mode
              </span>
            )}
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 500, lineHeight: '1.45', margin: '0 0 10px', fontStyle: 'italic', opacity: 0.85 }}>
            "{getDailyChallengeForDay(dayOffset).prompt}"
          </p>

          {dailyChallengeCount >= 20 ? (
            <div style={{ borderTop: '1px solid rgba(212, 175, 55, 0.08)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
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
                        border: isSelected ? '1px solid #D4AF37' : '1px solid rgba(212, 175, 55, 0.1)',
                        background: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.02)',
                        color: isSelected ? '#D4AF37' : 'var(--text-secondary)',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Duration Limit:</span>
                    <strong style={{ color: '#D4AF37' }}>{customSliderDuration}s</strong>
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
                      accentColor: '#D4AF37',
                      cursor: 'pointer',
                      marginTop: '4px'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }}>
                    <span>30s</span>
                    <span>300s (5m)</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.06)', marginBottom: '10px' }}>
              🎯 Complete 20 challenges to unlock Custom Mode — Progress: <strong style={{ color: '#D4AF37' }}>{dailyChallengeCount} / 20</strong>
            </div>
          )}

          <div style={{ borderTop: '1px solid rgba(212, 175, 55, 0.08)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {dailyChallengeCount >= 20 ? (
                <>Limit: <strong style={{ color: '#D4AF37' }}>{selectedDurationOption === 'custom' ? customSliderDuration : selectedDurationOption}s</strong></>
              ) : (
                <>Limit: <strong style={{ color: '#D4AF37' }}>{currentLimit.seconds}s</strong></>
              )}
            </span>
            <button
              className="btn-premium btn-tactile-press btn-metallic-shine"
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700
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
      </div>

      {/* ─── 4. Quick Actions Grid ─── */}
      <div style={{ padding: '0 16px', marginTop: '18px' }}>
        <span className="section-label" style={{ marginBottom: '10px', display: 'block' }}>
          Quick Workouts
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button className="btn-secondary btn-tactile-press btn-metallic-shine" style={{ padding: '14px 12px', borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }} onClick={(e) => handleRippleClick(e, () => onNavigate('journey'))}>
            <span style={{ fontSize: '20px' }}>🗺️</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Explore Stages</span>
          </button>
          <button className="btn-secondary btn-tactile-press btn-metallic-shine" style={{ padding: '14px 12px', borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }} onClick={(e) => handleRippleClick(e, () => onNavigate('diary'))}>
            <Mic size={20} style={{ color: '#D4AF37' }} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Voice Diary</span>
          </button>
          <button className="btn-secondary btn-tactile-press btn-metallic-shine" style={{ padding: '14px 12px', borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }} onClick={(e) => handleRippleClick(e, () => onNavigate('progress'))}>
            <BarChart2 size={20} style={{ color: '#D4AF37' }} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Report & Audio</span>
          </button>
          <button className="btn-secondary btn-tactile-press btn-metallic-shine" style={{ padding: '14px 12px', borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }} onClick={(e) => handleRippleClick(e, () => onNavigate('achievements'))}>
            <Trophy size={20} style={{ color: '#D4AF37' }} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Achievements</span>
          </button>
        </div>
      </div>

      {/* ─── 5. Improve Again Section ─── */}
      {improveAgainMission && (
        <div className="glass-card" style={{ border: '1px solid rgba(212, 175, 55, 0.08)', display: 'flex', gap: '14px', alignItems: 'center', marginTop: '16px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'rgba(212, 175, 55, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D4AF37'
          }}>
            <History size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>Improve Again</h4>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Revisit "{improveAgainMission.title}" to increase your stars.
            </p>
          </div>
          <button
            onClick={() => onSelectMission(improveAgainMission)}
            style={{
              background: 'none',
              border: 'none',
              color: '#D4AF37',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
