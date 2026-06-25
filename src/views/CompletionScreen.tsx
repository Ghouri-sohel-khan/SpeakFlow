import React, { useEffect, useState } from 'react';
import { Award, Zap, Coins, Volume2, RotateCcw, Home, Play, Pause } from 'lucide-react';
import type { Mission } from '../data/missions';
import { generateMissions, getDailyChallengeForDay, ACHIEVEMENTS } from '../data/missions';
import { dbService } from '../services/db';

interface CompletionScreenProps {
  mission: Mission;
  stats: {
    duration: number;
    wordsRead: number;
    wpm: number;
    stars: number;
    completionRate: number;
    recordingId: string;
  };
  onClose: () => void;
  onRetry: () => void;
  onStartMission: (mission: Mission) => void;
  dailyChallengeCount: number;
  unlockedCount: number;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({
  mission,
  stats,
  onClose,
  onRetry,
  onStartMission,
  dailyChallengeCount,
  unlockedCount
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // States for dynamic data & history comparison
  const [profile] = useState(() => dbService.getProfile());
  const [allMissions] = useState(() => generateMissions());
  const [prevAttempt, setPrevAttempt] = useState<{
    completionRate: number;
    wpm: number;
    duration: number;
  } | null>(null);

  // Load recording blob and fetch previous attempt for comparison
  useEffect(() => {
    const loadData = async () => {
      try {
        const recs = await dbService.getRecordings();
        const activeRec = recs.find(r => r.id === stats.recordingId);
        if (activeRec && activeRec.audioBlob) {
          const url = URL.createObjectURL(activeRec.audioBlob);
          setAudioUrl(url);
        }

        // Filter all recordings for this mission and sort descending
        const missionRecs = recs
          .filter(r => r.missionId === mission.id)
          .sort((a, b) => b.timestamp - a.timestamp);

        // If there are at least two attempts, missionRecs[1] is the previous attempt
        if (missionRecs.length > 1) {
          const prev = missionRecs[1];
          setPrevAttempt({
            completionRate: prev.completionRate,
            wpm: prev.wpm,
            duration: prev.duration
          });
        }
      } catch (err) {
        console.error('Failed to load recording audio or comparisons', err);
      }
    };
    loadData();

    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [stats.recordingId, mission.id]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
  };

  // Determine Mastery Rank Description
  const getMasteryLabel = (stars: number) => {
    switch (stars) {
      case 5: return 'Master Level Achieved';
      case 4: return 'Expert Level Achieved';
      case 3: return 'Excellent Level Achieved';
      case 2: return 'Good Level Achieved';
      default: return 'Completed';
    }
  };

  // 1. Calculate Level Tier Progress metrics
  const diff = mission.difficulty;
  const minId = diff === 'beginner' ? 1 : diff === 'intermediate' ? 51 : 101;
  const maxId = diff === 'beginner' ? 50 : diff === 'intermediate' ? 100 : 150;

  // Stars earned in current tier
  const tierStars = Object.entries(profile.completedMissions).filter(([id]) => {
    const numId = Number(id);
    return numId >= minId && numId <= maxId;
  }).reduce((sum, [_, data]) => sum + data.stars, 0);

  // 2. Smart Continue System Priority checks
  const nextRecommendedMission = React.useMemo(() => {
    // Priority 1: Next Journey Mission (ID + 1)
    const nextMission = allMissions.find(m => m.id === mission.id + 1);
    if (nextMission) {
      return nextMission;
    }

    // Priority 2: Daily Challenge
    const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(profile.startDate).getTime()) / (1000 * 60 * 60 * 24)));
    const dc = getDailyChallengeForDay(elapsedDays);
    const dcMission: Mission = {
      id: 9999,
      difficulty: profile.level,
      title: 'Daily Challenge',
      category: 'Daily Challenge',
      type: 'challenge',
      estimated_duration: dc.duration,
      word_count: dc.prompt.split(/\s+/).filter(w => w.length > 0).length,
      xp: dc.xp,
      coins: dc.coins,
      environment: 'Daily Challenge Arena',
      content: dc.prompt,
      variations: []
    };
    if (!profile.completedMissions[9999]) {
      return dcMission;
    }

    // Priority 3: Revisit Mission (previously completed mission with < 5 stars)
    const revisitId = Object.entries(profile.completedMissions)
      .find(([id, data]) => Number(id) !== 9999 && data.stars < 5)?.[0];
    if (revisitId) {
      const rm = allMissions.find(m => m.id === Number(revisitId));
      if (rm) return rm;
    }

    // Fallback: replay current mission
    return mission;
  }, [allMissions, mission, profile]);

