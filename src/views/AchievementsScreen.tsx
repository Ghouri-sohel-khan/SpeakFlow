import React, { useState, useEffect, useRef } from 'react';
import { Zap, Coins, Lock, Share2, X } from 'lucide-react';
import type { UserProfile } from '../services/db';
import { ACHIEVEMENTS } from '../data/missions';

interface AchievementsScreenProps {
  profile: UserProfile;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ profile }) => {
  const completedIds = Object.keys(profile.completedMissions).map(Number);
  
  // Calculate raw stats for evaluating progress
  const totalMissionsCompleted = completedIds.length;
  const currentStreak = profile.streak;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedAch, setSelectedAch] = useState<typeof ACHIEVEMENTS[0] | null>(null);
  const [showShareToast, setShowShareToast] = useState(false);

  // Floating gold particles background animation
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
      rotation: number;
      rotSpeed: number;
    }> = [];

    // Create gold glitter particles
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 2,
        color: `hsl(${Math.random() * 8 + 42}, 85%, ${Math.random() * 25 + 55}%)`, // golden HSL
        speedY: Math.random() * 0.8 + 0.4,
        speedX: Math.random() * 0.4 - 0.2,
        rotation: Math.random() * 360,
        rotSpeed: Math.random() * 1.5 - 0.75,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotSpeed;

        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
        // Midnight speaker helper check
        return {
          current: profile.achievements.includes('midnight_speaker') ? 1 : 0,
          percent: profile.achievements.includes('midnight_speaker') ? 100 : 0
        };
      case 'all':
        const otherEarnedCount = profile.achievements.filter(id => id !== 'grand_master').length;
        return {
          current: otherEarnedCount,
          percent: Math.min(100, (otherEarnedCount / 9) * 100)
        };
      default:
        return { current: 0, percent: 0 };
    }
  };

  const getAchievementValueSuffix = (ach: typeof ACHIEVEMENTS[0]) => {
    if (ach.id === 'grand_master') return ' / 9 earned';
    if (ach.id === 'midnight_speaker') return ' / Night Practice';
    if (ach.targetType === 'missions') return ` / ${ach.targetValue}`;
    if (ach.targetType === 'streak') return ` / ${ach.targetValue} days`;
    return '';
  };

  // Determine gold, silver, bronze gradients for metallic rendering
  const getBadgeGradient = (id: string) => {
    if (id === 'grand_master') {
      return 'linear-gradient(135deg, #FFE885 0%, #D4AF37 40%, #A88A1E 80%, #FFE885 100%)';
    }
    if (['missions_200', 'streak_30', 'gold_medalist'].includes(id)) {
      return 'linear-gradient(135deg, #FFE066 0%, #D4AF37 50%, #A88A1E 100%)'; // Gold
    }
    if (['missions_50', 'missions_100', 'midnight_speaker'].includes(id)) {
      return 'linear-gradient(135deg, #FFFFFF 0%, #B8B8B8 50%, #787878 100%)'; // Silver
    }
    return 'linear-gradient(135deg, #F0C49E 0%, #B87333 50%, #7A4215 100%)'; // Bronze
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`https://speakflow.app/trophy/${selectedAch?.id || ''}`);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  const grandMaster = ACHIEVEMENTS.find(a => a.id === 'grand_master');
  const shelf1Achievements = ACHIEVEMENTS.filter(a => ['first_mission', 'missions_10', 'missions_50', 'missions_100'].includes(a.id));
  const shelf2Achievements = ACHIEVEMENTS.filter(a => ['missions_200', 'streak_7', 'streak_30', 'midnight_speaker', 'gold_medalist'].includes(a.id));

  const renderTrophyNode = (ach: typeof ACHIEVEMENTS[0]) => {
    const isUnlocked = profile.achievements.includes(ach.id);
    const prog = getAchievementProgress(ach);

    return (
      <button
        key={ach.id}
        className="trophy-item-btn"
        onClick={() => setSelectedAch(ach)}
        style={{ width: '64px' }}
      >
        {isUnlocked ? (
          /* Unlocked Glossy Badge with shimmering effect */
          <div
            className={`shimmer-badge ${ach.id === 'grand_master' ? 'grand-master-glowing' : ''}`}
            style={{
              width: ach.id === 'grand_master' ? '68px' : '54px',
              height: ach.id === 'grand_master' ? '68px' : '54px',
              borderRadius: '50%',
              background: getBadgeGradient(ach.id),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: ach.id === 'grand_master' ? '30px' : '22px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.5), inset 0 2px 2px rgba(255,255,255,0.4)',
              border: '2px solid rgba(255, 255, 255, 0.25)',
              position: 'relative'
            }}
          >
            {ach.icon}
          </div>
        ) : (
          /* Locked silhouette badge */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(10, 10, 15, 0.9)',
                border: '1px solid rgba(212, 175, 55, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.8)',
                filter: 'brightness(0.2) contrast(1.1)',
                position: 'relative'
              }}
            >
              {ach.icon}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', borderRadius: '50%' }}>
                <Lock size={12} style={{ color: 'rgba(255,255,255,0.6)' }} />
              </div>
            </div>
            {/* Sleek inline progress bar */}
            {ach.id !== 'grand_master' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <div style={{ width: '40px', height: '3px', background: 'rgba(212, 175, 55, 0.08)', borderRadius: '10px', marginTop: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#D4AF37', width: `${prog.percent}%` }} />
                </div>
                <span style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
                  {prog.current}{getAchievementValueSuffix(ach)}
                </span>
              </div>
            )}
          </div>
        )}
        {/* Short title below shelf */}
        <span style={{
          fontSize: '9px',
          fontWeight: 700,
          color: isUnlocked ? 'var(--text-primary)' : 'var(--text-muted)',
          marginTop: '6px',
          fontFamily: 'Outfit',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '64px',
          display: 'block'
        }}>
          {ach.title}
        </span>
      </button>
    );
  };

  return (
    <div style={{ padding: '16px 0 30px', position: 'relative', minHeight: '100%' }}>
      {/* Title */}
      <div style={{ textAlign: 'center', padding: '0 16px', marginBottom: '16px', position: 'relative', zIndex: 5 }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
          Trophy Room
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Build speaking routines and collect premium metallic medals
        </p>
      </div>

      {/* Stats Summary Panel */}
      <div className="glass-card" style={{
        padding: '14px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        textAlign: 'center',
        marginBottom: '24px',
        position: 'relative',
        zIndex: 5
      }}>
        <div style={{ borderRight: '1px solid rgba(212, 175, 55, 0.1)' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#D4AF37', fontFamily: 'Outfit' }}>
            {profile.achievements.length} / {ACHIEVEMENTS.length}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unlocked Trophies</div>
        </div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#D4AF37', fontFamily: 'Outfit' }}>
            {profile.streak} Days
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Streak</div>
        </div>
      </div>

      {/* Immersive 3D virtual cabinet layout */}
      <div className="cabinet-container">
        {/* Floating particles canvas background */}
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />

        {/* Shelf 0 (Top Center) - Grand Master Milestone */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px', position: 'relative' }}>
          {grandMaster && renderTrophyNode(grandMaster)}
          
          <div className="cabinet-shelf" style={{ width: '110px', marginTop: '10px', marginBottom: '40px' }}>
            <div className="shelf-surface" />
            <div className="shelf-front" />
          </div>
        </div>

        {/* Shelf 1 (Middle Shelf) - 4 Achievements */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '70px', padding: '0 8px' }}>
            {shelf1Achievements.map(renderTrophyNode)}
          </div>
          <div className="cabinet-shelf" style={{ marginTop: '8px', marginBottom: '40px' }}>
            <div className="shelf-surface" />
            <div className="shelf-front" />
          </div>
        </div>

        {/* Shelf 2 (Bottom Shelf) - 5 Achievements */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '70px', padding: '0 4px' }}>
            {shelf2Achievements.map(renderTrophyNode)}
          </div>
          <div className="cabinet-shelf" style={{ marginTop: '8px', marginBottom: '20px' }}>
            <div className="shelf-surface" />
            <div className="shelf-front" />
          </div>
        </div>
      </div>

      {/* Click-to-Reveal Pop-up Card Modal */}
      {selectedAch && (
        <div className="modal-backdrop" onClick={() => setSelectedAch(null)}>
          <div
            className="glass-card anim-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '320px',
              padding: '24px 20px',
              border: profile.achievements.includes(selectedAch.id) ? '1px solid rgba(212, 175, 55, 0.35)' : '1px solid var(--border)',
              background: 'linear-gradient(135deg, rgba(20, 18, 28, 0.95) 0%, rgba(13, 12, 18, 0.98) 100%)',
              textAlign: 'center',
              boxShadow: '0 24px 48px rgba(0,0,0,0.85), 0 0 30px rgba(212, 175, 55, 0.1)',
              position: 'relative',
              borderRadius: '24px'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedAch(null)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <X size={14} />
            </button>

            {/* Glowing metallic badge representation */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', marginTop: '10px' }}>
              <div
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  background: profile.achievements.includes(selectedAch.id)
                    ? getBadgeGradient(selectedAch.id)
                    : 'rgba(10,10,12,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  border: '2.5px solid rgba(255,255,255,0.2)',
                  boxShadow: profile.achievements.includes(selectedAch.id)
                    ? '0 12px 24px rgba(212,175,55,0.3)'
                    : 'inset 0 4px 8px rgba(0,0,0,0.8)',
                  filter: profile.achievements.includes(selectedAch.id) ? 'none' : 'brightness(0.3)'
                }}
              >
                {selectedAch.icon}
              </div>
            </div>

            {/* Title */}
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
              {selectedAch.title}
            </h3>

            {/* Status Tag */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 16px' }}>
              <span
                className="gold-tag"
                style={{
                  fontSize: '9px',
                  background: profile.achievements.includes(selectedAch.id) ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                  color: profile.achievements.includes(selectedAch.id) ? '#D4AF37' : 'var(--text-muted)',
                  borderColor: profile.achievements.includes(selectedAch.id) ? 'rgba(212,175,55,0.22)' : 'rgba(255,255,255,0.08)'
                }}
              >
                {profile.achievements.includes(selectedAch.id) ? '🏆 Completed' : '🔒 Locked'}
              </span>
            </div>

            {/* Trophy Story (Motivational Description) */}
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 20px', padding: '0 6px' }}>
              "{selectedAch.description}"
            </p>

            {/* Rewards Display (if unlocked) */}
            {profile.achievements.includes(selectedAch.id) ? (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', background: 'rgba(212,175,55,0.04)', border: '1px dashed rgba(212,175,55,0.2)', borderRadius: '14px', padding: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Zap size={11} fill="#D4AF37" /> +{selectedAch.xpReward} XP
                </span>
                <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Coins size={11} fill="#D4AF37" /> +{selectedAch.coinReward} Coins
                </span>
              </div>
            ) : (
              /* Sleek locked progress bar in modal */
              selectedAch.id !== 'grand_master' && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    <span>Milestone Progress</span>
                    <span style={{ color: '#D4AF37', fontWeight: 700 }}>
                      {getAchievementProgress(selectedAch).current}{getAchievementValueSuffix(selectedAch)}
                    </span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(212,175,55,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#D4AF37', width: `${getAchievementProgress(selectedAch).percent}%` }} />
                  </div>
                </div>
              )
            )}

            {/* Share action button */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-premium"
                style={{ flex: 1, padding: '10px' }}
                onClick={() => setSelectedAch(null)}
              >
                Close
              </button>
              
              <button
                className="btn-secondary"
                style={{ width: '42px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onClick={handleShare}
                title="Share Achievement"
              >
                <Share2 size={15} />
              </button>
            </div>

            {/* Share toast overlay */}
            {showShareToast && (
              <div style={{
                position: 'absolute',
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(212, 175, 55, 0.95)',
                color: '#0d0d12',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '10px',
                fontWeight: 800,
                boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                pointerEvents: 'none',
                zIndex: 1000,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Copied Share Link!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementsScreen;
