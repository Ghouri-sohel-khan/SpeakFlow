export interface UserProfile {
  username: string;
  avatar: string; // student, professional, traveler, entrepreneur
  level: 'beginner' | 'intermediate' | 'advanced';
  xp: number;
  coins: number;
  streak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  startDate: string; // YYYY-MM-DD
  achievements: string[]; // achievementIds
  completedMissions: Record<number, {
    stars: number;
    wpm: number;
    timestamp: number;
    completionRate: number;
  }>;
}

export interface VoiceRecording {
  id: string;
  missionId: number;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  timestamp: number;
  audioUrl?: string; // transient url created during load
  audioBlob: Blob;
  duration: number; // seconds
  wordsRead: number;
  wpm: number;
  stars: number;
  completionRate: number;
}

export interface VoiceDiaryEntry {
  id: string;
  timestamp: number;
  audioBlob: Blob;
  audioUrl?: string;
  duration: number; // seconds
  note: string;
}

const DB_NAME = 'SpeakFlowDB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

// Initialize IndexedDB
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('recordings')) {
        db.createObjectStore('recordings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('diary')) {
        db.createObjectStore('diary', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
};

const DEFAULT_PROFILE = (name: string = 'SpeakFlow Practitioner'): UserProfile => ({
  username: name,
  avatar: 'student',
  level: 'beginner',
  xp: 0,
  coins: 0,
  streak: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  startDate: new Date().toISOString().split('T')[0],
  achievements: [],
  completedMissions: {}
});

// Sync delay simulation for Firebase
export const simulateFirebaseSync = (): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 1200);
  });
};

export const dbService = {
  // --- Profile state (LocalStorage) ---
  getProfile(): UserProfile {
    const data = localStorage.getItem('speakflow_profile');
    if (!data) {
      const newProf = DEFAULT_PROFILE();
      localStorage.setItem('speakflow_profile', JSON.stringify(newProf));
      return newProf;
    }
    return JSON.parse(data);
  },

  saveProfile(profile: UserProfile): void {
    localStorage.setItem('speakflow_profile', JSON.stringify(profile));
  },

  resetProfile(name?: string): UserProfile {
    const newProf = DEFAULT_PROFILE(name);
    this.saveProfile(newProf);
    return newProf;
  },

  // --- Voice Recordings (IndexedDB) ---
  async saveRecording(recording: Omit<VoiceRecording, 'id'>): Promise<string> {
    const db = await getDB();
    const id = `rec_${recording.missionId}_${Date.now()}`;
    const item: VoiceRecording = { ...recording, id };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('recordings', 'readwrite');
      const store = transaction.objectStore('recordings');
      const request = store.add(item);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  },

  async getRecordings(): Promise<VoiceRecording[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('recordings', 'readonly');
      const store = transaction.objectStore('recordings');
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as VoiceRecording[];
        // Sort by timestamp descending (newest first)
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getRecordingsForMission(missionId: number): Promise<VoiceRecording[]> {
    const recs = await this.getRecordings();
    return recs.filter(r => r.missionId === missionId);
  },

  async deleteRecording(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('recordings', 'readwrite');
      const store = transaction.objectStore('recordings');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // --- Voice Diary (IndexedDB) ---
  async saveDiaryEntry(entry: Omit<VoiceDiaryEntry, 'id'>): Promise<string> {
    const db = await getDB();
    const id = `diary_${Date.now()}`;
    const item: VoiceDiaryEntry = { ...entry, id };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('diary', 'readwrite');
      const store = transaction.objectStore('diary');
      const request = store.add(item);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  },

  async getDiaryEntries(): Promise<VoiceDiaryEntry[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('diary', 'readonly');
      const store = transaction.objectStore('diary');
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as VoiceDiaryEntry[];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async deleteDiaryEntry(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('diary', 'readwrite');
      const store = transaction.objectStore('diary');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};
