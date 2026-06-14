import React from 'react';
import { Zap, Coins, CheckCircle, Lock } from 'lucide-react';
import type { UserProfile } from '../services/db';
import { ACHIEVEMENTS } from '../data/missions';

interface AchievementsScreenProps {
  profile: UserProfile;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ profile }) => {
  const completedIds = Object.keys(profile.completedMissions).map(Number);
  
  // Calculate raw stats for evaluating achievements
  const totalMissionsCompleted = completedIds.length;
  const currentStreak = profile.streak;
  
  // Estimate speaking time in seconds: let's base it on actual completed missions' average durations
  // (We'll assume completed missions took their expected target durations as a baseline, or count it from achievements)
  const averageMissionDuration = 35; // average duration in seconds
  const totalTimeSpoken = totalMissionsCompleted * averageMissionDuration; 

  const getAchievementProgress = (ach: typeof ACHIEVEMENTS[0]) => {
    switch (ach.targetType) {
      case 'missions':
        return {
          current: totalMissionsCompleted,
          percent: Math.min(100, (totalMissionsCompleted / ach.targetValue) * 100)
        };
      case 'streak':
        return {
          current: currentStreak,
          percent: Math.min(100, (currentStreak / ach.targetValue) * 100)
        };
      case 'time':
        return {
          current: totalTimeSpoken,
          percent: Math.min(100, (totalTimeSpoken / ach.targetValue) * 100)
        };
      case 'level':
        let currentLvlVal = 1;
        if (profile.level === 'intermediate') currentLvlVal = 2;
        if (profile.level === 'advanced') currentLvlVal = 3;
        
        return {
          current: currentLvlVal,
          percent: currentLvlVal >= ach.targetValue ? 100 : 0
        };
      default:
        return { current: 0, percent: 0 };
    }
  };

  const getAchievementValueSuffix = (type: string, targetVal: number) => {
    if (type === 'missions') return ` / ${targetVal} missions`;
    if (type === 'streak') return ` / ${targetVal} days`;
    if (type === 'time') return ` / ${Math.round(targetVal / 60)} min`;
    return '';
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ textAlign: 'center', padding: '0 16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Outfit', color: '#fff' }}>
          Trophy Room
        </h2>
        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
          Earn badges by building speaking habits and completing levels
        </p>
      </div>

      {/* Stats Summary Panel */}
      <div className="glass-card" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24', fontFamily: 'Outfit' }}>
            {profile.achievements.length} / {ACHIEVEMENTS.length}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Badges Unlocked</div>
        </div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--secondary)', fontFamily: 'Outfit' }}>
            {profile.streak} Days
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Longest Streak</div>
        </div>
      </div>

      {/* Badges Grid list */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = profile.achievements.includes(ach.id);
          const prog = getAchievementProgress(ach);
          
          return (
            <div
              key={ach.id}
              className="glass-card"
              style={{
                margin: 0,
                padding: '14px 16px',
                border: isUnlocked ? '1px solid rgba(251, 191, 36, 0.25)' : '1px solid var(--border)',
                background: isUnlocked
                  ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(17, 24, 39, 0.7) 100%)'
                  : 'rgba(17, 24, 39, 0.4)',
                opacity: isUnlocked ? 1 : 0.8,
                display: 'flex',
                gap: '14px',
                alignItems: 'center'
              }}
            >
              {/* Badge Icon */}
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: isUnlocked ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : 'rgba(255,255,255,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                flexShrink: 0,
                boxShadow: isUnlocked ? '0 6px 15px rgba(251, 191, 36, 0.2)' : '',
                filter: isUnlocked ? 'none' : 'grayscale(100%)',
                border: isUnlocked ? '2px solid #fff' : '1px dashed rgba(255,255,255,0.1)'
              }}>
                {isUnlocked ? ach.icon : <Lock size={20} style={{ color: 'rgba(255,255,255,0.2)' }} />}
              </div>

              {/* Badge info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14px', color: '#fff', fontWeight: 700, fontFamily: 'Outfit' }}>
                    {ach.title}
                  </h4>
                  {isUnlocked ? (
                    <CheckCircle size={16} style={{ color: 'var(--secondary)' }} />
                  ) : (
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Locked</span>
                  )}
                </div>
                
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px', lineHeight: '1.3' }}>
                  {ach.description}
                </p>

                {/* Progress bar */}
                {!isUnlocked && ach.targetType !== 'level' && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px' }}>
                      <span>Progress</span>
                      <span>{prog.current}{getAchievementValueSuffix(ach.targetType, ach.targetValue)}</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        background: 'var(--primary)',
                        width: `${prog.percent}%`,
                        borderRadius: '10px'
                      }}></div>
                    </div>
                  </div>
                )}

                {/* Unlocked Rewards Display */}
                {isUnlocked && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '9px', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '1px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Zap size={8} fill="#10b981" /> +{ach.xpReward} XP
                    </span>
                    <span style={{ fontSize: '9px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', padding: '1px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Coins size={8} fill="#fbbf24" /> +{ach.coinReward} Coins
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default AchievementsScreen;
