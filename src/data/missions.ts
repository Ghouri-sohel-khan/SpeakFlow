import missionsData from './missions.json';

export interface Mission {
  id: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  title: string;
  category: string;
  type: 'reading' | 'speed' | 'revisit' | 'story' | 'challenge';
  estimated_duration: number; // in seconds
  word_count: number;
  xp: number;
  coins: number;
  environment: string;
  content: string;
  variations: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  coinReward: number;
  targetType: 'missions' | 'streak' | 'time' | 'level' | 'all';
  targetValue: number;
}

export interface DailyChallenge {
  id: string;
  prompt: string;
  duration: number; // typical speaking seconds
  xp: number;
  coins: number;
}

const BEGINNER_ENVIRONMENTS = ['Village', 'School', 'Library', 'Town'];
const INTERMEDIATE_ENVIRONMENTS = ['Town', 'Business District', 'Technology Hub', 'Capital City'];
const ADVANCED_ENVIRONMENTS = ['Capital City', 'Kingdom', 'Empire', 'Elite Speaker'];

export const generateMissions = (): Mission[] => {
  return (missionsData as any[]).map((entry) => {
    const indexInTier = (entry.id - 1) % 50;
    
    // Determine type
    let type: Mission['type'] = 'reading';
    if (indexInTier % 5 === 1) type = 'speed';
    else if (indexInTier % 5 === 2) type = 'revisit';
    else if (indexInTier % 5 === 3) type = 'story';
    else if (indexInTier % 5 === 4) type = 'challenge';

    // XP and Coins
    const xp = 10;
    let coins = 5;
    if (entry.difficulty === 'intermediate') coins = 10;
    else if (entry.difficulty === 'advanced') coins = 15;

    // Environment
    let envs = BEGINNER_ENVIRONMENTS;
    if (entry.difficulty === 'intermediate') envs = INTERMEDIATE_ENVIRONMENTS;
    if (entry.difficulty === 'advanced') envs = ADVANCED_ENVIRONMENTS;

    let environment = envs[3];
    if (indexInTier < 12) environment = envs[0];
    else if (indexInTier < 25) environment = envs[1];
    else if (indexInTier < 38) environment = envs[2];

    return {
      id: entry.id,
      difficulty: entry.difficulty,
      title: entry.title,
      category: entry.category,
      type,
      estimated_duration: entry.estimated_duration,
      word_count: entry.word_count,
      xp,
      coins,
      environment,
      content: entry.content,
      variations: entry.variations
    };
  });
};

// Available Avatars
export interface Avatar {
  id: string;
  name: string;
  description: string;
  image: string;
}

export const AVATARS: Avatar[] = [
  { id: 'student', name: 'Student', description: 'Grows from Learner to Scholar.', image: '🎓' },
  { id: 'professional', name: 'Professional', description: 'Grows from Executive to Leader.', image: '💼' },
  { id: 'traveler', name: 'Traveler', description: 'Grows from Explorer to Global Citizen.', image: '✈️' },
  { id: 'entrepreneur', name: 'Entrepreneur', description: 'Grows from Founder to Tycoon.', image: '🚀' }
];

// Achievements Definitions
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_mission',
    title: 'First Step',
    description: 'Ek chhota kadam, badi kamyabi ki shuruat! Aapne apna pehla mission pura kar liya hai.',
    icon: '🎯',
    xpReward: 15,
    coinReward: 5,
    targetType: 'missions',
    targetValue: 1
  },
  {
    id: 'missions_10',
    title: 'Speaking Routine',
    description: 'Consistency is key! Aapne apni practice ko apni aadat bana liya hai.',
    icon: '⚡',
    xpReward: 30,
    coinReward: 10,
    targetType: 'missions',
    targetValue: 10
  },
  {
    id: 'missions_50',
    title: 'Village Elder',
    description: 'Ab aap sirf learner nahi, guide ban chuke hain. Village level par aapki pakad mazboot hai.',
    icon: '🏡',
    xpReward: 100,
    coinReward: 50,
    targetType: 'missions',
    targetValue: 50
  },
  {
    id: 'missions_100',
    title: 'City Slicker',
    description: 'City ki bhag-daur mein bhi aapne apni speaking practice jari rakhi. Bahut khub!',
    icon: '🏢',
    xpReward: 150,
    coinReward: 75,
    targetType: 'missions',
    targetValue: 100
  },
  {
    id: 'missions_200',
    title: 'Fluent Orator',
    description: 'Ab aapke shabdon mein wo flow aur confidence hai jo ek expert speaker ke paas hota hai.',
    icon: '🗣️',
    xpReward: 250,
    coinReward: 125,
    targetType: 'missions',
    targetValue: 200
  },
  {
    id: 'streak_7',
    title: 'Week on Fire',
    description: 'Aapki lagan aur mehnat se ek poora hafta roshan ho gaya hai. Keep the fire burning!',
    icon: '🔥',
    xpReward: 50,
    coinReward: 20,
    targetType: 'streak',
    targetValue: 7
  },
  {
    id: 'streak_30',
    title: 'Habit Master',
    description: '30 din ki nirantar mehnat! Aapne discipline ka naya benchmark set kar diya hai.',
    icon: '👑',
    xpReward: 150,
    coinReward: 80,
    targetType: 'streak',
    targetValue: 30
  },
  {
    id: 'midnight_speaker',
    title: 'Midnight Speaker',
    description: 'Jab duniya so rahi hoti hai, aap apni skills ko polish kar rahe hote hain. Dedicated!',
    icon: '🌙',
    xpReward: 80,
    coinReward: 40,
    targetType: 'time', // Will be custom evaluated for Night session in App.tsx
    targetValue: 1
  },
  {
    id: 'gold_medalist',
    title: 'Gold Medalist',
    description: 'Aapne milestone ke sare records tod diye hain. Aap SpeakFlow ke asli champion hain!',
    icon: '🏅',
    xpReward: 500,
    coinReward: 250,
    targetType: 'missions',
    targetValue: 500
  },
  {
    id: 'grand_master',
    title: 'Grand Master',
    description: 'SpeakFlow Practitioner ke सर्वोच्च shikhar par! Aapne sabhi chunautiyon ko paar kar liya hai.',
    icon: '🏆',
    xpReward: 1000,
    coinReward: 500,
    targetType: 'all', // Unlocked when all other achievements are earned
    targetValue: 9
  }
];

// Daily Challenges
export const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: 'dc1', prompt: 'Describe your hometown and what makes it special to you.', duration: 60, xp: 15, coins: 10 },
  { id: 'dc2', prompt: 'Talk about your favorite movie and why everyone should watch it.', duration: 60, xp: 15, coins: 10 },
  { id: 'dc3', prompt: 'Describe your dream job and the skills required to succeed in it.', duration: 60, xp: 15, coins: 10 },
  { id: 'dc4', prompt: 'Talk about a book that changed the way you think about the world.', duration: 60, xp: 15, coins: 10 },
  { id: 'dc5', prompt: 'If you could travel anywhere in the universe, where would you go and why?', duration: 60, xp: 15, coins: 10 },
  { id: 'dc6', prompt: 'Share your most effective daily habit and how it improves your productivity.', duration: 60, xp: 15, coins: 10 },
  { id: 'dc7', prompt: 'Describe a person who has had the greatest impact on your career or life.', duration: 60, xp: 15, coins: 10 }
];

export const getDailyChallengeForDay = (dayIndex: number): DailyChallenge => {
  return DAILY_CHALLENGES[dayIndex % DAILY_CHALLENGES.length];
};
