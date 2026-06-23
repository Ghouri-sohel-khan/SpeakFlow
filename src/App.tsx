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
import GoldenDust from './components/GoldenDust';
import { RefreshCw, CloudCheck, Sparkles, Info } from 'lucide-react';

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

  // About us modal overlay visibility state
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);

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
        
        // Custom check for Midnight Speaker: practice completed between 9:00 PM and 5:00 AM
        if (ach.id === 'midnight_speaker') {
          const currentHour = new Date().getHours();
          if (currentHour >= 21 || currentHour < 5) eligible = true;
        }
        
        if (eligible) {
          nextProfile.achievements.push(ach.id);
          nextProfile.xp += ach.xpReward;
          nextProfile.coins += ach.coinReward;
        }
      });

      // Custom check for Grand Master: unlocked when all other 9 achievements are earned
      if (!nextProfile.achievements.includes('grand_master')) {
        const otherEarnedCount = nextProfile.achievements.filter(id => id !== 'grand_master').length;
        if (otherEarnedCount >= 9) {
          nextProfile.achievements.push('grand_master');
          const gm = ACHIEVEMENTS.find(a => a.id === 'grand_master');
          if (gm) {
            nextProfile.xp += gm.xpReward;
            nextProfile.coins += gm.coinReward;
          }
        }
      }

      // 5. Evaluate Level/Tier Promotions
      // Beginner Completed Count
      const beginnerCompleted = missions.filter(m => m.difficulty === 'beginner' && nextProfile.completedMissions[m.id]).length;
      
      // Promotion Beginner -> Intermediate:
      // Requires 50 beginner missions completed AND 180 mastery points
      if (nextProfile.level === 'beginner' && beginnerCompleted >= 50 && totalMastery >= 180) {
        nextProfile.level = 'intermediate';
        setUnlockedLevelBanner('intermediate');
      }

      // Promotion Intermediate -> Advanced:
      // Requires 100 total missions completed AND 400 mastery points
      if (nextProfile.level === 'intermediate' && completedCount >= 100 && totalMastery >= 400) {
        nextProfile.level = 'advanced';
        setUnlockedLevelBanner('advanced');
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
        return <ProgressScreen profile={profile} onNavigate={setActiveTab} />;
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
        <div className="phone-simulator-frame">
          {/* Ambient Glows */}
          <div className="ambient-glow-top"></div>
          <div className="ambient-glow-bottom"></div>
          <GoldenDust />

          {/* Smartphone Status Bar Header */}
          <header className="simulator-status-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>9:41</span>
              {syncStatus === 'syncing' ? (
                <RefreshCw size={10} className="spin-anim" style={{ color: 'var(--primary)' }} />
              ) : (
                <span style={{ fontSize: '9px', background: 'rgba(212,175,55,0.1)', color: '#D4AF37', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <CloudCheck size={8} /> Synced
                </span>
              )}
            </div>
            
            {/* Right Status utilities */}
            <div className="simulator-status-icons" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ marginRight: '4px' }}>📶 🔋 100%</span>
              <button
                onClick={() => setShowAboutModal(true)}
                className="debug-toggle-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="About SpeakFlow"
              >
                <Info size={11} />
              </button>
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
              <div className="level-up-card glass-card" style={{ padding: '30px 20px', textAlign: 'center', border: '2px solid #D4AF37' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'bounce-nav 0.8s infinite' }}>🎉</div>
                <h2 style={{ fontSize: '24px', color: '#D4AF37', fontWeight: 800, fontFamily: 'Outfit' }}>
                  Level Tier Unlocked!
                </h2>
                <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: '8px 0 16px', textTransform: 'capitalize' }}>
                  Welcome to {unlockedLevelBanner} Journeys
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '24px' }}>
                  You have unlocked new environments and faster speed target objectives!
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

          {/* Elegant Scrollable Golden-Metallic About Modal */}
          {showAboutModal && (
            <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setShowAboutModal(false)}>
              <div 
                className="glass-card" 
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '360px',
                  maxHeight: '600px',
                  overflowY: 'auto',
                  border: '2px solid #D4AF37',
                  background: '#0a0e14',
                  borderRadius: '20px',
                  boxShadow: 'inset 0 0 10px rgba(212, 175, 55, 0.1), 0 12px 40px rgba(0,0,0,0.85)',
                  padding: '24px 20px',
                  position: 'relative'
                }}
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="btn-tactile-press"
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    color: '#D4AF37',
                    fontSize: '18px',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  ✕
                </button>

                {/* Heading */}
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#D4AF37',
                  textAlign: 'center',
                  fontFamily: 'Outfit',
                  textShadow: '0 0 5px rgba(212, 175, 55, 0.4)',
                  marginBottom: '20px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  About SpeakFlow
                </h2>

                {/* Scrollable Contents */}
                <div style={{ color: '#E0E0E0', fontSize: '12.5px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
                  
                  <div>
                    <h3 style={{ fontSize: '14px', color: '#D4AF37', fontWeight: 700, marginBottom: '6px', fontFamily: 'Outfit' }}>
                      Welcome to SpeakFlow!
                    </h3>
                    <p>
                      SpeakFlow Practitioner ek aisa platform hai jise English speaking practice ko aasan, mazedaar, aur sabhi ke liye accessible banane ke vision ke saath banaya gaya hai. Humara maqsad hai aapko ek aisa offline-first environment dena, jahan aap bina kisi internet ki chinta ke apne communication skills ko behtar bana sakein.
                    </p>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '14px', color: '#D4AF37', fontWeight: 700, marginBottom: '6px', fontFamily: 'Outfit' }}>
                      Humne yeh app kyun banayi?
                    </h3>
                    <p>
                      Confidence aur behtar English aaj ke samay mein personal growth ke liye bahut zaruri hai. Bahut se log sirf isliye piche reh jaate hain kyunki unhe practice ke liye koi sahara ya sahi environment nahi milta. Ghouri Sohel Khan dwara develop ki gayi yeh application, isi jhijhak ko door karne aur aapko ek safe space dene ke liye banayi gayi hai.
                    </p>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '14px', color: '#D4AF37', fontWeight: 700, marginBottom: '6px', fontFamily: 'Outfit' }}>
                      Iske features aur fayde:
                    </h3>
                    <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', listStyleType: 'disc' }}>
                      <li><strong>Offline Accessibility:</strong> Internet ki zarurat nahi, aap kaahin bhi aur kabhi bhi practice kar sakte hain.</li>
                      <li><strong>Gamified Journey:</strong> "Snake Road" ke zariye Jungle se City tak ka safar, jo aapki learning ko boring nahi hone deta.</li>
                      <li><strong>Progress Tracking:</strong> Daily practice, WPM (Words Per Minute), aur milestones ko track karke apni growth dekhein.</li>
                      <li><strong>Voice Diary:</strong> Apne khayalat record karein aur confidence build karein.</li>
                      <li><strong>Trophy Room:</strong> Achievements unlock karein aur apne speaking habits ko reward karein.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '14px', color: '#D4AF37', fontWeight: 700, marginBottom: '6px', fontFamily: 'Outfit' }}>
                      Kaise use karein?
                    </h3>
                    <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', listStyleType: 'decimal' }}>
                      <li><strong>Journey Start Karein:</strong> Level 1 (Jungle) se apni shuruat karein.</li>
                      <li><strong>Missions Poore Karein:</strong> Har mission mein di gayi exercises ko record karein.</li>
                      <li><strong>Voice Diary:</strong> Rozana topics par practice karein aur apne records check karein.</li>
                      <li><strong>Trophy Room:</strong> Badges earn karke apni progress celebrate karein.</li>
                    </ol>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '14px', color: '#D4AF37', fontWeight: 700, marginBottom: '6px', fontFamily: 'Outfit' }}>
                      Aage ka safar (Phase 1 & Future)
                    </h3>
                    <p>
                      Yeh hamari application ka First Phase hai. Hum is safar ki shuruat kar rahe hain aur aapka support hamare liye sabse bada motivation hai.
                    </p>
                    <p style={{ marginTop: '8px' }}>
                      Agar aapko lagta hai ki ismein kuch aur behtareen features hone chahiye, toh humein zaroor batayein! Aap apne sujhav (suggestions) humein email kar sakte hain. Agar aapka support aur pyaar milta raha, toh hum bahut jald Phase 2 layenge, jisme aur bhi advanced features aur behtar user-friendly experience hoga.
                    </p>
                  </div>

                  {/* Footer contact details */}
                  <div style={{
                    background: 'rgba(212, 175, 55, 0.05)',
                    border: '1px solid rgba(212, 175, 55, 0.15)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginTop: '8px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '11px', color: '#B0B0B0' }}>Contact Us:</span>
                    <a href="mailto:sghouri72@gmail.com" style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 700, textDecoration: 'none' }}>
                      sghouri72@gmail.com
                    </a>
                    <span style={{ fontSize: '10px', color: '#B0B0B0', marginTop: '6px' }}>
                      Developed with ❤️ by:
                    </span>
                    <strong style={{ fontSize: '12px', color: '#FFF' }}>
                      Ghouri Sohel Khan
                    </strong>
                  </div>

                </div>
              </div>
            </div>
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
