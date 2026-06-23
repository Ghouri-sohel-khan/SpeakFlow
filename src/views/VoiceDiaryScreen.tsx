import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Mic, Square, Save, Trash2, Calendar, Shuffle } from 'lucide-react';
import { dbService } from '../services/db';
import type { VoiceDiaryEntry } from '../services/db';

// Offline library of diverse, simple speaking prompts
const LOCAL_SPEAKING_PROMPTS = [
  "Speak about your city and what makes it unique.",
  "Describe your favorite movie character and why you admire them.",
  "What are your daily habits for staying productive?",
  "Tell me about fruits you like and their health benefits.",
  "Describe your ideal vacation destination and why you want to visit it.",
  "What is the most memorable gift you have ever received?",
  "Talk about a book that had a significant impact on your life.",
  "If you could have any superpower, what would it be and how would you use it?",
  "Describe a typical weekend in your life.",
  "What is your favorite season of the year and why?",
  "Talk about a hobby you enjoy and how you got started with it.",
  "Describe a person who has inspired you recently.",
  "What is the best piece of advice you have ever received?",
  "Describe your favorite childhood memory.",
  "Talk about a dish you love to cook or eat.",
  "If you could meet any historical figure, who would it be and what would you ask them?",
  "What are the qualities of a good friend, in your opinion?",
  "Describe a skill you would like to learn in the future.",
  "What are your favorite ways to relax after a long day?",
  "Describe your dream house in detail.",
  "Talk about a recent challenge you faced and how you overcame it.",
  "What is your favorite type of music and how does it make you feel?",
  "Describe a beautiful place you have visited in nature.",
  "Talk about a job or profession you find fascinating.",
  "If you could travel back in time, which era would you visit?",
  "Describe a local festival or celebration in your culture.",
  "What is the role of technology in your daily life?",
  "Talk about a teacher who made a difference in your education.",
  "If you could open any business, what would it be?",
  "Describe a project you worked on that you are proud of.",
  "What are your goals for the next twelve months?",
  "Talk about a sport you like to play or watch.",
  "Describe your favorite animal and what makes it interesting.",
  "If you could live in another country for a year, where would you choose?",
  "Talk about a movie or show that made you laugh out loud.",
  "Describe a historic monument or place in your country.",
  "What is the importance of learning a second language, in your view?",
  "Describe your daily morning routine.",
  "Talk about a family tradition you cherish.",
  "If you could change one thing about the world, what would it be?",
  "Describe a game you like to play, whether digital or physical.",
  "What are the benefits of regular exercise, in your opinion?",
  "Talk about a public figure you respect and why.",
  "Describe a memorable meal you had with family or friends.",
  "If you had to live without internet for a week, how would you spend your time?",
  "What are your thoughts on public transportation in your area?",
  "Describe a museum or art gallery you have visited.",
  "Talk about a pet you have or wish to have.",
  "What is the most beautiful sound in the world to you?",
  "Describe your favorite room in your home.",
  "What is your favorite holiday and how do you celebrate it?",
  "If you could master any musical instrument, which one would it be?",
  "Describe a time you volunteered or helped someone in need.",
  "Talk about the importance of saving money.",
  "Describe your favorite street or neighborhood in your city.",
  "If you could tell your younger self one thing, what would it be?",
  "Talk about a product or app you use every single day.",
  "Describe a time you laughed uncontrollably.",
  "What is the best way to spend a daily rainy day, in your opinion."
];

