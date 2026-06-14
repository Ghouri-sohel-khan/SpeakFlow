import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Mic, Square, Save, Trash2, Calendar } from 'lucide-react';
import { dbService } from '../services/db';
import type { VoiceDiaryEntry } from '../services/db';

export const VoiceDiaryScreen: React.FC = () => {
  const [diaryEntries, setDiaryEntries] = useState<VoiceDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetDuration, setTargetDuration] = useState<number>(30); // 30, 60, 90 seconds
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [note, setNote] = useState('');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Playback state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stream/Canvas References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadDiaryEntries();
    return () => {
      stopRecordingCleanup();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const loadDiaryEntries = async () => {
    try {
      const entries = await dbService.getDiaryEntries();
      setDiaryEntries(entries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      setRecordedBlob(null);
      setElapsedSeconds(0);
      setIsRecording(true);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
      };

      mediaRecorder.start();
      
      // Start visualizer
      startVisualizer(stream);

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          if (prev >= targetDuration - 1) {
            stopRecording();
            return targetDuration;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.warn('Microphone inaccessible. Falling back to simulated audio diary.', err);
      // Fallback sine wave visualizer
      startMockVisualizer();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          if (prev >= targetDuration - 1) {
            stopRecording();
            return targetDuration;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    stopRecordingCleanup();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Mock blob fallback
      setRecordedBlob(new Blob([], { type: 'audio/webm' }));
    }
  };

  const stopRecordingCleanup = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startVisualizer = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!canvasRef.current) return;
      animationFrameIdRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
        ctx.fillStyle = `rgba(168, 85, 247, ${0.4 + (barHeight / canvas.height)})`; // Purple theme colors
        ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth - 4, barHeight);
        x += barWidth;
      }
    };
    draw();
  };

  const startMockVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const drawMock = () => {
      if (!canvasRef.current) return;
      animationFrameIdRef.current = requestAnimationFrame(drawMock);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + Math.sin(x * 0.05 + phase) * 12 * Math.sin(phase * 0.15);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      phase += 0.15;
    };
    drawMock();
  };

  const saveDiary = async () => {
    if (!recordedBlob) return;
    try {
      const finalNote = note.trim() || 'Free Speech Practice';
      await dbService.saveDiaryEntry({
        timestamp: Date.now(),
        audioBlob: recordedBlob,
        duration: elapsedSeconds,
        note: finalNote
      });
      
      // Reset layout
      setRecordedBlob(null);
      setNote('');
      setElapsedSeconds(0);
      loadDiaryEntries();
    } catch (err) {
      console.error(err);
    }
  };

  const playEntry = (entry: VoiceDiaryEntry) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (playingId === entry.id) {
      setPlayingId(null);
      return;
    }

    const url = URL.createObjectURL(entry.audioBlob);
    audioRef.current = new Audio(url);
    audioRef.current.play();
    setPlayingId(entry.id);

    audioRef.current.onended = () => {
      setPlayingId(null);
      URL.revokeObjectURL(url);
    };
  };

  const deleteEntry = async (id: string) => {
    if (window.confirm('Delete this diary entry?')) {
      await dbService.deleteDiaryEntry(id);
      loadDiaryEntries();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ textAlign: 'center', padding: '0 16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Outfit', color: '#fff' }}>
          Voice Diary
        </h2>
        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
          Free speaking mode to track confidence and vocabulary growth
        </p>
      </div>

      {/* Recording Studio Card */}
      <div className="glass-card" style={{ padding: '20px 16px', background: 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(99,102,241,0.05) 100%)', border: '1px solid var(--border)' }}>
        <h4 style={{ fontSize: '13px', color: '#c084fc', textTransform: 'uppercase', marginBottom: '14px', fontWeight: 700 }}>
          Diary Recording Studio
        </h4>

        {/* Target Selectors */}
        {!isRecording && !recordedBlob && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {([30, 60, 90]).map(sec => (
              <button
                key={sec}
                onClick={() => setTargetDuration(sec)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: targetDuration === sec ? 'var(--secondary)' : 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {sec} Seconds
              </button>
            ))}
          </div>
        )}

        {/* Canvas Visualizer */}
        <canvas ref={canvasRef} className="waveform-canvas" width="380" height="60" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '14px' }}></canvas>

        {/* Duration / Counter Display */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', color: '#fff' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            {isRecording ? 'Recording elapsed...' : 'Limit selected:'}
          </span>
          <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'Outfit' }}>
            {isRecording ? formatTime(elapsedSeconds) : `${targetDuration}s`}
          </span>
        </div>

        {/* Trigger Controls */}
        <div style={{ marginTop: '16px' }}>
          {isRecording ? (
            <button className="btn-secondary" style={{ width: '100%', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }} onClick={stopRecording}>
              <Square size={16} fill="#ef4444" /> Stop & Review
            </button>
          ) : !recordedBlob ? (
            <button className="btn-premium" style={{ width: '100%' }} onClick={startRecording}>
              <Mic size={16} /> Tap to Start Speaking
            </button>
          ) : (
            /* Review & Save Phase */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px' }}>
                <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  What did you talk about? (Add Diary Note)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Practiced my morning routine speech..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1.5px solid var(--border)',
                    outline: 'none',
                    color: '#fff',
                    padding: '4px 0',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setRecordedBlob(null)}>
                  Discard
                </button>
                <button className="btn-premium" style={{ flex: 1 }} onClick={saveDiary}>
                  <Save size={14} /> Save Diary
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historical List */}
      <div style={{ padding: '0 16px' }}>
        <h4 style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
          Diary History ({diaryEntries.length})
        </h4>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)' }}>Loading history...</div>
        ) : diaryEntries.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '24px' }}>
            Your voice diary is empty. Start your first free speaking workout above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {diaryEntries.map((entry) => (
              <div key={entry.id} className="glass-card" style={{ margin: 0, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)' }}>
                    <Calendar size={14} />
                    <span style={{ fontSize: '10px', fontWeight: 600 }}>{formatDate(entry.timestamp)}</span>
                  </div>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.6)', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <p style={{ fontSize: '13px', color: '#fff', fontWeight: 500, margin: '8px 0 12px' }}>
                  "{entry.note}"
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    Duration: <strong>{entry.duration} seconds</strong>
                  </span>
                  
                  <button
                    onClick={() => playEntry(entry)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      background: playingId === entry.id ? '#ef4444' : 'var(--primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {playingId === entry.id ? (
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default VoiceDiaryScreen;
