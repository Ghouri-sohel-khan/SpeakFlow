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
    if (isTierLocked(mission.difficulty)) return true;
    if (mission.id > unlockedCount) return true;
    return false;
  };

  // Get active star rating for a completed mission
  const getMissionStars = (missionId: number) => {
    return profile.completedMissions[missionId]?.stars || 0;
  };

  // Layout parameters for the winding serpentine road path
  const NODE_SPACING = 140;
  const trackWidth = 392;
  const centerX = trackWidth / 2;

  // Compute absolute layout positions for nodes
  const points = tierMissions.map((mission, idx) => {
    const indexInTier = (mission.id - 1) % 50 + 1;
    // serptentine wave offset
    const xOffset = Math.sin(indexInTier * 1.1) * 75;
    return {
      x: centerX + xOffset,
      y: idx * NODE_SPACING + 80,
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
      <div style={{ textAlign: 'center', padding: '0 16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
          Speaking Journey
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Completed: <strong style={{ color: '#D4AF37' }}>{totalCompletedCount}/150</strong> • Mastery: <strong style={{ color: '#D4AF37' }}>{totalMasteryPoints} ⭐</strong>
        </p>
      </div>

      {/* Tier Switch Tabs */}
      <div style={{
        display: 'flex',
        background: 'rgba(212, 175, 55, 0.04)',
        borderRadius: '16px',
        padding: '4px',
        margin: '0 16px 20px',
        border: '1px solid rgba(212, 175, 55, 0.1)',
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
                background: isActive ? 'linear-gradient(135deg, #D4AF37 0%, #A88A1E 100%)' : 'none',
                borderRadius: '12px',
                color: isActive ? '#0d0d12' : isLocked ? 'rgba(245, 240, 232, 0.25)' : 'rgba(245, 240, 232, 0.6)',
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
          background: 'rgba(212, 175, 55, 0.05)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          margin: '0 16px 20px',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          position: 'relative',
          zIndex: 10
        }}>
          <AlertCircle size={20} style={{ color: '#D4AF37', flexShrink: 0 }} />
          <div>
            <h4 style={{ color: '#D4AF37', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
              Level Stage Locked
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
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

      {/* Winding Map Container */}
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
                backgroundPositionY: `${(scrollTop - zone.top) * 0.18}px`,
                backgroundAttachment: 'scroll'
              }}
            >
              <div className="environment-header" style={{ top: '24px' }}>
                <div className="environment-badge">
                  <span>{zone.icon}</span>
                  <span>{zone.title}</span>
                  <span style={{ opacity: 0.3 }}>|</span>
                  <span style={{ opacity: 0.9, fontSize: '9px' }}>{zone.range}</span>
                </div>
              </div>
            </div>
          ))}

          {/* SVG Connector Paths */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            {/* Background dashed connector */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="rgba(212, 175, 55, 0.15)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="8 10"
              />
            )}
            
            {/* Active unlocked path progress */}
            {unlockedD && (
              <path
                d={unlockedD}
                fill="none"
                stroke="#D4AF37"
                strokeWidth="6"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 5px rgba(212, 175, 55, 0.6))' }}
              />
            )}
          </svg>

          {/* Serpent level nodes */}
          {points.map(({ x, y, mission, idx }) => {
            const locked = isMissionLocked(mission);
            const completed = completedIds.includes(mission.id);
            const stars = getMissionStars(mission.id);
            const isNext = mission.id === unlockedCount || (mission.id <= unlockedCount && !completed && idx === points.findIndex(p => !completedIds.includes(p.mission.id)));

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
                >
                  {locked ? (
                    <Lock size={16} />
                  ) : completed ? (
                    <Check size={24} strokeWidth={3.5} />
                  ) : (
                    <span>{mission.id}</span>
                  )}

                  {isNext && !locked && (
                    <span style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#D4AF37',
                      borderRadius: '50%',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 8px #D4AF37',
                      zIndex: 10
                    }}>
                      <Sparkles size={10} fill="#000" style={{ color: '#000' }} />
                    </span>
                  )}
                </button>

                <div className="journey-node-info">
                  <span className="journey-node-title">
                    {mission.title}
                  </span>
                  
                  {completed ? (
                    <div className="journey-node-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} style={{ color: i < stars ? '#D4AF37' : 'rgba(245, 240, 232, 0.15)', fontSize: '10px' }}>
                          ★
                        </span>
                      ))}
                    </div>
                  ) : locked ? (
                    <div className="journey-node-status" style={{ opacity: 0.5 }}>Locked</div>
                  ) : (
                    <div className="journey-node-status" style={{ color: '#D4AF37', fontWeight: 700 }}>Practice</div>
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