  // Compute session-specific achievements
  const newlyUnlockedAchievements = React.useMemo(() => {
    const list: typeof ACHIEVEMENTS = [];
    const completedCount = Object.keys(profile.completedMissions).length;

    if (completedCount === 1 && profile.achievements.includes('first_mission')) {
      const ach = ACHIEVEMENTS.find(a => a.id === 'first_mission');
      if (ach) list.push(ach);
    }
    if (completedCount === 10 && profile.achievements.includes('missions_10')) {
      const ach = ACHIEVEMENTS.find(a => a.id === 'missions_10');
      if (ach) list.push(ach);
    }
    if (completedCount === 50 && profile.achievements.includes('missions_50')) {
      const ach = ACHIEVEMENTS.find(a => a.id === 'missions_50');
      if (ach) list.push(ach);
    }
    if (completedCount === 100 && profile.achievements.includes('missions_100')) {
      const ach = ACHIEVEMENTS.find(a => a.id === 'missions_100');
      if (ach) list.push(ach);
    }
    if (profile.level === 'intermediate' && profile.achievements.includes('level_intermediate')) {
      const beginnerMissions = allMissions.filter(m => m.difficulty === 'beginner');
      const beginnerComps = beginnerMissions.filter(m => profile.completedMissions[m.id]);
      const lastBeginnerCompTime = beginnerComps.length > 0 
        ? Math.max(...beginnerComps.map(m => profile.completedMissions[m.id].timestamp))
        : 0;
      if (Date.now() - lastBeginnerCompTime < 10000) {
        const ach = ACHIEVEMENTS.find(a => a.id === 'level_intermediate');
        if (ach) list.push(ach);
      }
    }
    if (profile.level === 'advanced' && profile.achievements.includes('level_advanced')) {
      const lastCompTime = Math.max(...Object.values(profile.completedMissions).map(m => m.timestamp));
      if (Date.now() - lastCompTime < 10000) {
        const ach = ACHIEVEMENTS.find(a => a.id === 'level_advanced');
        if (ach) list.push(ach);
      }
    }
    if (profile.streak === 7 && profile.achievements.includes('streak_7')) {
      const lastCompTime = Math.max(...Object.values(profile.completedMissions).map(m => m.timestamp));
      if (Date.now() - lastCompTime < 10000) {
        const ach = ACHIEVEMENTS.find(a => a.id === 'streak_7');
        if (ach) list.push(ach);
      }
    }
    if (profile.streak === 30 && profile.achievements.includes('streak_30')) {
      const lastCompTime = Math.max(...Object.values(profile.completedMissions).map(m => m.timestamp));
      if (Date.now() - lastCompTime < 10000) {
        const ach = ACHIEVEMENTS.find(a => a.id === 'streak_30');
        if (ach) list.push(ach);
      }
    }

    return list;
  }, [profile, allMissions]);

  // Validate and clamp stats based on difficulty level
  const validatedStats = React.useMemo(() => {
    const level = mission.difficulty;
    
    let accuracy = stats.completionRate;
    if (stats.stars >= 3 && accuracy < 50) {
      accuracy = 75;
    }
    accuracy = Math.max(50, Math.min(100, accuracy));

    let duration = stats.duration;
    if (level === 'beginner') {
      duration = Math.max(20, Math.min(60, duration));
    } else if (level === 'intermediate') {
      duration = Math.max(25, Math.min(90, duration));
    } else {
      duration = Math.max(30, Math.min(120, duration));
    }

    const totalWords = mission.content.split(/\s+/).filter(w => w.length > 0).length;
    let wordsRead = Math.round(totalWords * (accuracy / 100));
    wordsRead = Math.max(1, Math.min(totalWords, wordsRead));

    let wpm = Math.round((wordsRead / duration) * 60);
    if (level === 'beginner') {
      wpm = Math.max(60, Math.min(140, wpm));
    } else if (level === 'intermediate') {
      wpm = Math.max(80, Math.min(180, wpm));
    } else {
      wpm = Math.max(100, Math.min(240, wpm));
    }

    const completionTime = duration + 3;

    return {
      accuracy,
      duration,
      wordsRead,
      wpm,
      completionTime,
      stars: stats.stars
    };
  }, [stats, mission]);

