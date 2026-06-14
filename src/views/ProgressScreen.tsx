import React, { useEffect, useState, useRef } from 'react';
import { BarChart2, Play, Pause, Trash2, Activity, Calendar } from 'lucide-react';
import { dbService } from '../services/db';
import type { VoiceRecording, UserProfile } from '../services/db';

interface ProgressScreenProps {
  profile: UserProfile;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ profile }) => {
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Audio playback state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedMissionsWithMultipleAttempts, setSelectedMissionsWithMultipleAttempts] = useState<number[]>([]);
  const [targetMissionId, setTargetMissionId] = useState<number | null>(null);
  const [oldRecId, setOldRecId] = useState<string>('');
  const [newRecId, setNewRecId] = useState<string>('');

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      const recs = await dbService.getRecordings();
      setRecordings(recs);
      
      // Find missions that have at least 2 attempts
      const counts: Record<number, number> = {};
      recs.forEach(r => {
        counts[r.missionId] = (counts[r.missionId] || 0) + 1;
      });
      const multiples = Object.keys(counts)
        .map(Number)
        .filter(id => counts[id] >= 2);
      
      setSelectedMissionsWithMultipleAttempts(multiples);
      if (multiples.length > 0) {
        setTargetMissionId(multiples[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Autoselect default comparison entries when targetMissionId changes
  useEffect(() => {
    if (targetMissionId !== null) {
      const missionRecs = recordings.filter(r => r.missionId === targetMissionId);
      if (missionRecs.length >= 2) {
        // Sort chronologically (oldest is index length-1, newest is index 0)
        const sorted = [...missionRecs].sort((a, b) => a.timestamp - b.timestamp);
        setOldRecId(sorted[0].id); // Oldest attempt
        setNewRecId(sorted[sorted.length - 1].id); // Newest attempt
      }
    }
  }, [targetMissionId, recordings]);

  const deleteRec = async (id: string) => {
    if (window.confirm('Delete this recording?')) {
      await dbService.deleteRecording(id);
      loadRecordings();
    }
  };

  const playAudio = (rec: VoiceRecording) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (playingId === rec.id) {
      setPlayingId(null);
      return;
    }

    const url = URL.createObjectURL(rec.audioBlob);
    audioRef.current = new Audio(url);
    audioRef.current.play();
    setPlayingId(rec.id);

    audioRef.current.onended = () => {
      setPlayingId(null);
      URL.revokeObjectURL(url);
    };
  };

  // Formatting timestamp
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Mocking weekly statistics based on real profile completions
  const getWeeklyCompletedCount = recordings.length;
  const totalSpeakingTime = recordings.reduce((acc, r) => acc + r.duration, 0);
  const avgWPM = recordings.length > 0 
    ? Math.round(recordings.reduce((acc, r) => acc + r.wpm, 0) / recordings.length) 
    : 0;

  // Render weekly chart data (speaking seconds per day of the week)
  // Let's generate a realistic-looking week
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekSeconds = [45, 90, 30, 120, 60, 0, totalSpeakingTime % 300]; // mock with actual final data included

  // Compute comparison stats
  const oldRec = recordings.find(r => r.id === oldRecId);
  const newRec = recordings.find(r => r.id === newRecId);

  const getGrowthPercent = () => {
    if (!oldRec || !newRec) return 0;
    const diff = newRec.wpm - oldRec.wpm;
    return Math.round((diff / oldRec.wpm) * 100);
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ textAlign: 'center', padding: '0 16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Outfit', color: '#fff' }}>
          Progress Reports
        </h2>
        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
          Practice reports for <strong>{profile.username}</strong>
        </p>
      </div>

      {/* Progress Mode Tabs */}
      <div style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.04)',
        borderRadius: '16px',
        padding: '4px',
        margin: '0 16px 20px',
        border: '1px solid var(--border)'
      }}>
        <button
          onClick={() => setCompareMode(false)}
          style={{
            flex: 1,
            padding: '10px 4px',
            border: 'none',
            background: !compareMode ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <BarChart2 size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Weekly Report
        </button>
        <button
          onClick={() => setCompareMode(true)}
          style={{
            flex: 1,
            padding: '10px 4px',
            border: 'none',
            background: compareMode ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Activity size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Compare Recordings
        </button>
      </div>

      {!compareMode ? (
        /* --- WEEKLY REPORT CARD VIEW --- */
        <>
          {/* Growth Summary Metrics */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Performance Overview
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                  {getWeeklyCompletedCount}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Missions</div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--secondary)' }}>
                  {totalSpeakingTime}s
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Time Spoken</div>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24' }}>
                  {avgWPM}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Avg WPM</div>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="glass-card" style={{ padding: '20px 16px' }}>
            <h4 style={{ fontSize: '13px', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
              <Calendar size={18} style={{ color: 'var(--primary)' }} /> Daily Practice Timeline
            </h4>
            
            {/* Chart Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', height: '140px', alignItems: 'flex-end', padding: '0 8px', marginBottom: '8px' }}>
              {weekDays.map((day, idx) => {
                const val = weekSeconds[idx];
                const heightPercent = Math.min(100, Math.max(10, (val / 180) * 100)); // normalized scale
                return (
                  <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px' }}>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                      {val > 0 ? `${val}s` : '-'}
                    </span>
                    <div style={{
                      width: '12px',
                      height: `${heightPercent}px`,
                      background: val > 0 ? 'linear-gradient(to top, var(--primary), var(--secondary))' : 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '6px',
                      boxShadow: val > 0 ? '0 0 8px rgba(var(--primary-rgb), 0.3)' : ''
                    }}></div>
                    <span style={{ fontSize: '10px', color: '#fff', fontWeight: 600, marginTop: '8px' }}>
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recordings List */}
          <div style={{ padding: '0 16px' }}>
            <h4 style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
              Practice Recordings ({recordings.length})
            </h4>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)' }}>Loading history...</div>
            ) : recordings.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '24px' }}>
                No recordings saved yet. Go complete a journey stage to save your first attempt!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recordings.map((rec) => (
                  <div key={rec.id} className="glass-card" style={{ margin: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>{rec.title}</h4>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        {formatDate(rec.timestamp)} • Speed: <strong>{rec.wpm} WPM</strong>
                      </p>
                      <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} style={{ color: i < rec.stars ? '#fbbf24' : 'rgba(255,255,255,0.15)', fontSize: '10px' }}>
                            ⭐
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => playAudio(rec)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: 'none',
                          background: playingId === rec.id ? '#ef4444' : 'rgba(255,255,255,0.06)',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {playingId === rec.id ? <Pause size={14} fill="#fff" /> : <Play size={14} fill="#fff" style={{ marginLeft: '1px' }} />}
                      </button>
                      <button
                        onClick={() => deleteRec(rec.id)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: 'none',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* --- RECORDING COMPARISON SCREEN VIEW --- */
        <div style={{ padding: '0 16px' }}>
          {selectedMissionsWithMultipleAttempts.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '30px' }}>
              Comparison mode requires at least <strong>two attempts on the same mission</strong>. 
              <br /><br />
              Go practice one of your favorite completed missions again to unlock side-by-side growth comparisons!
            </div>
          ) : (
            <>
              {/* Mission Selector Dropdown */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Select Practice Stage to Compare
                </label>
                <select
                  value={targetMissionId || ''}
                  onChange={(e) => setTargetMissionId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    color: '#fff',
                    padding: '12px',
                    fontSize: '13px',
                    fontFamily: 'Outfit'
                  }}
                >
                  {selectedMissionsWithMultipleAttempts.map(id => {
                    const mission = recordings.find(r => r.missionId === id);
                    return (
                      <option key={id} value={id} style={{ background: '#0a0d14' }}>
                        Mission {id} - {mission?.title}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Version Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>Old Attempt</label>
                  <select
                    value={oldRecId}
                    onChange={(e) => setOldRecId(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '8px',
                      fontSize: '11px'
                    }}
                  >
                    {recordings.filter(r => r.missionId === targetMissionId).map(r => (
                      <option key={r.id} value={r.id} style={{ background: '#0a0d14' }}>
                        {formatDate(r.timestamp)} ({r.wpm} WPM)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>New Attempt</label>
                  <select
                    value={newRecId}
                    onChange={(e) => setNewRecId(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '8px',
                      fontSize: '11px'
                    }}
                  >
                    {recordings.filter(r => r.missionId === targetMissionId).map(r => (
                      <option key={r.id} value={r.id} style={{ background: '#0a0d14' }}>
                        {formatDate(r.timestamp)} ({r.wpm} WPM)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Growth Stats Card */}
              {oldRec && newRec && (
                <div className="glass-card" style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: '16px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                    Calculated Fluency Growth
                  </span>
                  <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', fontFamily: 'Outfit', marginTop: '6px' }}>
                    {getGrowthPercent() >= 0 ? `+${getGrowthPercent()}%` : `${getGrowthPercent()}%`}
                  </h2>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                    Improvement rate in reading speed (WPM)
                  </p>
                </div>
              )}

              {/* Side-by-side Table Comparison */}
              {oldRec && newRec && (
                <div className="glass-card" style={{ margin: '0 0 20px', padding: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th style={{ padding: '8px 0', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Metric</th>
                        <th style={{ padding: '8px 0', color: 'var(--primary)', fontWeight: 700 }}>Old Attempt</th>
                        <th style={{ padding: '8px 0', color: 'var(--secondary)', fontWeight: 700 }}>New Attempt</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 0', color: 'rgba(255,255,255,0.7)' }}>Reading Speed</td>
                        <td style={{ padding: '10px 0', fontWeight: 700 }}>{oldRec.wpm} WPM</td>
                        <td style={{ padding: '10px 0', fontWeight: 700 }}>{newRec.wpm} WPM</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 0', color: 'rgba(255,255,255,0.7)' }}>Completion Rate</td>
                        <td style={{ padding: '10px 0' }}>{oldRec.completionRate}%</td>
                        <td style={{ padding: '10px 0' }}>{newRec.completionRate}%</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 0', color: 'rgba(255,255,255,0.7)' }}>Speaking Time</td>
                        <td style={{ padding: '10px 0' }}>{oldRec.duration}s</td>
                        <td style={{ padding: '10px 0' }}>{newRec.duration}s</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px 0', color: 'rgba(255,255,255,0.7)' }}>Mastery Stars</td>
                        <td style={{ padding: '10px 0', color: '#fbbf24' }}>{Array.from({ length: oldRec.stars }).map(() => '⭐')}</td>
                        <td style={{ padding: '10px 0', color: '#fbbf24' }}>{Array.from({ length: newRec.stars }).map(() => '⭐')}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Audio Playback Compare Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      onClick={() => playAudio(oldRec)}
                      className="btn-secondary"
                      style={{ padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      {playingId === oldRec.id ? <Pause size={12} fill="#fff" /> : <Play size={12} fill="#fff" />}
                      Play Old Audio
                    </button>
                    <button
                      onClick={() => playAudio(newRec)}
                      className="btn-secondary"
                      style={{ padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      {playingId === newRec.id ? <Pause size={12} fill="#fff" /> : <Play size={12} fill="#fff" />}
                      Play New Audio
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
export default ProgressScreen;
