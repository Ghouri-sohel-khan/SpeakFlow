import React, { useEffect, useState, useRef } from 'react';
import { BarChart2, Play, Pause, Trash2, Activity, Crown, TrendingUp, Sparkles } from 'lucide-react';
import { dbService } from '../services/db';
import type { VoiceRecording, UserProfile } from '../services/db';

interface ProgressScreenProps {
  profile: UserProfile;
  onNavigate?: (tab: string) => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ profile, onNavigate }) => {
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

  // Interactive UI states
  const [hoveredPillar, setHoveredPillar] = useState<number | null>(null);
  const [activeTooltipNode, setActiveTooltipNode] = useState<number | null>(null);

  useEffect(() => {
    loadRecordings();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
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
        // Sort chronologically (oldest attempt first)
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

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Overall database statistics
  const totalSpeakingTime = recordings.reduce((acc, r) => acc + r.duration, 0);
  const avgWPM = recordings.length > 0 
    ? Math.round(recordings.reduce((acc, r) => acc + r.wpm, 0) / recordings.length) 
    : 0;

  // Personal Record calculations
  let highestWPM = 0;
  let highestWPMDate = '';
  let highestWPMTitle = '';
  recordings.forEach(r => {
    if (r.wpm > highestWPM) {
      highestWPM = r.wpm;
      highestWPMDate = new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      highestWPMTitle = r.title;
    }
  });

  // Calculate global growth rate (First attempt ever vs Latest attempt)
  const getGlobalGrowthPercent = () => {
    if (recordings.length < 2) return 0;
    const sorted = [...recordings].sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0].wpm;
    const latest = sorted[sorted.length - 1].wpm;
    if (first === 0) return 0;
    return Math.round(((latest - first) / first) * 100);
  };

  // Weekly dynamic timeline data (Seconds spoken per day in the last 7 days)
  const timelineDays: Array<{ label: string, seconds: number }> = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() - i);
    const dayLabel = targetDate.toLocaleDateString(undefined, { weekday: 'short' });
    const dayStr = targetDate.toISOString().split('T')[0];
    const daySeconds = recordings
      .filter(r => new Date(r.timestamp).toISOString().split('T')[0] === dayStr)
      .reduce((sum, r) => sum + r.duration, 0);
    timelineDays.push({ label: dayLabel, seconds: daySeconds });
  }

  // GitHub-style practice heatmap calculations (last 35 days)
  const heatmapData: Array<{ date: string, count: number }> = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    const count = recordings.filter(r => new Date(r.timestamp).toISOString().split('T')[0] === dayStr).length;
    heatmapData.push({ date: dayStr, count });
  }

  // Speedometer angle (Gauge is 240 degrees total, from -120 to +120)
  const speedometerAngle = -120 + (Math.min(250, avgWPM) / 250) * 240;

  // Comparison items
  const oldRec = recordings.find(r => r.id === oldRecId);
  const newRec = recordings.find(r => r.id === newRecId);

  const getGrowthPercent = () => {
    if (!oldRec || !newRec) return 0;
    const diff = newRec.wpm - oldRec.wpm;
    return Math.round((diff / oldRec.wpm) * 100);
  };

  // Confidence Line Chart coordinate points (last 10 recordings)
  const last10Recs = [...recordings].slice(0, 10).reverse();
  const lineChartPoints = last10Recs.map((r, idx) => {
    const confidencePercent = r.stars * 20; // 5 stars = 100%
    const chartWidth = 340;
    const chartHeight = 80;
    const x = last10Recs.length > 1 ? (idx / (last10Recs.length - 1)) * chartWidth + 10 : chartWidth / 2 + 10;
    const y = chartHeight - (confidencePercent / 100) * chartHeight + 10; // inverted Y
    return { x, y, r };
  });

  const confidenceLinePointsStr = lineChartPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div style={{ padding: '16px 0 30px' }}>
      <div style={{ textAlign: 'center', padding: '0 16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
          Progress Reports
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Analytical dashboard for <strong style={{ color: '#D4AF37' }}>{profile.username}</strong>
        </p>
      </div>

      {/* Mode Switch Tabs */}
      <div style={{
        display: 'flex',
        background: 'rgba(212, 175, 55, 0.04)',
        borderRadius: '16px',
        padding: '4px',
        margin: '0 16px 20px',
        border: '1px solid rgba(212, 175, 55, 0.1)'
      }}>
        <button
          onClick={() => setCompareMode(false)}
          style={{
            flex: 1,
            padding: '10px 4px',
            border: 'none',
            background: !compareMode ? 'linear-gradient(135deg, #D4AF37 0%, #A88A1E 100%)' : 'none',
            borderRadius: '12px',
            color: !compareMode ? '#0d0d12' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <BarChart2 size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Analytics
        </button>
        <button
          onClick={() => setCompareMode(true)}
          style={{
            flex: 1,
            padding: '10px 4px',
            border: 'none',
            background: compareMode ? 'linear-gradient(135deg, #D4AF37 0%, #A88A1E 100%)' : 'none',
            borderRadius: '12px',
            color: compareMode ? '#0d0d12' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Activity size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Comparison
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Loading analytics suite...</div>
      ) : recordings.length === 0 ? (
        /* --- EMPTY STATE REDIRECT SCENE --- */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', padding: '24px', textAlign: 'center' }}>
          <div className="spinning-border-outer" style={{ marginBottom: '24px' }}>
            <div className="spinning-border-inner">
              <Crown size={38} style={{ color: '#D4AF37' }} />
            </div>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
            No Data Logged Yet
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '260px', margin: '8px 0 24px', lineHeight: '1.4' }}>
            Your practice dashboard is empty. Complete speaking stages in your Speaking Journey to generate data reports!
          </p>
          <button
            onClick={() => onNavigate && onNavigate('journey')}
            className="btn-premium"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
          >
            <Sparkles size={16} /> Start Your Journey
          </button>
        </div>
      ) : !compareMode ? (
        /* --- WEEKLY REPORTS & ANALYTICAL GRAPHS --- */
        <>
          {/* Top-aligned Personal Best section */}
          <div className="glass-card" style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(20, 18, 28, 0.85) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(212, 175, 55, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'rgba(212, 175, 55, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid rgba(212,175,55,0.3)',
              boxShadow: '0 0 10px rgba(212,175,55,0.2)'
            }}>
              <Crown size={22} style={{ color: '#D4AF37' }} />
            </div>

            <div style={{ flex: 1 }}>
              <div className="gold-tag" style={{ fontSize: '8px', padding: '2px 8px', letterSpacing: '0.5px' }}>
                🏆 Personal Record
              </div>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit', marginTop: '6px' }}>
                Record: {highestWPM} WPM
              </h4>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                "{highestWPMTitle}" on {highestWPMDate}
              </p>
            </div>
          </div>

          {/* Growth Milestone Overview */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                Growth Milestones
              </h4>
              {getGlobalGrowthPercent() > 0 && (
                <span style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <TrendingUp size={10} /> Progressive
                </span>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#D4AF37', fontFamily: 'Outfit' }}>
                  {recordings.length}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>Completed</div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(212, 175, 55, 0.08)', borderRight: '1px solid rgba(212, 175, 55, 0.08)' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#D4AF37', fontFamily: 'Outfit' }}>
                  {totalSpeakingTime}s
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>Time Spoken</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFD700', fontFamily: 'Outfit' }}>
                  {getGlobalGrowthPercent() > 0 ? `+${getGlobalGrowthPercent()}%` : '0%'}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>Fluency Growth</div>
              </div>
            </div>
          </div>

          {/* Speedometer Gauge for Average WPM */}
          <div className="glass-card" style={{ padding: '20px 16px', textAlign: 'center' }}>
            <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '10px' }}>
              Fluency Velocity (WPM)
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '14px 0' }}>
              <div style={{ position: 'relative', width: '220px', height: '140px' }}>
                <svg width="220" height="140" viewBox="0 0 220 140" style={{ overflow: 'visible' }}>
                  {/* Background Arc */}
                  <path
                    d="M 30 130 A 80 80 0 0 1 190 130"
                    fill="none"
                    stroke="rgba(212, 175, 55, 0.05)"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Glowing Golden Zone Arc */}
                  <path
                    d="M 30 130 A 80 80 0 0 1 190 130"
                    fill="none"
                    stroke="url(#speedometerGoldGradient)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="250"
                    strokeDashoffset={250 - (Math.min(250, avgWPM) / 250) * 250}
                    style={{ filter: 'drop-shadow(0 0 6px rgba(212, 175, 55, 0.5))', transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                  <defs>
                    <linearGradient id="speedometerGoldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#A88A1E" />
                      <stop offset="60%" stopColor="#D4AF37" />
                      <stop offset="100%" stopColor="#FFD700" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Needle */}
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '109px',
                  width: '2px',
                  height: '74px',
                  background: 'linear-gradient(to top, #D4AF37, #FFD700)',
                  transformOrigin: 'bottom center',
                  transform: `rotate(${speedometerAngle}deg)`,
                  transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                  borderRadius: '2px',
                  boxShadow: '0 0 8px #FFD700',
                  zIndex: 2
                }} />
                {/* Center Pivot Pin */}
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '104px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#D4AF37',
                  border: '2px solid #0d0d12',
                  boxShadow: '0 0 6px rgba(212, 175, 55, 0.5)',
                  zIndex: 3
                }} />
                {/* Values in center */}
                <div style={{
                  position: 'absolute',
                  bottom: '15px',
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                    {avgWPM}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                    Average WPM
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* GitHub-style Practice Heatmap */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', fontWeight: 700 }}>
              📅 Consistency Heatmap (Last 35 Days)
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', maxWidth: '280px', margin: '0 auto 12px' }}>
              {heatmapData.map((day) => {
                let bg = 'rgba(212, 175, 55, 0.03)';
                let border = '1px solid rgba(212, 175, 55, 0.05)';
                let shadow = '';
                if (day.count === 1) {
                  bg = 'rgba(212, 175, 55, 0.22)';
                  border = '1px solid rgba(212, 175, 55, 0.35)';
                } else if (day.count === 2) {
                  bg = 'rgba(212, 175, 55, 0.55)';
                  border = '1px solid rgba(212, 175, 55, 0.6)';
                } else if (day.count >= 3) {
                  bg = 'linear-gradient(135deg, #FFE066 0%, #D4AF37 100%)';
                  border = '1px solid #FFE066';
                  shadow = '0 0 8px rgba(212, 175, 55, 0.3)';
                }
                
                return (
                  <div
                    key={day.date}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: bg,
                      border: border,
                      boxShadow: shadow,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                    title={`${day.count} sessions on ${day.date}`}
                  >
                    <span style={{ fontSize: '8px', fontWeight: 800, color: day.count > 0 ? (day.count >= 3 ? '#0d0d12' : '#fff') : 'rgba(255,255,255,0.06)' }}>
                      {day.date.split('-')[2]}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '9px', color: 'var(--text-muted)' }}>
              <span>Less</span>
              <div style={{ width: '10px', height: '10px', background: 'rgba(212, 175, 55, 0.03)', border: '1px solid rgba(212,175,55,0.05)', borderRadius: '2px' }} />
              <div style={{ width: '10px', height: '10px', background: 'rgba(212, 175, 55, 0.22)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: '2px' }} />
              <div style={{ width: '10px', height: '10px', background: 'rgba(212, 175, 55, 0.55)', border: '1px solid rgba(212,175,55,0.6)', borderRadius: '2px' }} />
              <div style={{ width: '10px', height: '10px', background: '#D4AF37', borderRadius: '2px' }} />
              <span>More</span>
            </div>
          </div>

          {/* Weekly Timeline Rising Pillars */}
          <div className="glass-card" style={{ padding: '20px 16px' }}>
            <h4 style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              📊 Daily Timeline (Last 7 Days)
            </h4>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', height: '150px', alignItems: 'flex-end', padding: '0 8px', marginBottom: '8px', position: 'relative' }}>
              {timelineDays.map((item, idx) => {
                // Normalize height scale
                const heightPercent = Math.min(100, Math.max(10, (item.seconds / 180) * 100));
                const isHovered = hoveredPillar === idx;
                
                return (
                  <div
                    key={idx}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '36px', position: 'relative' }}
                    onMouseEnter={() => setHoveredPillar(idx)}
                    onMouseLeave={() => setHoveredPillar(null)}
                    onClick={() => setHoveredPillar(hoveredPillar === idx ? null : idx)}
                  >
                    {isHovered && item.seconds > 0 && (
                      <div className="chart-tooltip" style={{ bottom: `${heightPercent + 26}px`, left: '50%' }}>
                        <span style={{ fontWeight: 800, color: '#D4AF37' }}>{item.seconds}s Spoken</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Speaking Workout</span>
                      </div>
                    )}
                    <div
                      className="rising-pillar"
                      style={{
                        width: '14px',
                        height: `${heightPercent}px`,
                        background: item.seconds > 0 ? 'linear-gradient(to top, #A88A1E 0%, #D4AF37 70%, #FFD700 100%)' : 'rgba(212, 175, 55, 0.03)',
                        borderRadius: '8px',
                        boxShadow: item.seconds > 0 ? '0 0 10px rgba(212, 175, 55, 0.35)' : '',
                        animationDelay: `${idx * 0.08}s`
                      }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: 600, marginTop: '8px' }}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recordings list */}
          <div style={{ padding: '0 16px' }}>
            <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', fontWeight: 700 }}>
              Practice Recordings ({recordings.length})
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recordings.map((rec) => (
                <div key={rec.id} className="glass-card" style={{ margin: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.title}</h4>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {formatDate(rec.timestamp)} • Speed: <strong>{rec.wpm} WPM</strong>
                    </p>
                    <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} style={{ color: i < rec.stars ? '#D4AF37' : 'rgba(245, 240, 232, 0.12)', fontSize: '10px' }}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      onClick={() => playAudio(rec)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: playingId === rec.id ? '#ef4444' : 'rgba(212, 175, 55, 0.08)',
                        color: playingId === rec.id ? '#fff' : '#D4AF37',
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {playingId === rec.id ? <Pause size={12} fill="#fff" /> : <Play size={12} fill="#D4AF37" style={{ marginLeft: '1px' }} />}
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
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* --- COMPARISON STUDIO & TRENDS CHART --- */
        <div style={{ padding: '0 16px' }}>
          {selectedMissionsWithMultipleAttempts.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '30px', margin: 0 }}>
              Comparison mode requires at least <strong>two attempts on the same mission</strong>. 
              <br /><br />
              Go practice one of your completed stages again to unlock side-by-side growth comparisons!
            </div>
          ) : (
            <>
              {/* Mission Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.5px' }}>
                  Compare Attempts for Stage:
                </label>
                <select
                  value={targetMissionId || ''}
                  onChange={(e) => setTargetMissionId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: 'rgba(20, 18, 28, 0.85)',
                    border: '1px solid rgba(212, 175, 55, 0.22)',
                    borderRadius: '12px',
                    color: '#fff',
                    padding: '12px',
                    fontSize: '13px',
                    fontFamily: 'Outfit',
                    outline: 'none'
                  }}
                >
                  {selectedMissionsWithMultipleAttempts.map(id => {
                    const mission = recordings.find(r => r.missionId === id);
                    return (
                      <option key={id} value={id} style={{ background: '#0d0d12' }}>
                        Mission {id} - {mission?.title}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Version Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Old Attempt</label>
                  <select
                    value={oldRecId}
                    onChange={(e) => setOldRecId(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(20, 18, 28, 0.85)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '8px',
                      fontSize: '11px',
                      outline: 'none'
                    }}
                  >
                    {recordings.filter(r => r.missionId === targetMissionId).map(r => (
                      <option key={r.id} value={r.id} style={{ background: '#0d0d12' }}>
                        {formatDate(r.timestamp)} ({r.wpm} WPM)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>New Attempt</label>
                  <select
                    value={newRecId}
                    onChange={(e) => setNewRecId(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(20, 18, 28, 0.85)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '8px',
                      fontSize: '11px',
                      outline: 'none'
                    }}
                  >
                    {recordings.filter(r => r.missionId === targetMissionId).map(r => (
                      <option key={r.id} value={r.id} style={{ background: '#0d0d12' }}>
                        {formatDate(r.timestamp)} ({r.wpm} WPM)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Growth percentage overview */}
              {oldRec && newRec && (
                <div className="glass-card" style={{
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(20, 18, 28, 0.85) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.22)',
                  padding: '16px',
                  textAlign: 'center',
                  marginBottom: '16px'
                }}>
                  <span style={{ fontSize: '10px', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                    Fluency Acceleration Rate
                  </span>
                  <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#FFD700', fontFamily: 'Outfit', marginTop: '6px' }}>
                    {getGrowthPercent() >= 0 ? `+${getGrowthPercent()}%` : `${getGrowthPercent()}%`}
                  </h2>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Improvement rate in reading speed (WPM)
                  </p>
                </div>
              )}

              {/* Side-by-Side Sound Wave Studio */}
              <h5 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 700 }}>
                🎙️ Waveform Studio Comparison
              </h5>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div className="glass-card" style={{ margin: 0, padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(212,175,55,0.05)' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Old Waveform</span>
                  <div style={{ height: '36px', display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                    <svg width="100%" height="32" viewBox="0 0 160 32">
                      <path
                        d="M 5,16 Q 10,6 15,16 T 25,16 T 35,16 T 45,26 T 55,16 T 65,10 T 75,16 T 85,16 T 95,6 T 105,16 T 115,24 T 125,16 T 135,16 T 145,10 T 155,16"
                        fill="none"
                        stroke="#A88A1E"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>Speed: {oldRec?.wpm} WPM</span>
                    <span>Dur: {oldRec?.duration}s</span>
                  </div>
                </div>

                <div className="glass-card" style={{ margin: 0, padding: '12px', background: 'rgba(212, 175, 55, 0.03)', border: '1px solid rgba(212,175,55,0.15)' }}>
                  <span style={{ fontSize: '9px', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Waveform</span>
                  <div style={{ height: '36px', display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                    <svg width="100%" height="32" viewBox="0 0 160 32">
                      <path
                        d="M 5,16 Q 8,4 12,16 T 20,4 T 28,16 T 35,28 T 42,16 T 48,2 T 55,16 T 62,10 T 70,16 T 78,4 T 85,16 T 92,26 T 100,16 T 108,6 T 115,16 T 122,2 T 130,16 T 138,10 T 145,16 T 152,4 T 158,16"
                        fill="none"
                        stroke="url(#waveformGoldGradient)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 3px rgba(212, 175, 55, 0.4))' }}
                      />
                      <defs>
                        <linearGradient id="waveformGoldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#D4AF37" />
                          <stop offset="100%" stopColor="#FFD700" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#D4AF37', marginTop: '4px', fontWeight: 600 }}>
                    <span>Speed: {newRec?.wpm} WPM</span>
                    <span>Dur: {newRec?.duration}s</span>
                  </div>
                </div>
              </div>

              {/* Side-by-side Table Comparison */}
              {oldRec && newRec && (
                <div className="glass-card" style={{ margin: '0 0 20px', padding: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th style={{ padding: '8px 0', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Metric</th>
                        <th style={{ padding: '8px 0', color: '#A88A1E', fontWeight: 700 }}>Old Attempt</th>
                        <th style={{ padding: '8px 0', color: '#D4AF37', fontWeight: 700 }}>New Attempt</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 0', color: 'rgba(255,255,255,0.7)' }}>Reading Speed</td>
                        <td style={{ padding: '10px 0', fontWeight: 700 }}>{oldRec.wpm} WPM</td>
                        <td style={{ padding: '10px 0', fontWeight: 700, color: '#D4AF37' }}>{newRec.wpm} WPM</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 0', color: 'rgba(255,255,255,0.7)' }}>Completion Rate</td>
                        <td style={{ padding: '10px 0' }}>{oldRec.completionRate}%</td>
                        <td style={{ padding: '10px 0', color: '#D4AF37' }}>{newRec.completionRate}%</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 0', color: 'rgba(255,255,255,0.7)' }}>Speaking Time</td>
                        <td style={{ padding: '10px 0' }}>{oldRec.duration}s</td>
                        <td style={{ padding: '10px 0', color: '#D4AF37' }}>{newRec.duration}s</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px 0', color: 'rgba(255,255,255,0.7)' }}>Mastery Stars</td>
                        <td style={{ padding: '10px 0', color: '#D4AF37', fontSize: '9px' }}>{Array.from({ length: oldRec.stars }).map(() => '★')}</td>
                        <td style={{ padding: '10px 0', color: '#FFD700', fontSize: '9px' }}>{Array.from({ length: newRec.stars }).map(() => '★')}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Audio Playback Controls */}
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

              {/* Confidence Trend line chart */}
              <div className="glass-card" style={{ padding: '16px', position: 'relative' }}>
                <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', fontWeight: 700 }}>
                  📈 Confidence Trend (Last 10 Practices)
                </h4>
                <div style={{ position: 'relative', height: '140px', marginTop: '10px' }}>
                  {lineChartPoints.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                      No practices yet to display confidence trend.
                    </div>
                  ) : (
                    <svg width="100%" height="100" viewBox="0 0 360 100" style={{ overflow: 'visible' }}>
                      {/* Grid lines */}
                      <line x1="10" y1="10" x2="350" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="10" y1="50" x2="350" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="10" y1="90" x2="350" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      
                      {/* Trend Line */}
                      {confidenceLinePointsStr && (
                        <polyline
                          fill="none"
                          stroke="url(#confidenceLineGradient)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          points={confidenceLinePointsStr}
                          style={{ filter: 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.4))' }}
                        />
                      )}
                      
                      <defs>
                        <linearGradient id="confidenceLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#A88A1E" />
                          <stop offset="100%" stopColor="#FFD700" />
                        </linearGradient>
                      </defs>

                      {/* Line Nodes */}
                      {lineChartPoints.map((p, pIdx) => {
                        const isSelected = activeTooltipNode === pIdx;
                        return (
                          <g key={pIdx} style={{ cursor: 'pointer' }} onClick={() => setActiveTooltipNode(activeTooltipNode === pIdx ? null : pIdx)}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isSelected ? "6" : "4"}
                              fill="#0d0d12"
                              stroke="#D4AF37"
                              strokeWidth={isSelected ? "3" : "2"}
                              style={{ transition: 'all 0.15s' }}
                            />
                            {isSelected && (
                              <foreignObject x={p.x - 60} y={p.y - 65} width="120" height="60" style={{ overflow: 'visible' }}>
                                <div className="chart-tooltip" style={{ position: 'relative', left: '60px', top: '25px' }}>
                                  <span style={{ fontWeight: 800, color: '#D4AF37' }}>{p.r.stars * 20}% Confidence</span>
                                  <span style={{ color: 'var(--text-secondary)' }}>WPM: {p.r.wpm}</span>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '8px' }}>{new Date(p.r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                </div>
                              </foreignObject>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressScreen;
