import React from 'react';
import { Settings, RefreshCw, Calendar, ShieldAlert } from 'lucide-react';
import type { UserProfile } from '../services/db';

interface DebugPanelProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onClose: () => void;
  dayOffset: number;
  setDayOffset: (offset: number) => void;
  triggerSync: () => void;
  isSyncing: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  profile,
  setProfile,
  onClose,
  dayOffset,
  setDayOffset,
  triggerSync,
  isSyncing
}) => {
  
  const addXP = (amount: number) => {
    setProfile(prev => {
      const next = { ...prev, xp: prev.xp + amount };
      localStorage.setItem('speakflow_profile', JSON.stringify(next));
      return next;
    });
  };

  const addCoins = (amount: number) => {
    setProfile(prev => {
      const next = { ...prev, coins: prev.coins + amount };
      localStorage.setItem('speakflow_profile', JSON.stringify(next));
      return next;
    });
  };

  const setLevel = (level: 'beginner' | 'intermediate' | 'advanced') => {
    setProfile(prev => {
      const next = { ...prev, level };
      localStorage.setItem('speakflow_profile', JSON.stringify(next));
      return next;
    });
  };

  const fastForwardDay = () => {
    setDayOffset(dayOffset + 1);
  };

  const resetProgress = () => {
    if (window.confirm('Are you sure you want to reset all profile and database progress? This will delete local recordings!')) {
      localStorage.clear();
      // Reset IndexedDB
      const req = indexedDB.deleteDatabase('SpeakFlowDB');
      req.onsuccess = () => {
        window.location.reload();
      };
      req.onerror = () => {
        window.location.reload();
      };
    }
  };

  return (
    <div className="debug-overlay">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
            <Settings size={20} /> SpeakFlow Debug Panel
          </h2>
          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
            User: {profile.username} • Stage: {profile.level}
          </div>
        </div>
        <button className="btn-secondary" style={{ padding: '6px 12px', borderRadius: '8px' }} onClick={onClose}>
          Close
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '80%' }}>
        {/* Simulating Time */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
          <h4 style={{ marginBottom: '8px', color: '#fff' }}>Simulated Calendar Unlock</h4>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
            Current simulated day offset: <strong>Day {dayOffset + 1}</strong> (+{dayOffset} days elapsed).
            <br />
            Missions unlocked: <strong>Missions 1 to {Math.min(150, (dayOffset + 1) * 5)}</strong>.
          </p>
          <button className="btn-premium" style={{ width: '100%', padding: '10px' }} onClick={fastForwardDay}>
            <Calendar size={16} /> Fast-Forward +1 Day
          </button>
        </div>

        {/* Level unlocks */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
          <h4 style={{ marginBottom: '8px', color: '#fff' }}>Bypass Tier Locking</h4>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
            Directly switch level theme environment.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => setLevel('beginner')}>
              Beginner
            </button>
            <button className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => setLevel('intermediate')}>
              Intermediate
            </button>
            <button className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => setLevel('advanced')}>
              Advanced
            </button>
          </div>
        </div>

        {/* Currency & Rewards */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
          <h4 style={{ marginBottom: '8px', color: '#fff' }}>Add Wallet Balance</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => addXP(100)}>
              +100 XP
            </button>
            <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => addXP(500)}>
              +500 XP
            </button>
            <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => addCoins(50)}>
              +50 Coins
            </button>
            <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => addCoins(250)}>
              +250 Coins
            </button>
          </div>
        </div>

        {/* Sync Controls */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
          <h4 style={{ marginBottom: '8px', color: '#fff' }}>Firebase Offline Mode</h4>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
            Trigger manual synchronization of local profile values.
          </p>
          <button className="btn-secondary" style={{ width: '100%', padding: '10px' }} onClick={triggerSync} disabled={isSyncing}>
            <RefreshCw size={16} className={isSyncing ? 'spin-anim' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {/* System Reset */}
        <button
          className="btn-secondary"
          style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '12px' }}
          onClick={resetProgress}
        >
          <ShieldAlert size={16} /> RESET ENTIRE APP DATABASE
        </button>
      </div>
    </div>
  );
};
export default DebugPanel;
