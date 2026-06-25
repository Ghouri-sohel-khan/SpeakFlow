import React, { useState, useEffect } from 'react';
import { Lock, Check, Sparkles, AlertCircle } from 'lucide-react';
import type { UserProfile } from '../services/db';
import type { Mission } from '../data/missions';

// Import environment backgrounds
import bgJungle from '../assets/bg_jungle.png';
import bgDesert from '../assets/bg_desert.png';
import bgVillage from '../assets/bg_village.png';
import bgCity from '../assets/bg_city.png';

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
  const [scrollTop, setScrollTop] = useState<number>(0);

  useEffect(() => {
    const container = document.querySelector('.phone-screen-content');
    if (!container) return;
    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Helper stats
  const completedIds = Object.keys(profile.completedMissions).map(Number);
  
  // Total Beginner Completions
  const beginnerCompletedCount = missions.filter(m => m.difficulty === 'beginner' && completedIds.includes(m.id)).length;
  
  // Total Cumulative completions
  const totalCompletedCount = completedIds.length;

  // Calculate total mastery points
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
    if (isTierLocked(mission.difficulty)) return true;
    if (mission.id > unlockedCount) return true;
    return false;
  };

  // Get active star rating for a completed mission
  const getMissionStars = (missionId: number) => {
    return profile.completedMissions[missionId]?.stars || 0;
  };

  // Compact layout spacing to reduce excessive vertical empty space
  const NODE_SPACING = 100; // Reduced from 140px to 100px for tight, premium RPG look
  const trackWidth = 392;
  const centerX = trackWidth / 2;

  // Compute absolute layout positions for nodes
  const points = tierMissions.map((mission, idx) => {
    const indexInTier = (mission.id - 1) % 50 + 1;
    // Serpentine wave offset
    const xOffset = Math.sin(indexInTier * 1.15) * 65;
    return {
      x: centerX + xOffset,
      y: idx * NODE_SPACING + 70,
      mission,
      idx
    };
  });

  // Winding path SVG path string (Dashed background track)
  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const cpY1 = p0.y + (p1.y - p0.y) / 2;
      const cpY2 = p0.y + (p1.y - p0.y) / 2;
      pathD += ` C ${p0.x} ${cpY1}, ${p1.x} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  // Furthest unlocked index in the current tier
  const lastUnlockedIdx = points.reduce((acc, p, idx) => {
    if (!isMissionLocked(p.mission)) return idx;
    return acc;
  }, -1);

  // Active glowing path SVG path string (completed & unlocked progress)
  let unlockedD = "";
  if (lastUnlockedIdx >= 0 && points.length > 0) {
    unlockedD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i <= lastUnlockedIdx; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const cpY1 = p0.y + (p1.y - p0.y) / 2;
      const cpY2 = p0.y + (p1.y - p0.y) / 2;
      unlockedD += ` C ${p0.x} ${cpY1}, ${p1.x} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  // Environment zones definitions
  const zones = [
    {
      title: "Emerald Jungle",
      range: "Missions 1-5",
      icon: "🌴",
      bg: bgJungle,
      top: 0,
      height: 5 * NODE_SPACING,
    },
    {
      title: "Golden Dunes",
      range: "Missions 6-10",
      icon: "🏜️",
      bg: bgDesert,
      top: 5 * NODE_SPACING,
      height: 5 * NODE_SPACING,
    },
    {
      title: "Whisper Village",
      range: "Missions 11-15",
      icon: "🏡",
      bg: bgVillage,
      top: 10 * NODE_SPACING,
      height: 5 * NODE_SPACING,
    },
    {
      title: "SpeakFlow City",
      range: "Missions 16-50",
      icon: "🏢",
      bg: bgCity,
      top: 15 * NODE_SPACING,
      height: 35 * NODE_SPACING,
    }
  ];

  return (
    <div style={{ padding: '16px 0 0' }}>
      {/* Title & Stats Summary */}
      <div style={{ textAlign: 'center', padding: '0 16px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Manrope', color: 'var(--text-primary)' }}>
          Speaking Journey
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Completed: <strong style={{ color: 'var(--secondary)' }}>{totalCompletedCount}/150</strong> • Mastery: <strong style={{ color: 'var(--reward)' }}>{totalMasteryPoints} ★</strong>
        </p>
      </div>

      {/* Segmented Tier Switch Tabs */}
      <div style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '16px',
        padding: '4px',
        margin: '0 16px 16px',
        border: '1px solid var(--border)',
        position: 'relative',
        zIndex: 10
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
                background: isActive ? 'var(--accent-gradient)' : 'none',
                borderRadius: '12px',
                color: isActive ? 'var(--bg-deep)' : isLocked ? 'var(--text-muted)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
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
        <div className="card-secondary" style={{
          background: 'rgba(255, 92, 117, 0.04)',
          border: '1.5px solid rgba(255, 92, 117, 0.2)',
          margin: '0 16px 16px',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          position: 'relative',
          zIndex: 10
        }}>
          <AlertCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <div style={{ textAlign: 'left' }}>
            <h4 style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Stage Tier Locked
            </h4>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
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

      {/* Connected Winding Map */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
        <div 
          className="journey-tree-container" 
          style={{ 
            width: `${trackWidth}px`, 
            height: `${tierMissions.length * NODE_SPACING + 100}px`,
            position: 'relative'
          }}
        >
          {/* Environment backgrounds with scroll parallax */}
          {zones.map((zone, zIdx) => (
            <div
              key={zIdx}
              className="environment-zone"
              style={{
                top: zone.top,
                height: zone.height,
                backgroundImage: `url(${zone.bg})`,
                backgroundPositionY: `${(scrollTop - zone.top) * 0.16}px`,
                backgroundAttachment: 'scroll'
              }}
            >
              <div className="environment-header" style={{ top: '20px' }}>
                <div className="environment-badge">
                  <span>{zone.icon}</span>
                  <span>{zone.title}</span>
                  <span style={{ opacity: 0.2 }}>|</span>
                  <span style={{ opacity: 0.8, fontSize: '9px' }}>{zone.range}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Connected SVG Connector Paths */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            {/* Background dashed connector */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="6 8"
              />
            )}
            
            {/* Active unlocked path progress */}
            {unlockedD && (
              <path
                d={unlockedD}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="5"
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Serpentine RPG Level Nodes */}
          {points.map(({ x, y, mission, idx }) => {
            const locked = isMissionLocked(mission);
            const completed = completedIds.includes(mission.id);
            const stars = getMissionStars(mission.id);
            const isNext = mission.id === unlockedCount || (mission.id <= unlockedCount && !completed && idx === points.findIndex(p => !completedIds.includes(p.mission.id)));
            
            // Checkpoint: every 5th mission behaves as a milestone gateway
            const isMilestone = mission.id % 5 === 0;

            return (
              <div
                key={mission.id}
                className="journey-node-wrapper"
                style={{
                  left: x,
                  top: y,
                }}
              >
                <button
                  disabled={locked}
                  onClick={() => onSelectMission(mission)}
                  className={`journey-node ${completed ? 'completed' : locked ? 'locked' : 'unlocked'} ${isNext ? 'active-next' : ''}`}
                  style={{
                    width: isMilestone ? '64px' : '56px',
                    height: isMilestone ? '64px' : '56px',
                    borderRadius: isMilestone ? '18px' : '50%', // RPG milestone shape
                    borderWidth: '2px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {locked ? (
                    <Lock size={14} />
                  ) : completed ? (
                    <Check size={20} strokeWidth={3.5} />
                  ) : (
                    <span style={{ fontFamily: 'Manrope', fontWeight: 700 }}>{mission.id}</span>
                  )}

                  {isNext && !locked && (
                    <span style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      background: 'var(--primary)',
                      borderRadius: '50%',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-sm)',
                      zIndex: 10
                    }}>
                      <Sparkles size={8} fill="#000" style={{ color: '#000' }} />
                    </span>
                  )}
                </button>

                <div className="journey-node-info" style={{ width: '120px' }}>
                  <span className="journey-node-title" style={{ fontSize: '11px', color: locked ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {mission.title}
                  </span>
                  
                  {completed ? (
                    <div className="journey-node-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} style={{ color: i < stars ? 'var(--reward)' : 'rgba(255, 255, 255, 0.08)', fontSize: '10px' }}>
                          ★
                        </span>
                      ))}
                    </div>
                  ) : locked ? (
                    <div className="journey-node-status" style={{ opacity: 0.4, color: 'var(--text-muted)' }}>Locked</div>
                  ) : (
                    <div className="journey-node-status" style={{ color: 'var(--primary)', fontWeight: 700 }}>Practice</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default JourneyScreen;