  // Validate and clamp previous attempt stats for comparative sanity
  const validatedPrevAttempt = React.useMemo(() => {
    if (!prevAttempt) return null;
    const level = mission.difficulty;
    
    let accuracy = prevAttempt.completionRate;
    accuracy = Math.max(50, Math.min(100, accuracy));

    let duration = prevAttempt.duration;
    if (level === 'beginner') {
      duration = Math.max(20, Math.min(60, duration));
    } else if (level === 'intermediate') {
      duration = Math.max(25, Math.min(90, duration));
    } else {
      duration = Math.max(30, Math.min(120, duration));
    }

    const totalWords = mission.content.split(/\s+/).filter(w => w.length > 0).length;
    let wordsRead = Math.round(totalWords * (accuracy / 100));
    wordsRead = Math.max(1, Math.min(totalWords, wordsRead));

    let wpm = Math.round((wordsRead / duration) * 60);
    if (level === 'beginner') {
      wpm = Math.max(60, Math.min(140, wpm));
    } else if (level === 'intermediate') {
      wpm = Math.max(80, Math.min(180, wpm));
    } else {
      wpm = Math.max(100, Math.min(240, wpm));
    }

    return {
      accuracy,
      duration,
      wpm
    };
  }, [prevAttempt, mission]);

  // Compute practice improvements using validated stats
  const hasAccuracyImprovement = validatedPrevAttempt && validatedStats.accuracy > validatedPrevAttempt.accuracy;
  const hasSpeedImprovement = validatedPrevAttempt && validatedStats.wpm > validatedPrevAttempt.wpm;
  const hasTimeImprovement = validatedPrevAttempt && validatedStats.duration < validatedPrevAttempt.duration;
  const hasAnyImprovement = validatedPrevAttempt && (hasAccuracyImprovement || hasSpeedImprovement || hasTimeImprovement);

  // Compute Next Mission status
  const isNextMissionAvailable = React.useMemo(() => {
    if (!nextRecommendedMission) return false;
    if (nextRecommendedMission.id === 9999) return true; // Daily challenge
    const completedIds = Object.keys(profile.completedMissions).map(Number);
    return nextRecommendedMission.id <= unlockedCount || completedIds.includes(nextRecommendedMission.id);
  }, [nextRecommendedMission, unlockedCount, profile.completedMissions]);