export const VoiceDiaryScreen: React.FC = () => {
  const [diaryEntries, setDiaryEntries] = useState<VoiceDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetDuration, setTargetDuration] = useState<number>(30); // 30, 60, 90 seconds
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [note, setNote] = useState('');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [currentTopic, setCurrentTopic] = useState('');

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
    shuffleTopic();
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

  const shuffleTopic = () => {
    const randomIndex = Math.floor(Math.random() * LOCAL_SPEAKING_PROMPTS.length);
    setCurrentTopic(LOCAL_SPEAKING_PROMPTS[randomIndex]);
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
        setNote(currentTopic); // Pre-populate the note input with the current prompt
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
      setNote(currentTopic); // Pre-populate the note input with the current prompt
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
        ctx.fillStyle = `rgba(212, 175, 55, ${0.4 + (barHeight / canvas.height)})`;
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

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
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
      const finalNote = note.trim() || `Topic: ${currentTopic}`;
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
      shuffleTopic(); // Choose another random topic for the next round
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
        <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
          Voice Diary
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Free speaking mode to track confidence and vocabulary growth
        </p>
      </div>

      {/* Practice Topic Card */}
      {!isRecording && !recordedBlob && (
        <div className="glass-card anim-slide-up" style={{
          padding: '20px 18px',
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.06) 0%, rgba(20, 18, 28, 0.85) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div className="gold-tag" style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '9px' }}>
              💡 Practice Topic
            </div>
            <button
              onClick={shuffleTopic}
              className="shuffle-button-hover"
              style={{
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D4AF37',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              title="Shuffle Topic"
            >
              <Shuffle size={14} />
            </button>
          </div>

          <p style={{
            fontSize: '18px',
            fontWeight: 700,
            fontFamily: 'Outfit',
            color: 'var(--text-primary)',
            lineHeight: '1.45',
            margin: '0',
          }}>
            "{currentTopic}"
          </p>
        </div>
      )}

      {/* Recording Studio Card */}
      <div className="glass-card" style={{ padding: '20px 16px', background: 'rgba(20, 18, 28, 0.82)', border: '1px solid rgba(212, 175, 55, 0.12)' }}>
        <h4 style={{ fontSize: '10px', color: '#D4AF37', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 700, letterSpacing: '1.5px', textAlign: 'center' }}>
          Recording Studio
        </h4>

        {/* Target Duration Selectors */}
        {!isRecording && !recordedBlob && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            {([30, 60, 90]).map(sec => (
              <button
                key={sec}
                onClick={() => setTargetDuration(sec)}
                style={{
                  width: '76px',
                  padding: '8px 0',
                  borderRadius: '12px',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: targetDuration === sec ? 'linear-gradient(135deg, #D4AF37, #A88A1E)' : 'rgba(212, 175, 55, 0.03)',
                  color: targetDuration === sec ? '#0d0d12' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'Outfit'
                }}
              >
                {sec}s Limit
              </button>
            ))}
          </div>
        )}

        {/* Large Centered Counter */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'Outfit', color: isRecording ? '#D4AF37' : 'var(--text-secondary)' }}>
            {isRecording ? formatTime(elapsedSeconds) : `${targetDuration}s`}
          </span>
          <p style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
            {isRecording ? 'Speaking Time' : 'Practice Target'}
          </p>
        </div>

        {/* Centered Trigger Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '14px 0 20px' }}>
          {isRecording ? (
            <button
              onClick={stopRecording}
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #D4AF37 0%, #A88A1E 100%)',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0d0d12',
                cursor: 'pointer',
                boxShadow: '0 0 30px rgba(212, 175, 55, 0.6)',
                animation: 'pulse-record 1.5s infinite alternate',
                transition: 'all 0.3s ease',
                gap: '4px'
              }}
            >
              <Square size={18} fill="#0d0d12" />
              <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stop</span>
            </button>
          ) : !recordedBlob ? (
            <button
              onClick={startRecording}
              className="record-button-hover"
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'rgba(212, 175, 55, 0.05)',
                border: '2px solid #D4AF37',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D4AF37',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(212, 175, 55, 0.1)',
                transition: 'all 0.3s ease',
                gap: '4px'
              }}
            >
              <Mic size={22} />
              <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Start</span>
            </button>
          ) : (
            /* Review & Save Phase */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '16px', padding: '12px 14px' }}>
                <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Diary Note (Pre-populated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Practiced my speaking routine..."
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
                    fontSize: '13px',
                    fontFamily: 'Inter'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setRecordedBlob(null)}>
                  Discard
                </button>
                <button className="btn-premium" style={{ flex: 1, padding: '10px' }} onClick={saveDiary}>
                  <Save size={14} /> Save Diary
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Canvas Visualizer */}
        {(isRecording || recordedBlob) && (
          <canvas ref={canvasRef} className="waveform-canvas" width="380" height="60" style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '14px' }}></canvas>
        )}
      </div>

      {/* Historical List */}
      <div style={{ padding: '0 16px', marginTop: '24px' }}>
        <h4 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px', fontWeight: 700 }}>
          Diary History ({diaryEntries.length})
        </h4>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading history...</div>
        ) : diaryEntries.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', margin: 0 }}>
            Your voice diary is empty. Start your first speaking workout above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {diaryEntries.map((entry) => (
              <div key={entry.id} className="glass-card" style={{ margin: 0, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
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

                <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, margin: '8px 0 12px', lineHeight: '1.4' }}>
                  "{entry.note}"
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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
                      background: playingId === entry.id ? '#ef4444' : 'linear-gradient(135deg, #D4AF37, #A88A1E)',
                      color: playingId === entry.id ? '#fff' : '#0d0d12',
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
