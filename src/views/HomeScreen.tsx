import React from 'react';
import { Play, Mic, BarChart2, Trophy, Flame, ChevronRight, History } from 'lucide-react';
import type { UserProfile } from '../services/db';
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

  // Calculate daily missions completed today
  // We can mock this or check if they completed missions in the last 24h
  const completedTodayCount = Object.values(profile.completedMissions).filter(m => {
    // For testing simplicity, assume completed in the last few hours count as today
    return (Date.now() - m.timestamp) < 24 * 60 * 60 * 1000;
  }).length;
  const dailyGoalMax = 5;
  const goalPercentage = Math.min(100, (completedTodayCount / dailyGoalMax) * 100);
  
  // SVG Ring calculation
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPercentage / 100) * circumference;

  // Level Progression: Level = Math.floor(XP / 100) + 1
  const currentLvlNum = Math.floor(profile.xp / 100) + 1;
  const currentLvlXP = profile.xp % 100;

  // Get a list of completed missions to suggest in "Improve Again" (e.g. completed some time ago)
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

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Top Greeting Profile */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', marginBottom: '20px' }}>
        <div>
          <h4 style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500, fontSize: '13px' }}>
            {getGreeting()},
          </h4>
          <h2 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit' }}>
            {profile.username}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '20px', border: '1px solid var(--border)', color: 'var(--accent)' }}>
              {getAvatarTitle()}
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              Stage: {profile.level.charAt(0).toUpperCase() + profile.level.slice(1)}
            </span>
          </div>
        </div>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
          {profile.avatar === 'student' && '🎓'}
          {profile.avatar === 'professional' && '💼'}
          {profile.avatar === 'traveler' && '✈️'}
          {profile.avatar === 'entrepreneur' && '🚀'}
        </div>
      </div>

      {/* Daily Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', margin: '0 16px 16px' }}>
        
        {/* Goal Ring */}
        <div className="glass-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <h4 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '10px', textAlign: 'center' }}>Daily Practice</h4>
          <div className="circular-progress">
            <svg>
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--secondary)" />
                </linearGradient>
              </defs>
              <circle className="circular-bg" cx="65" cy="65" r={radius} />
              <circle
                className="circular-bar"
                cx="65"
                cy="65"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="circular-content">
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>{completedTodayCount}</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '-2px' }}>of {dailyGoalMax}</span>
            </div>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--secondary)', marginTop: '8px', fontWeight: 600 }}>
            {completedTodayCount >= dailyGoalMax ? 'Goal achieved! 🎉' : 'Keep going!'}
          </span>
        </div>

        {/* Streak & XP */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Streak Card */}
          <div className="glass-card" style={{ margin: 0, padding: '14px', flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(249, 115, 22, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f97316'
            }}>
              <Flame size={24} fill="#f97316" />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                {profile.streak} Days
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                Practice streak 🔥
              </div>
            </div>
          </div>

          {/* Level Progress */}
          <div className="glass-card" style={{ margin: 0, padding: '14px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Level {currentLvlNum}</span>
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>{profile.xp} XP</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(to right, var(--primary), var(--secondary))',
                width: `${currentLvlXP}%`,
                borderRadius: '10px',
                transition: 'width 0.6s ease'
              }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              <span>0 XP</span>
              <span>100 XP to Level {currentLvlNum + 1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Journey Card */}
      {nextMission && (
        <div className="glass-card" style={{ padding: '20px', border: '1px solid rgba(var(--primary-rgb), 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '10px', background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, textTransform: 'uppercase' }}>
                Next Mission
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '6px', color: '#fff' }}>
                {nextMission.title}
              </h3>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                Level {nextMission.id} • {nextMission.environment} • {Math.round((nextMission.word_count / nextMission.estimated_duration) * 60)} WPM Target
              </p>
            </div>
            <button
              onClick={() => onSelectMission(nextMission)}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(var(--primary-rgb), 0.3)'
              }}
            >
              <Play size={18} fill="#fff" style={{ marginLeft: '2px' }} />
            </button>
          </div>
          
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              Completed Score: {profile.completedMissions[nextMission.id] ? `${profile.completedMissions[nextMission.id].stars} ⭐` : 'Unattempted'}
            </span>
            <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>
              +{nextMission.xp} XP • +{nextMission.coins} Coins
            </span>
          </div>
        </div>
      )}

      {/* Daily Challenge Card */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(99,102,241,0.1) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.25)',
        padding: '16px',
        margin: '0 16px 16px',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🎙️</span>
            <h4 style={{ color: '#c084fc', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              Daily Speaking Challenge
            </h4>
          </div>
          {dailyChallengeCount < 20 ? (
            <span style={{ fontSize: '11px', background: 'rgba(168,85,247,0.2)', color: '#e9d5ff', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
              Challenge {dailyChallengeCount + 1}
            </span>
          ) : (
            <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
              🎉 Custom Mode Unlocked
            </span>
          )}
        </div>

        <p style={{ fontSize: '14px', color: '#e9d5ff', fontWeight: 500, lineHeight: '1.4', margin: 0 }}>
          "{getDailyChallengeForDay(dayOffset).prompt}"
        </p>

        {dailyChallengeCount >= 20 ? (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: '#e9d5ff', opacity: 0.8, fontWeight: 600 }}>
              Select Challenge Duration:
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
                      border: isSelected ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.08)',
                      background: isSelected ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {opt === 'custom' ? 'Custom Slider' : `${opt}s`}
                  </button>
                );
              })}
            </div>
            
            {selectedDurationOption === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#e9d5ff' }}>
                  <span>Duration Limit:</span>
                  <strong style={{ color: '#c084fc' }}>{customSliderDuration} seconds</strong>
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
                    accentColor: '#c084fc',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
                  <span>30s</span>
                  <span>300s (5m)</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
            🎯 Complete 20 challenges to unlock Custom Speaking Mode! Progress: <strong>{dailyChallengeCount} / 20</strong>
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
            {dailyChallengeCount >= 20 ? (
              <>Selected Limit: <strong>{selectedDurationOption === 'custom' ? customSliderDuration : selectedDurationOption}s</strong></>
            ) : (
              <>Limit: <strong>{currentLimit.seconds}s practice</strong></>
            )}
          </span>
          <button
            className="btn-premium"
            style={{
              padding: '8px 18px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(168,85,247,0.2)'
            }}
            onClick={() => {
              const dur = dailyChallengeCount >= 20
                ? (selectedDurationOption === 'custom' ? customSliderDuration : (selectedDurationOption as number))
                : currentLimit.seconds;
              onSelectDailyChallenge(dur);
            }}
          >
            Start Challenge
          </button>
        </div>
      </div>

      {/* Quick Actions grid */}
      <div style={{ padding: '0 16px', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Quick Workouts
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button className="btn-secondary" style={{ padding: '12px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }} onClick={() => onNavigate('journey')}>
            <span style={{ fontSize: '20px' }}>🗺️</span>
            <span style={{ fontSize: '12px' }}>Explore Stages</span>
          </button>
          <button className="btn-secondary" style={{ padding: '12px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }} onClick={() => onNavigate('diary')}>
            <Mic size={20} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '12px' }}>Voice Diary</span>
          </button>
          <button className="btn-secondary" style={{ padding: '12px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }} onClick={() => onNavigate('progress')}>
            <BarChart2 size={20} style={{ color: 'var(--secondary)' }} />
            <span style={{ fontSize: '12px' }}>Report & Audio</span>
          </button>
          <button className="btn-secondary" style={{ padding: '12px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }} onClick={() => onNavigate('achievements')}>
            <Trophy size={20} style={{ color: '#fbbf24' }} />
            <span style={{ fontSize: '12px' }}>Achievements</span>
          </button>
        </div>
      </div>

      {/* Improve Again Section */}
      {improveAgainMission && (
        <div className="glass-card" style={{ border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <History size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>Improve Again</h4>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              You completed "{improveAgainMission.title}" recently. Let's practice it to increase your stars!
            </p>
          </div>
          <button
            onClick={() => onSelectMission(improveAgainMission)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
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