  // Mastery progression milestones
  const milestoneProgress = tierStars % 10;
  const pointsRemaining = 10 - milestoneProgress;
  const milestonePercent = Math.min(100, Math.round((milestoneProgress / 10) * 100));

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-gradient)',
      position: 'relative'
    }}>
      {/* Dynamic Style injection for premium load animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUpIn {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scalePop {
          0% { transform: scale(0.85); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes progressFill {
          from { width: 0%; }
          to { width: ${milestonePercent}%; }
        }
        .anim-slide-up {
          animation: slideUpIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-pop {
          animation: scalePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .anim-progress {
          animation: progressFill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      ` }} />

      {/* STICKY HEADER (Reward Pills + Mission Name) */}
      <div style={{
        flexShrink: 0,
        textAlign: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(11, 10, 18, 0.75)',
        backdropFilter: 'blur(12px)',
        zIndex: 10
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(67, 217, 163, 0.1)', border: '1px solid rgba(67, 217, 163, 0.2)', padding: '4px 10px', borderRadius: '20px', marginBottom: '8px' }} className="anim-pop">
          <Award size={14} style={{ color: 'var(--success)' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Mission Complete
          </span>
        </div>
        
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Manrope', margin: '0 0 6px' }}>
          {mission.title}
        </h3>

        {/* Dynamic Rewards pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(244, 201, 93, 0.08)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(244, 201, 93, 0.12)' }}>
            <Zap size={11} style={{ color: 'var(--secondary)' }} fill="var(--secondary)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>+{mission.xp} XP</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(244, 201, 93, 0.08)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(244, 201, 93, 0.12)' }}>
            <Coins size={11} style={{ color: 'var(--secondary)' }} fill="var(--secondary)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>+{mission.coins} Coins</span>
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minHeight: '100%',
          justifyContent: 'space-between'
        }}>
          {/* Custom Speaking Mode celebration banner */}
          {mission.id === 9999 && dailyChallengeCount === 20 && (
            <div className="glass-card anim-slide-up" style={{
              padding: '16px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
              border: '2px solid #10b981',
              borderRadius: '16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              margin: 0
            }}>
              <span style={{ fontSize: '32px', animation: 'bounce-nav 1s infinite' }}>🔓</span>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', fontFamily: 'Manrope', margin: 0 }}>
                Custom Speaking Mode Unlocked!
              </h4>
              <p style={{ fontSize: '12px', color: '#e2e8f0', margin: 0, lineHeight: '1.4' }}>
                Congratulations! You have completed 20 Daily Challenges. You can now select custom challenge durations from 30s to 300s!
              </p>
            </div>
          )}

          {/* SECTION 1: REDESIGNED MASTERY CARD */}
          <div className="card-secondary anim-slide-up" style={{
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            margin: 0,
            borderRadius: '20px',
            gap: '12px',
            textAlign: 'center',
            flexGrow: 1
          }}>
            {/* Star Rating of current attempt */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '28px',
                    color: i < validatedStats.stars ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  ★
                </span>
              ))}
            </div>

            <div>
              <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Manrope', margin: 0 }}>
                {getMasteryLabel(validatedStats.stars)}
              </h4>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Mastery Points: <strong style={{ color: 'var(--secondary)', fontSize: '15px' }}>{tierStars}</strong>
              </span>
            </div>

            <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <span>Progress to Next Star</span>
                <span style={{ color: 'var(--text-primary)' }}>{milestoneProgress} / 10 Points</span>
              </div>

              {/* Custom Milestone Progress Bar */}
              <div style={{ height: '10px', background: 'rgba(244, 201, 93, 0.08)', borderRadius: '5px', overflow: 'hidden' }}>
                <div className="anim-progress" style={{
                  height: '100%',
                  background: 'var(--reward-gradient)',
                  borderRadius: '5px'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', fontWeight: 700, color: 'var(--secondary)' }}>
                <span>{pointsRemaining} Points Remaining</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: PRACTICE IMPROVEMENT */}
          <div className="glass-card anim-slide-up" style={{ padding: '16px 20px', margin: 0, borderRadius: '20px', flexGrow: 1 }}>
            {!validatedPrevAttempt ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Practice Improvement
                </h4>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: '1.4' }}>
                  Complete this mission again to track your progress.
                </p>
              </div>
            ) : !hasAnyImprovement ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#e0f2fe', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  No Improvement Yet
                </h4>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: '1.4' }}>
                  Keep practicing to improve your score.
                </p>
              </div>
            ) : (
              <div>
                <h4 style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontWeight: 700 }}>
                  Practice Improvement
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Accuracy */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Accuracy</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>
                        {validatedPrevAttempt.accuracy}% → {validatedStats.accuracy}%
                      </span>
                      {validatedStats.accuracy - validatedPrevAttempt.accuracy > 0 ? (
                        <span style={{ fontSize: '11px', background: 'rgba(67, 217, 163, 0.15)', color: 'var(--success)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          +{(validatedStats.accuracy - validatedPrevAttempt.accuracy)}%
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                          {(validatedStats.accuracy - validatedPrevAttempt.accuracy)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reading Speed */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Reading Speed</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>
                        {validatedPrevAttempt.wpm} → {validatedStats.wpm} WPM
                      </span>
                      {validatedStats.wpm - validatedPrevAttempt.wpm > 0 ? (
                        <span style={{ fontSize: '11px', background: 'rgba(67, 217, 163, 0.15)', color: 'var(--success)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          +{(validatedStats.wpm - validatedPrevAttempt.wpm)} WPM
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                          {(validatedStats.wpm - validatedPrevAttempt.wpm)} WPM
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Speaking Time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Speaking Time</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>
                        {validatedPrevAttempt.duration}s → {validatedStats.duration}s
                      </span>
                      {validatedPrevAttempt.duration - validatedStats.duration > 0 ? (
                        <span style={{ fontSize: '11px', background: 'rgba(67, 217, 163, 0.15)', color: 'var(--success)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          Improved by {validatedPrevAttempt.duration - validatedStats.duration} seconds
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                          {validatedStats.duration - validatedPrevAttempt.duration}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: PERFORMANCE METRICS */}
          <div className="glass-card anim-slide-up" style={{
            padding: '20px',
            margin: 0,
            borderRadius: '20px',
            flexGrow: 1.5,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <h4 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '12px', fontWeight: 700 }}>
              Performance Metrics
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {/* Accuracy */}
              <div style={{
                background: 'rgba(67, 217, 163, 0.03)',
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--success)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '80px',
                boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Accuracy</span>
                <strong style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)', marginTop: '4px', fontFamily: 'Manrope' }}>
                  {validatedStats.accuracy}%
                </strong>
              </div>

              {/* Reading Speed */}
              <div style={{
                background: 'rgba(216, 139, 160, 0.03)',
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--primary)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '80px',
                boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Reading Speed</span>
                <strong style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px', fontFamily: 'Manrope' }}>
                  {validatedStats.wpm} WPM
                </strong>
              </div>

              {/* Speaking Time */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--border-strong)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '80px',
                boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Speaking Time</span>
                <strong style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'Manrope' }}>
                  {validatedStats.duration} sec
                </strong>
              </div>

              {/* Words Read */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--border-strong)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '80px',
                boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Words Read</span>
                <strong style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'Manrope' }}>
                  {validatedStats.wordsRead}
                </strong>
              </div>

              {/* Completion Time */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--border-strong)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '80px',
                boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Completion Time</span>
                <strong style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'Manrope' }}>
                  {validatedStats.completionTime} sec
                </strong>
              </div>

              {/* Mastery Points */}
              <div style={{
                background: 'rgba(244, 201, 93, 0.03)',
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--secondary)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '80px',
                boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Mastery Points</span>
                <strong style={{ fontSize: '18px', fontWeight: 700, color: 'var(--secondary)', marginTop: '4px', fontFamily: 'Manrope' }}>
                  {validatedStats.stars}
                </strong>
              </div>
            </div>
          </div>

          {/* SECTION 4: ACHIEVEMENTS */}
          {newlyUnlockedAchievements.length > 0 && (
            <div className="glass-card anim-slide-up" style={{ padding: '16px 20px', margin: 0, borderRadius: '20px', flexGrow: 1 }}>
              <h4 style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '12px', fontWeight: 700 }}>
                Achievements Unlocked!
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {newlyUnlockedAchievements.map((ach) => (
                  <div
                    key={ach.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'rgba(244, 201, 93, 0.08)',
                      border: '1px solid rgba(244, 201, 93, 0.2)',
                      borderRadius: '16px',
                      padding: '12px'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>🏅</span>
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{ach.title}</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{ach.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: UP NEXT */}
          <div className="card-secondary anim-slide-up" style={{
            padding: '16px 20px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            margin: 0,
            borderRadius: '20px',
            flexGrow: 1
          }}>
            <h4 style={{ fontSize: '11px', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontWeight: 800 }}>
              Up Next
            </h4>

            {isNextMissionAvailable && nextRecommendedMission ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <h5 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', fontFamily: 'Manrope' }}>
                    {nextRecommendedMission.id === 9999 ? 'Daily Challenge' : nextRecommendedMission.title}
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    <span>Duration: {nextRecommendedMission.estimated_duration} Seconds</span>
                    <span>Reward: +{nextRecommendedMission.xp} XP</span>
                    <span>
                      Difficulty:{' '}
                      {nextRecommendedMission.difficulty === 'beginner'
                        ? 'Easy'
                        : nextRecommendedMission.difficulty === 'intermediate'
                        ? 'Medium'
                        : 'Hard'}
                    </span>
                  </div>
                </div>
                <button
                  className="btn-premium"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    height: '38px',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => onStartMission(nextRecommendedMission)}
                >
                  Start Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <h5 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 6px', fontFamily: 'Manrope' }}>
                    New Journeys
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    <span>Duration: Unlock Tomorrow</span>
                    <span>Reward: +10 XP</span>
                    <span>Difficulty: Locked</span>
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  disabled
                  style={{
                    padding: '10px 16px',
                    borderRadius: '14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    height: '38px',
                    whiteSpace: 'nowrap',
                    background: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.3)',
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🔒 Locked
                </button>
              </div>
            )}
          </div>

          {/* SECTION 6: PLAYBACK VOICE ATTEMPT RECORDING */}
          {audioUrl && (
            <div className="glass-card anim-slide-up" style={{ margin: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.015)', borderRadius: '16px' }}>
              <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnded} style={{ display: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500 }}>Listen to attempt recording</span>
              </div>
              <button
                onClick={toggleAudio}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: isPlayingAudio ? 'var(--danger)' : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {isPlayingAudio ? (
                  <>
                    <Pause size={10} fill="#fff" /> Pause
                  </>
                ) : (
                  <>
                    <Play size={10} fill="#fff" /> Playback
                  </>
                )}
              </button>
            </div>
          )}

          {/* SECTION 7: PRIMARY AND SECONDARY CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            {/* Primary CTA Button: Continue Journey */}
            {isNextMissionAvailable && nextRecommendedMission && (
              <button
                className="btn-premium anim-pop"
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: 700,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onClick={() => onStartMission(nextRecommendedMission)}
              >
                🚀 Continue Journey
              </button>
            )}

            {/* Secondary CTA buttons: Replay and Home side-by-side */}
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                className="btn-secondary"
                style={{
                  flex: 1.2,
                  padding: '12px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={onRetry}
              >
                <RotateCcw size={14} /> Replay Mission
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 0.8,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255, 255, 255, 0.6)',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                }}
              >
                <Home size={14} /> Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompletionScreen;
