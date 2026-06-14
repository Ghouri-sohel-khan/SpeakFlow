import React, { useState, useEffect } from 'react';
import { dbService, simulateFirebaseSync } from './services/db';
import type { UserProfile } from './services/db';
import { generateMissions, getDailyChallengeForDay, ACHIEVEMENTS } from './data/missions';
import type { Mission } from './data/missions';
import Navbar from './components/Navbar';
import DebugPanel from './components/DebugPanel';
import SplashScreen from './components/SplashScreen';
import HomeScreen from './views/HomeScreen';
import JourneyScreen from './views/JourneyScreen';
import TeleprompterScreen from './views/TeleprompterScreen';
import CompletionScreen from './views/CompletionScreen';
import VoiceDiaryScreen from './views/VoiceDiaryScreen';
import ProgressScreen from './views/ProgressScreen';
import AchievementsScreen from './views/AchievementsScreen';
import { RefreshCw, CloudCheck, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  // Core application states
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [prevTab, setPrevTab] = useState<string>('home');
  const [profile, setProfile] = useState<UserProfile>(() => dbService.getProfile());
  const [missions] = useState<Mission[]>(() => generateMissions());
  
  // Active Practice state
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [completionStats, setCompletionStats] = useState<{
    duration: number;
    wordsRead: number;
    wpm: number;
    stars: number;
    completionRate: number;
    recordingId: string;
  } | null>(null);

  // Time & Unlock states
  const [devDayOffset, setDevDayOffset] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [showDebug, setShowDebug] = useState<boolean>(false);

  // Level up overlay animation state
  const [unlockedLevelBanner, setUnlockedLevelBanner] = useState<'intermediate' | 'advanced' | null>(null);

  // Daily Speaking Challenge states
  const [dailyChallengeCount, setDailyChallengeCount] = useState<number>(0);

  // Calculate day offset since registration date
  const getElapsedDays = () => {
    const start = new Date(profile.startDate).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff) + devDayOffset;
  };

  const currentDayOffset = getElapsedDays();
  // Daily Unlock Rule: 5 missions unlocked per day.
  const unlockedMissionsCount = Math.min(150, (currentDayOffset + 1) * 5);

  // Periodic mock cloud sync check
  useEffect(() => {
    const triggerAutoSync = async () => {
      setSyncStatus('syncing');
      await simulateFirebaseSync();
      setSyncStatus('synced');
    };
    
    // Auto-sync after state changes
    triggerAutoSync();
  }, [profile.xp, profile.coins, devDayOffset]);

  // Load daily challenge count from IndexedDB on mount
  useEffect(() => {
    const loadChallengeCount = async () => {
      try {
        const recs = await dbService.getRecordings();
        const count = recs.filter(r => r.missionId === 9999).length;
        setDailyChallengeCount(count);
      } catch (err) {
        console.error('Failed to load recordings for daily challenge count', err);
      }
    };
    loadChallengeCount();
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    await simulateFirebaseSync();
    setIsSyncing(false);
    setSyncStatus('synced');
  };

  // Process Completed Mission Rewards, Achievements, and Level Promotions
  const handleFinishMission = (stats: typeof completionStats) => {
    if (!stats || !activeMission) return;
    setCompletionStats(stats);

    // 1. Calculate XP / Coin rewards
    let gainedXP = activeMission.xp;
    let gainedCoins = activeMission.coins;
    
    // Bonus for high mastery star counts
    if (stats.stars === 5) {
      gainedXP += 25; // Mastery Bonus
      gainedCoins += 10;
    } else if (stats.stars === 4) {
      gainedXP += 10;
    }

    // Daily Challenge rewards multiplier
    const isDailyChallenge = activeMission.id === 9999;
    if (isDailyChallenge) {
      gainedXP = 15;
      gainedCoins = 10;
      setDailyChallengeCount(prev => prev + 1);
    }

    // 2. Clone and update profile data
    setProfile((prev) => {
      const nextProfile = { ...prev };
      
      // Update completion details
      const existingRecord = nextProfile.completedMissions[activeMission.id];
      const improved = !existingRecord || stats.stars > existingRecord.stars;
      
      // Save best attempts
      nextProfile.completedMissions[activeMission.id] = {
        stars: existingRecord ? Math.max(existingRecord.stars, stats.stars) : stats.stars,
        wpm: existingRecord ? Math.max(existingRecord.wpm, stats.wpm) : stats.wpm,
        timestamp: Date.now(),
        completionRate: existingRecord ? Math.max(existingRecord.completionRate, stats.completionRate) : stats.completionRate
      };

      // Only add XP/Coins if this is a first-time completion or they improved their stars
      if (improved) {
        nextProfile.xp += gainedXP;
        nextProfile.coins += gainedCoins;
      }

      // 3. Update active speaking streak if they completed a mission
      const todayString = new Date().toISOString().split('T')[0];
      if (nextProfile.lastActiveDate !== todayString) {
        // If last active was yesterday, increment streak. Otherwise reset or maintain.
        const lastActive = nextProfile.lastActiveDate ? new Date(nextProfile.lastActiveDate).getTime() : 0;
        const diffDays = Math.floor((Date.now() - lastActive) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          nextProfile.streak += 1;
          // Streak bonus
          nextProfile.xp += 20;
        } else if (diffDays > 1) {
          nextProfile.streak = 1;
        }
        nextProfile.lastActiveDate = todayString;
      }

      // 4. Evaluate and unlock achievements
      const completedCount = Object.keys(nextProfile.completedMissions).map(Number).length;
      const totalMastery = Object.values(nextProfile.completedMissions).reduce((sum, item) => sum + item.stars, 0);

      ACHIEVEMENTS.forEach(ach => {
        if (nextProfile.achievements.includes(ach.id)) return; // already earned

        let eligible = false;
        if (ach.targetType === 'missions' && completedCount >= ach.targetValue) eligible = true;
        if (ach.targetType === 'streak' && nextProfile.streak >= ach.targetValue) eligible = true;
        if (ach.targetType === 'time' && (completedCount * 35) >= ach.targetValue) eligible = true;
        
        if (eligible) {
          nextProfile.achievements.push(ach.id);
          nextProfile.xp += ach.xpReward;
          nextProfile.coins += ach.coinReward;
        }
      });

      // 5. Evaluate Level/Tier Promotions
      // Beginner Completed Count
      const beginnerCompleted = missions.filter(m => m.difficulty === 'beginner' && nextProfile.completedMissions[m.id]).length;
      
      // Promotion Beginner -> Intermediate:
      // Requires 50 beginner missions completed AND 180 mastery points
      if (nextProfile.level === 'beginner' && beginnerCompleted >= 50 && totalMastery >= 180) {
        nextProfile.level = 'intermediate';
        setUnlockedLevelBanner('intermediate');
        // Earn intermediate badge if not unlocked yet
        if (!nextProfile.achievements.includes('level_intermediate')) {
          nextProfile.achievements.push('level_intermediate');
          nextProfile.xp += 100;
          nextProfile.coins += 50;
        }
      }

      // Promotion Intermediate -> Advanced:
      // Requires 100 total missions completed AND 400 mastery points
      if (nextProfile.level === 'intermediate' && completedCount >= 100 && totalMastery >= 400) {
        nextProfile.level = 'advanced';
        setUnlockedLevelBanner('advanced');
        if (!nextProfile.achievements.includes('level_advanced')) {
          nextProfile.achievements.push('level_advanced');
          nextProfile.xp += 200;
          nextProfile.coins += 100;
        }
      }

      // Save to localStorage
      dbService.saveProfile(nextProfile);
      return nextProfile;
    });
  };

  const handleSelectMission = (mission: Mission) => {
    setPrevTab(activeTab);
    setActiveMission(mission);
    setCompletionStats(null);
    setActiveTab('prompter');
  };

  const getChallengeDuration = (count: number): number => {
    if (count < 5) return 30; // Challenge 1-5: 30s
    if (count < 10) return 40; // Challenge 6-10: 40s
    if (count < 15) return 50; // Challenge 11-15: 50s
    if (count < 20) return 60; // Challenge 16-20: 60s
    return 60; // default/fallback
  };

  const handleSelectDailyChallenge = (customDuration?: number) => {
    const dc = getDailyChallengeForDay(currentDayOffset);
    const duration = (dailyChallengeCount >= 20 && customDuration !== undefined)
      ? customDuration
      : getChallengeDuration(dailyChallengeCount);

    // Create temporary challenge mission wrapper
    const dcMission: Mission = {
      id: 9999,
      difficulty: profile.level,
      title: 'Daily Challenge',
      category: 'Daily Challenge',
      type: 'challenge',
      estimated_duration: duration,
      word_count: dc.prompt.split(/\s+/).filter(w => w.length > 0).length,
      xp: dc.xp,
      coins: dc.coins,
      environment: 'Daily Challenge Arena',
      content: dc.prompt,
      variations: []
    };
    handleSelectMission(dcMission);
  };

  const closeCompletionScreen = () => {
    setActiveMission(null);
    setCompletionStats(null);
    setActiveTab(prevTab);
  };

  const handleGoHome = () => {
    setActiveMission(null);
    setCompletionStats(null);
    setActiveTab('home');
  };

  const handleRetryMission = () => {
    setCompletionStats(null);
    setActiveTab('prompter');
  };

  // Render Page Content based on tab routing
  const renderActiveScreen = () => {
    if (activeTab === 'prompter' && activeMission) {
      if (completionStats) {
        return (
          <CompletionScreen
            mission={activeMission}
            stats={completionStats}
            onClose={closeCompletionScreen}
            onRetry={handleRetryMission}
            onStartMission={handleSelectMission}
            dailyChallengeCount={dailyChallengeCount}
            unlockedCount={unlockedMissionsCount}
          />
        );
      }
      return (
        <TeleprompterScreen
          mission={activeMission}
          onBack={closeCompletionScreen}
          onGoHome={handleGoHome}
          onFinish={handleFinishMission}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            profile={profile}
            missions={missions}
            unlockedCount={unlockedMissionsCount}
            dayOffset={currentDayOffset}
            onNavigate={setActiveTab}
            onSelectMission={handleSelectMission}
            onSelectDailyChallenge={handleSelectDailyChallenge}
            dailyChallengeCount={dailyChallengeCount}
          />
        );
      case 'journey':
        return (
          <JourneyScreen
            profile={profile}
            missions={missions}
            unlockedCount={unlockedMissionsCount}
            onSelectMission={handleSelectMission}
          />
        );
      case 'diary':
        return <VoiceDiaryScreen />;
      case 'progress':
        return <ProgressScreen profile={profile} />;
      case 'achievements':
        return <AchievementsScreen profile={profile} />;
      default:
        return <div style={{ color: 'white', padding: '20px' }}>Screen Not Found</div>;
    }
  };

  return (
    <>
      {showSplash ? (
        <SplashScreen onFinished={() => setShowSplash(false)} />
      ) : (
        /* Dynamic Theme Mapping to outer frame based on current user level status */
        <div className={`phone-simulator-frame theme-${profile.level}`}>
          {/* Ambient Glows */}
          <div className="ambient-glow-top"></div>
          <div className="ambient-glow-bottom"></div>

          {/* Smartphone Status Bar Header */}
          <header className="simulator-status-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>9:41</span>
              {syncStatus === 'syncing' ? (
                <RefreshCw size={10} className="spin-anim" style={{ color: 'var(--primary)' }} />
              ) : (
                <span style={{ fontSize: '9px', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <CloudCheck size={8} /> Synced
                </span>
              )}
            </div>
            
            {/* Right Status utilities */}
            <div className="simulator-status-icons">
              <span style={{ marginRight: '6px' }}>📶 🔋 100%</span>
              <button
                onClick={() => setShowDebug(true)}
                className="debug-toggle-btn"
                title="Open Debug Panel"
              >
                ⚙️
              </button>
            </div>
          </header>

          {/* Core Page Content Viewport */}
          <main className="phone-screen-content">
            {renderActiveScreen()}
          </main>

          {/* Bottom Navigation Frame (Hidden during active teleprompter readings) */}
          {activeTab !== 'prompter' && (
            <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
          )}

          {/* Level Promotion Up celebratory banners */}
          {unlockedLevelBanner && (
            <div className="level-up-overlay">
              <div className="level-up-card glass-card" style={{ padding: '30px 20px', textAlign: 'center', border: '2px solid #fbbf24' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'bounce-nav 0.8s infinite' }}>🎉</div>
                <h2 style={{ fontSize: '24px', color: '#fbbf24', fontWeight: 800, fontFamily: 'Outfit' }}>
                  Level Tier Unlocked!
                </h2>
                <h3 style={{ fontSize: '18px', color: '#fff', margin: '8px 0 16px', textTransform: 'capitalize' }}>
                  Welcome to {unlockedLevelBanner} Journeys
                </h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4', marginBottom: '24px' }}>
                  You have unlocked a new interface theme, Village/City environments, and faster speed target objectives!
                </p>
                <button
                  className="btn-premium"
                  style={{ width: '100%' }}
                  onClick={() => setUnlockedLevelBanner(null)}
                >
                  <Sparkles size={16} /> Continue Speaking
                </button>
              </div>
            </div>
          )}

          {/* Developer Debug Panel Portal Overlay */}
          {showDebug && (
            <DebugPanel
              profile={profile}
              setProfile={setProfile}
              onClose={() => setShowDebug(false)}
              dayOffset={devDayOffset}
              setDayOffset={setDevDayOffset}
              triggerSync={handleSyncNow}
              isSyncing={isSyncing}
            />
          )}
        </div>
      )}
    </>
  );
};

// Add spinning animation for syncing updates dynamically
const syncStyle = document.createElement('style');
syncStyle.innerHTML = `
  .spin-anim {
    animation: rotate-spin 1s linear infinite;
  }
  @keyframes rotate-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(syncStyle);

export default App;
