import React, { useState } from 'react';
import { Lock, Check, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import type { UserProfile } from '../services/db';
import type { Mission } from '../data/missions';

interface JourneyScreenProps {
  profile: UserProfile;
  missions: Mission[];
  unlockedCount: number;
  onSelectMission: (mission: Mission) => void;
}

export const JourneyScreen: React.FC<JourneyScreenProps> = ({
  profile,
  missions,
  unlockedCount,
  onSelectMission
}) => {
  const [selectedTab, setSelectedTab] = useState<'beginner' | 'intermediate' | 'advanced'>(profile.level);

  // Helper stats
  const completedIds = Object.keys(profile.completedMissions).map(Number);
  
  // Total Beginner Completions
  const beginnerCompletedCount = missions.filter(m => m.difficulty === 'beginner' && completedIds.includes(m.id)).length;
  
  // Total Intermediate/Advanced completions
  const totalCompletedCount = completedIds.length;

  // Calculate total mastery points (sum of stars)
  const totalMasteryPoints = Object.values(profile.completedMissions).reduce((sum, item) => sum + item.stars, 0);

  // Level Lock Requirements
  const intermediateUnlocked = beginnerCompletedCount >= 50 && totalMasteryPoints >= 180;
  const advancedUnlocked = totalCompletedCount >= 100 && totalMasteryPoints >= 400;

  // Check if a specific tier is locked
  const isTierLocked = (tier: 'beginner' | 'intermediate' | 'advanced') => {
    if (tier === 'beginner') return false;
    if (tier === 'intermediate') return !intermediateUnlocked;
    return !advancedUnlocked;
  };

  // Filter missions for selected tier
  const tierMissions = missions.filter(m => m.difficulty === selectedTab);

  // Determine if a mission node is locked
  const isMissionLocked = (mission: Mission) => {
    // 1. Check if the entire level tier is locked
    if (isTierLocked(mission.difficulty)) return true;
    
    // 2. Check if daily unlock count limits this mission
    if (mission.id > unlockedCount) return true;

    return false;
  };

  // Get active star rating for a completed mission
  const getMissionStars = (missionId: number) => {
    return profile.completedMissions[missionId]?.stars || 0;
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ textAlign: 'center', padding: '0 16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Outfit', color: '#fff' }}>
          Speaking Journey
        </h2>
        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
          Completed: <strong>{totalCompletedCount}/150</strong> • Mastery Points: <strong>{totalMasteryPoints} ⭐</strong>
        </p>
      </div>

      {/* Tier Switch Tabs */}
      <div style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.04)',
        borderRadius: '16px',
        padding: '4px',
        margin: '0 16px 20px',
        border: '1px solid var(--border)'
      }}>
        {(['beginner', 'intermediate', 'advanced'] as const).map((tier) => {
          const isLocked = isTierLocked(tier);
          const isActive = selectedTab === tier;
          
          return (
            <button
              key={tier}
              onClick={() => setSelectedTab(tier)}
              style={{
                flex: 1,
                padding: '10px 4px',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'none',
                borderRadius: '12px',
                color: isActive ? '#fff' : isLocked ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.3s ease'
              }}
            >
              {isLocked && <Lock size={12} />}
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Tier Locked Status Card */}
      {isTierLocked(selectedTab) && (
        <div className="glass-card" style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          margin: '0 16px 20px',
          padding: '16px',
          display: 'flex',
          gap: '12px'
        }}>
          <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div>
            <h4 style={{ color: '#ef4444', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
              Level Stage Locked
            </h4>
            <p style={{ fontSize: '12px', color: '#fca5a5', marginTop: '4px', lineHeight: '1.4' }}>
              {selectedTab === 'intermediate' ? (
                <>
                  Intermediate unlocks after completing <strong>50 Beginner Missions</strong> (Currently: <strong>{beginnerCompletedCount}/50</strong>) AND earning <strong>180 Mastery Points</strong> (Currently: <strong>{totalMasteryPoints}/180</strong>).
                </>
              ) : (
                <>
                  Advanced unlocks after completing <strong>100 cumulative missions</strong> (Currently: <strong>{totalCompletedCount}/100</strong>) AND earning <strong>400 Mastery Points</strong> (Currently: <strong>{totalMasteryPoints}/400</strong>).
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Journey Pathway Nodes */}
      <div className="journey-tree-container">
        {tierMissions.map((mission, index) => {
          const locked = isMissionLocked(mission);
          const completed = completedIds.includes(mission.id);
          const stars = getMissionStars(mission.id);
          const isNext = mission.id === unlockedCount || (mission.id <= unlockedCount && !completed && index === tierMissions.findIndex(m => !completedIds.includes(m.id)));
          
          return (
            <div key={mission.id} className="journey-node-wrapper">
              {/* Connector line to the next node */}
              {index < tierMissions.length - 1 && (
                <div className={`journey-connector ${completed ? 'active' : ''}`} />
              )}

              {/* Node Circle */}
              <button
                disabled={locked}
                onClick={() => onSelectMission(mission)}
                className={`journey-node ${completed ? 'completed' : locked ? 'locked' : 'unlocked'}`}
                style={{
                  transform: isNext ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: isNext ? '0 0 15px var(--accent)' : ''
                }}
              >
                {locked ? (
                  <Lock size={20} style={{ color: 'rgba(255,255,255,0.4)' }} />
                ) : completed ? (
                  <Check size={26} strokeWidth={3} style={{ color: '#fff' }} />
                ) : (
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                    {mission.id}
                  </span>
                )}

                {/* Floating highlight for "Next" active node */}
                {isNext && !locked && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#fbbf24',
                    borderRadius: '50%',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Sparkles size={10} fill="#000" style={{ color: '#000' }} />
                  </span>
                )}
              </button>

              {/* Node Information Card */}
              <div style={{ marginTop: '10px', textAlign: 'center', maxWidth: '180px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af' }}>
                  {mission.title}
                </span>
                
                {completed ? (
                  <div className="journey-node-stars" style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} style={{ color: i < stars ? '#fbbf24' : 'rgba(255,255,255,0.15)', fontSize: '12px' }}>
                        ⭐
                      </span>
                    ))}
                  </div>
                ) : locked ? (
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                    Locked
                  </div>
                ) : (
                  <div style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <BookOpen size={10} /> Practice
                  </div>
                )}

                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>
                  {mission.environment}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default JourneyScreen;
