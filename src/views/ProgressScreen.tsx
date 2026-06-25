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
        const sorted = [...missionRecs].sort((a, b) => a.timestamp - b.timestamp);
        setOldRecId(sorted[0].id); 
        setNewRecId(sorted[sorted.length - 1].id); 
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

  // Smooth Bezier Curve coordinates for last 10 attempts (Fluency Trend Graph)
  const last10Recs = [...recordings].slice(-10); // Chronological order
  const chartWidth = 340;
  const chartHeight = 80;
  
  const trendPoints = last10Recs.map((r, idx) => {
    const x = last10Recs.length > 1 ? (idx / (last10Recs.length - 1)) * (chartWidth - 20) + 10 : chartWidth / 2;
    const y = chartHeight - (Math.min(240, r.wpm) / 240) * (chartHeight - 20) - 10;
    return { x, y, r };
  });

  // Draw smooth bezier spline
  let trendPathD = '';
  let trendAreaPathD = '';
  if (trendPoints.length > 0) {
    trendPathD = `M ${trendPoints[0].x} ${trendPoints[0].y}`;
    for (let i = 1; i < trendPoints.length; i++) {
      const p0 = trendPoints[i - 1];
      const p1 = trendPoints[i];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      trendPathD += ` C ${cpX1} ${p0.y}, ${cpX2} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    trendAreaPathD = `${trendPathD} L ${trendPoints[trendPoints.length - 1].x} ${chartHeight} L ${trendPoints[0].x} ${chartHeight} Z`;
  }

  return (
    <div style={{ padding: '16px 0 32px' }}>
      {/* Title */}
      <div style={{ textAlign: 'center', padding: '0 16px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Manrope', color: 'var(--text-primary)' }}>
          Progress Reports
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Personal analytics for <strong style={{ color: 'var(--primary)' }}>{profile.username}</strong>
        </p>
      </div>

      {/* Segmented Mode Switch Tabs */}
      <div style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.02)',
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
            background: !compareMode ? 'var(--accent-gradient)' : 'none',
            borderRadius: '12px',
            color: !compareMode ? '#0B0D12' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <BarChart2 size={13} /> Analytics
        </button>
        <button
          onClick={() => setCompareMode(true)}
          style={{
            flex: 1,
            padding: '10px 4px',
            border: 'none',
            background: compareMode ? 'var(--accent-gradient)' : 'none',
            borderRadius: '12px',
            color: compareMode ? '#0B0D12' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Activity size={13} /> Comparison
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Loading analytics suite...</div>
      ) : recordings.length === 0 ? (
        /* Empty State */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', padding: '24px', textAlign: 'center' }}>
          <div className="spinning-border-outer" style={{ marginBottom: '24px' }}>
            <div className="spinning-border-inner">
              <Crown size={38} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Manrope' }}>
            No speaking data logged
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '260px', margin: '8px 0 24px', lineHeight: '1.45' }}>
            Aapki progress dashboard khali hai. Speaking Journey shuru karke pehli reading complete karein aur statistics generate karein.
          </p>
          <button
            onClick={() => onNavigate && onNavigate('journey')}
            className="btn-premium"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
          >
            <Sparkles size={16} /> Start Your Journey
          </button>
        </div>
      ) : !compareMode ? (
        /* --- ANALYTICS DASHBOARD --- */
        <>
          {/* Personal Record Card */}
          <div className="card-primary" style={{
            padding: '16px 20px',
            background: 'var(--card-gradient)',
            border: '1px solid var(--border-primary)',
            boxShadow: 'var(--shadow-md), var(--shadow-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(216, 139, 160, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid var(--border-primary)',
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0
            }}>
              <Crown size={22} style={{ color: 'var(--primary)' }} />
            </div>

            <div style={{ flex: 1, textAlign: 'left' }}>
              <div className="gold-tag" style={{ fontSize: '8px', padding: '2px 8px', letterSpacing: '0.5px', background: 'rgba(216, 139, 160, 0.12)', color: 'var(--primary)', borderColor: 'var(--border-primary)' }}>
                🏆 Personal Best
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Manrope', marginTop: '6px' }}>
                Fluency Peak: {highestWPM} WPM
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                "{highestWPMTitle}" • {highestWPMDate}
              </p>
            </div>
          </div>

          {/* Monthly Summary Card (Growth Stats) */}
          <div className="card-secondary" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '11px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                Monthly Performance Card
              </h4>
              {getGlobalGrowthPercent() > 0 && (
                <span style={{ fontSize: '9px', background: 'rgba(67, 217, 163, 0.12)', color: 'var(--success)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <TrendingUp size={10} /> Active Growth
                </span>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'Manrope' }}>
                  {recordings.length}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.3px' }}>Sessions</div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.05)', borderRight: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'Manrope' }}>
                  {(totalSpeakingTime / 60).toFixed(1)}m
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.3px' }}>Time Spoken</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--secondary)', fontFamily: 'Manrope' }}>
                  {getGlobalGrowthPercent() > 0 ? `+${getGlobalGrowthPercent()}%` : '0%'}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.3px' }}>Fluency Growth</div>
              </div>
            </div>
          </div>

          {/* Speedometer Gauge for Average WPM */}
          <div className="card-secondary" style={{ padding: '20px 16px', textAlign: 'center' }}>
            <h4 style={{ fontSize: '11px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '10px' }}>
              Fluency Velocity Speed (WPM)
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '14px 0' }}>
              <div style={{ position: 'relative', width: '220px', height: '140px' }}>
                <svg width="220" height="140" viewBox="0 0 220 140" style={{ overflow: 'visible' }}>
                  {/* Background Arc */}
                  <path
                    d="M 30 130 A 80 80 0 0 1 190 130"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.03)"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Rose Accent Zone Arc */}
                  <path
                    d="M 30 130 A 80 80 0 0 1 190 130"
                    fill="none"
                    stroke="url(#speedometerRoseGradient)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="250"
                    strokeDashoffset={250 - (Math.min(250, avgWPM) / 250) * 250}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                  <defs>
                    <linearGradient id="speedometerRoseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#D88BA0" />
                      <stop offset="100%" stopColor="#BC7287" />
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
                  background: 'var(--primary)',
                  transformOrigin: 'bottom center',
                  transform: `rotate(${speedometerAngle}deg)`,
                  transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                  borderRadius: '2px',
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
                  background: 'var(--primary)',
                  border: '2px solid var(--bg-deep)',
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
                  <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Manrope' }}>
                    {avgWPM}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500 }}>
                    Average WPM
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* GitHub-style Contribution Heatmap (Vibrant Emerald Scale) */}
          <div className="card-secondary" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '11px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', fontWeight: 700, textAlign: 'left' }}>
              📅 Practice Heatmap (Last 35 Days)
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', maxWidth: '280px', margin: '0 auto 12px' }}>
              {heatmapData.map((day) => {
                let bg = 'rgba(255, 255, 255, 0.02)';
                let border = '1px solid rgba(255, 255, 255, 0.04)';
                let shadow = '';
                if (day.count === 1) {
                  bg = 'rgba(67, 217, 163, 0.18)';
                  border = '1px solid rgba(67, 217, 163, 0.3)';
                } else if (day.count === 2) {
                  bg = 'rgba(67, 217, 163, 0.5)';
                  border = '1px solid rgba(67, 217, 163, 0.55)';
                } else if (day.count >= 3) {
                  bg = 'var(--green-gradient)';
                  border = '1px solid var(--success)';
                  shadow = 'none';
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
                    <span style={{ fontSize: '8.5px', fontWeight: 700, color: day.count > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.04)' }}>
                      {day.date.split('-')[2]}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '9px', color: 'var(--text-muted)' }}>
              <span>Less</span>
              <div style={{ width: '10px', height: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '2px' }} />
              <div style={{ width: '10px', height: '10px', background: 'rgba(67, 217, 163, 0.18)', border: '1px solid rgba(67, 217, 163, 0.3)', borderRadius: '2px' }} />
              <div style={{ width: '10px', height: '10px', background: 'rgba(67, 217, 163, 0.5)', border: '1px solid rgba(67, 217, 163, 0.55)', borderRadius: '2px' }} />
              <div style={{ width: '10px', height: '10px', background: 'var(--success)', borderRadius: '2px' }} />
              <span>More</span>
            </div>
          </div>

          {/* Premium Custom SVG WPM Trend curve (Bezier spline) */}
          <div className="card-secondary" style={{ padding: '20px 16px' }}>
            <h4 style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', letterSpacing: '0.8px', textTransform: 'uppercase', textAlign: 'left' }}>
              📈 Fluency Trend (Last 10 Attempts)
            </h4>
            
            <div style={{ position: 'relative', height: `${chartHeight}px`, width: '100%', overflow: 'visible' }}>
              {trendPoints.length > 0 ? (
                <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="trendAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(216, 139, 160, 0.15)" />
                      <stop offset="100%" stopColor="rgba(216, 139, 160, 0.0)" />
                    </linearGradient>
                    <linearGradient id="trendLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#D88BA0" />
                      <stop offset="100%" stopColor="#BC7287" />
                    </linearGradient>
                  </defs>
                  
                  {/* Area path */}
                  <path d={trendAreaPathD} fill="url(#trendAreaGrad)" />
                  
                  {/* Bezier Curve line */}
                  <path d={trendPathD} fill="none" stroke="url(#trendLineGrad)" strokeWidth="2.5" strokeLinecap="round" />
                  
                  {/* Data Point Dots */}
                  {trendPoints.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r="3" fill="#FFFFFF" stroke="var(--primary)" strokeWidth="1.5" />
                      {idx === trendPoints.length - 1 && (
                        <text x={p.x} y={p.y - 10} fill="var(--primary)" fontSize="9" fontWeight="700" textAnchor="middle">
                          {p.r.wpm}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '11px' }}>
                  Not enough data to plot trend line.
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
              <span>First Attempt</span>
              <span>Latest Practice Attempt</span>
            </div>
          </div>

          {/* Practice Recordings List */}
          <div style={{ padding: '0 16px' }}>
            <h4 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontWeight: 700, textAlign: 'left' }}>
              Practice Recordings ({recordings.length})
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recordings.map((rec) => (
                <div key={rec.id} className="card-minimal" style={{ margin: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.title}</h4>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {formatDate(rec.timestamp)} • Speed: <strong style={{ color: 'var(--primary)' }}>{rec.wpm} WPM</strong>
                    </p>
                    <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} style={{ color: i < rec.stars ? 'var(--reward)' : 'rgba(255, 255, 255, 0.08)', fontSize: '10px' }}>
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
                        background: playingId === rec.id ? 'var(--danger)' : 'rgba(216, 139, 160, 0.08)',
                        color: playingId === rec.id ? '#FFFFFF' : 'var(--primary)',
                        border: '1px solid rgba(216, 139, 160, 0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {playingId === rec.id ? <Pause size={11} fill="#fff" /> : <Play size={11} fill="var(--primary)" style={{ marginLeft: '1px' }} />}
                    </button>
                    <button
                      onClick={() => deleteRec(rec.id)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255, 92, 117, 0.08)',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* --- COMPARISON STUDIO (Linear Style Comparison Graphs) --- */
        <div style={{ padding: '0 16px' }}>
          {selectedMissionsWithMultipleAttempts.length === 0 ? (
            <div className="card-secondary" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 24px', margin: 0 }}>
              Comparison mode requires at least <strong>two attempts on the same mission</strong>. 
              <br /><br />
              Go practice one of your completed stages again to unlock side-by-side growth comparisons.
            </div>
          ) : (
            <>
              {/* Mission Selector */}
              <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Compare Attempts for Stage:
                </label>
                <select
                  value={targetMissionId || ''}
                  onChange={(e) => setTargetMissionId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    color: '#fff',
                    padding: '12px',
                    fontSize: '13px',
                    fontFamily: 'Manrope',
                    outline: 'none'
                  }}
                >
                  {selectedMissionsWithMultipleAttempts.map(id => {
                    const mission = recordings.find(r => r.missionId === id);
                    return (
                      <option key={id} value={id} style={{ background: 'var(--bg-deep)' }}>
                        Mission {id} - {mission?.title}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Version Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px', textAlign: 'left' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Old Attempt</label>
                  <select
                    value={oldRecId}
                    onChange={(e) => setOldRecId(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '8px',
                      fontSize: '11px',
                      outline: 'none'
                    }}
                  >
                    {recordings.filter(r => r.missionId === targetMissionId).map(r => (
                      <option key={r.id} value={r.id} style={{ background: 'var(--bg-deep)' }}>
                        {formatDate(r.timestamp)} ({r.wpm} WPM)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>New Attempt</label>
                  <select
                    value={newRecId}
                    onChange={(e) => setNewRecId(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '8px',
                      fontSize: '11px',
                      outline: 'none'
                    }}
                  >
                    {recordings.filter(r => r.missionId === targetMissionId).map(r => (
                      <option key={r.id} value={r.id} style={{ background: 'var(--bg-deep)' }}>
                        {formatDate(r.timestamp)} ({r.wpm} WPM)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Acceleration rate */}
              {oldRec && newRec && (
                <div className="card-primary" style={{
                  background: 'var(--card-gradient)',
                  border: '1px solid var(--border-primary)',
                  padding: '16px',
                  textAlign: 'center',
                  marginBottom: '18px',
                  boxShadow: 'var(--shadow-md), var(--shadow-primary)'
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                    Fluency Acceleration Rate
                  </span>
                  <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--secondary)', fontFamily: 'Manrope', marginTop: '6px' }}>
                    {getGrowthPercent() >= 0 ? `+${getGrowthPercent()}%` : `${getGrowthPercent()}%`}
                  </h2>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Improvement rate in reading speed (WPM)
                  </p>
                </div>
              )}

              {/* Side-by-Side Waveform Comparisons */}
              <h5 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', fontWeight: 700, textAlign: 'left' }}>
                🎙️ Waveform Studio Comparisons
              </h5>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div className="card-minimal" style={{ margin: 0, padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', textAlign: 'left' }}>Old Waveform</span>
                  <div style={{ height: '36px', display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                    <svg width="100%" height="32" viewBox="0 0 160 32">
                      <path
                        d="M 5,16 Q 10,6 15,16 T 25,16 T 35,16 T 45,26 T 55,16 T 65,10 T 75,16 T 85,16 T 95,6 T 105,16 T 115,24 T 125,16 T 135,16 T 145,10 T 155,16"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>{oldRec?.wpm} WPM</span>
                    <span>{oldRec?.duration}s</span>
                  </div>
                </div>

                <div className="card-minimal" style={{ margin: 0, padding: '12px', background: 'rgba(216, 139, 160, 0.03)', border: '1.5px solid var(--border-primary)' }}>
                  <span style={{ fontSize: '9px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', textAlign: 'left' }}>Recent Waveform</span>
                  <div style={{ height: '36px', display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                    <svg width="100%" height="32" viewBox="0 0 160 32">
                      <path
                        d="M 5,16 Q 8,4 12,16 T 20,4 T 28,16 T 35,28 T 42,16 T 48,2 T 55,16 T 62,10 T 70,16 T 78,4 T 85,16 T 92,26 T 100,16 T 108,6 T 115,16 T 122,2 T 130,16 T 138,10 T 145,16 T 152,4 T 158,16"
                        fill="none"
                        stroke="url(#waveformRoseGrad)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="waveformRoseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#D88BA0" />
                          <stop offset="100%" stopColor="#BC7287" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--primary)', marginTop: '4px', fontWeight: 600 }}>
                    <span>{newRec?.wpm} WPM</span>
                    <span>{newRec?.duration}s</span>
                  </div>
                </div>
              </div>

              {/* Side-by-side Table Comparison */}
              {oldRec && newRec && (
                <div className="card-secondary" style={{ margin: '0 0 20px', padding: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th style={{ padding: '8px 0', color: 'var(--text-muted)', fontWeight: 500 }}>Metric</th>
                        <th style={{ padding: '8px 0', color: 'var(--text-secondary)', fontWeight: 700 }}>Old Attempt</th>
                        <th style={{ padding: '8px 0', color: 'var(--primary)', fontWeight: 700 }}>New Attempt</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Reading Speed</td>
                        <td style={{ padding: '10px 0', fontWeight: 700, color: 'var(--text-primary)' }}>{oldRec.wpm} WPM</td>
                        <td style={{ padding: '10px 0', fontWeight: 700, color: 'var(--primary)' }}>{newRec.wpm} WPM</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Completion Rate</td>
                        <td style={{ padding: '10px 0', color: 'var(--text-primary)' }}>{oldRec.completionRate}%</td>
                        <td style={{ padding: '10px 0', color: 'var(--secondary)', fontWeight: 700 }}>{newRec.completionRate}%</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Speaking Time</td>
                        <td style={{ padding: '10px 0', color: 'var(--text-primary)' }}>{oldRec.duration}s</td>
                        <td style={{ padding: '10px 0', color: 'var(--primary)' }}>{newRec.duration}s</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Mastery Stars</td>
                        <td style={{ padding: '10px 0', color: 'var(--reward)', fontSize: '9px' }}>{Array.from({ length: oldRec.stars }).map(() => '★')}</td>
                        <td style={{ padding: '10px 0', color: 'var(--reward)', fontSize: '9px' }}>{Array.from({ length: newRec.stars }).map(() => '★')}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Playback Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      onClick={() => playAudio(oldRec)}
                      className="btn-secondary"
                      style={{ padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      {playingId === oldRec.id ? <Pause size={12} /> : <Play size={12} />}
                      Play Old
                    </button>
                    <button
                      onClick={() => playAudio(newRec)}
                      className="btn-premium"
                      style={{ padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      {playingId === newRec.id ? <Pause size={12} /> : <Play size={12} />}
                      Play Recent
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
