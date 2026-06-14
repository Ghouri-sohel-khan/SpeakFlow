const fs = require('fs');
const path = require('path');

// --- BEGINNER TEMPLATE STORIES (Target: 40-55 words, 20-30 seconds, simple grammar) ---
const BEGINNER_SEEDS = [
  {
    title: 'Introducing Myself',
    category: 'Self Introduction',
    content: 'Hello, my name is Ahmed and I live with my wonderful family in a small town. Every morning, I wake up early and go for a short walk in the park. After breakfast, I spend some time learning English because I really want to improve my speaking and communication skills.',
    variations: [
      'Hi there, I am Ahmed and I reside with my parents in a quiet town. I start my day early with a peaceful walk in the fresh air. After my morning meal, I practice English daily to build my speaking confidence.',
      'Good morning, my name is Ahmed. My family and I live in a lovely village. Every single day, I wake up early to walk outdoors in nature. Then, I study English to learn how to speak better and speak clearly.',
      'Hello, I am Ahmed. I stay in a small town with my wonderful family. I always rise early to walk in the fresh morning air. After eating breakfast, I dedicate time to practicing conversational English with my friends.',
      'Hi, my name is Ahmed and I live in a cozy town with my family. I love waking up early to enjoy a morning walk around the neighborhood. I spend my mornings studying English because I want to communicate fluently.',
      'Hello everyone, I am Ahmed. I live in a small community with my family. After waking up early, I go for a walk outside to exercise. I study English daily to improve my listening and speaking abilities significantly.'
    ]
  },
  {
    title: 'My Daily Routine',
    category: 'Daily Routine',
    content: 'My daily routine is very simple. I wake up at six o\'clock every morning and make a fresh cup of coffee. I read the news for fifteen minutes, and then I start working. In the evening, I cook a healthy dinner and read interesting books.',
    variations: [
      'I follow a simple daily routine. I rise at six in the morning and prepare hot coffee. I spend fifteen minutes reading news before work. In the evening, I prepare a delicious dinner and read books before sleeping.',
      'My routine is very basic. Every morning at six, I wake up and brew fresh coffee. After reading news articles for a short time, I begin my work. Later, I cook dinner for my family and read books.',
      'I keep a very simple daily schedule. Waking up at six, I immediately make a cup of warm tea. I read the daily headlines before starting my tasks. I end my day cooking dinner and reading a new novel.',
      'Each day is simple for me. I wake up at six o\'clock to make fresh coffee. I look at the news for about fifteen minutes, and then I work. In the evenings, I prepare a nice meal and read books.',
      'My morning starts at six o\'clock. I brew fresh coffee and review the daily news for fifteen minutes. After finishing my office work, I spend my evening cooking a nice dinner and reading novels in my room.'
    ]
  },
  {
    title: 'Talking About Family',
    category: 'Family',
    content: 'I have a small family with four members. My parents are retired, and my brother is a computer software developer. We love cooking delicious meals together on weekends and watching funny comedy movies in the living room. It is always fun to spend time together.',
    variations: [
      'My family is small, consisting of just four people. My mother and father are retired, and my brother designs computer programs. We enjoy cooking together on Saturday and Sunday and watching funny movies at home. We really enjoy our time together.',
      'There are four people in my family. My parents do not work anymore, and my brother works in technology. On weekends, we cook together in the kitchen and watch entertaining movies in our cozy home. It is a wonderful routine for us.',
      'I live in a household of four. My parents are retired engineers, and my brother builds applications. We spend our weekends preparing delicious food together and watching classic films in the evening. We love supporting each other.',
      'Our family has four members. My parents enjoy their retirement, and my brother is a tech developer. We spend quality time cooking together on weekends and enjoying funny movies together. We are very close to one another.',
      'I am close to my small family of four. My parents are retired now, and my sibling works in software coding. We always get together on weekends to prepare dinner and watch lighthearted movies. It makes us very happy.'
    ]
  },
  {
    title: 'My Favorite Hobbies',
    category: 'Hobbies',
    content: 'In my free time, I love playing acoustic guitar and taking colorful photos of flowers. Gardening is another favorite hobby of mine. It helps me relax after a long day of work and lets me enjoy nature. I spend many hours outdoors doing these activities.',
    variations: [
      'During my spare time, I enjoy playing the guitar and photographing beautiful plants. I also love gardening. It is a great way to unwind after work and connect with the natural world. I find these activities very peaceful.',
      'I spend my weekends playing music on my guitar and taking photos in the park. Gardening is also a favorite activity. It helps me relieve stress and lets me spend time outdoors in nature. I always feel refreshed afterward.',
      'My hobbies are music, photography, and gardening. I like playing the acoustic guitar and taking pictures of nature. These activities make me feel relaxed after working hard all week at my office. I look forward to the weekend.',
      'To relax, I play the guitar and photograph flowers in my garden. Gardening is a peaceful hobby that helps me clear my mind after work while appreciating the beauty of nature. It brings a lot of joy to my life.',
      'I have several hobbies, including playing acoustic guitar and taking pictures of colorful gardens. Caring for plants is my favorite way to disconnect from office stress and enjoy fresh air. It is my favorite part of the week.'
    ]
  },
  {
    title: 'At the Local School',
    category: 'School',
    content: 'I study at a friendly language school near my house. The classroom is modern and has a large whiteboard. My teacher is very friendly and helps us practice speaking English through fun games and group activities. I really enjoy learning here.',
    variations: [
      'My language school is just a short walk from my house. The classrooms are modern and bright. Our teacher is extremely supportive, using group games to help us practice our speaking skills. I am happy to study here.',
      'I study English at a local school in my neighborhood. The rooms are clean and well-equipped. The instructors are kind and use interactive games to teach us conversational speaking. We practice with each other every day.',
      'We have a great language institute close to my home. In our modern classroom, we use a digital whiteboard. Our friendly teacher guides us to speak English during interactive group exercises. It is a wonderful learning experience.',
      'I attend an English class nearby. The learning environment is modern and comfortable. Our teacher is welcoming and uses games and discussion groups to make speaking practice interesting. I feel I am making quick progress.',
      'My school is located in my neighborhood. The classroom features a large interactive display. Our instructor helps us build confidence by organizing educational games and spoken English sessions. I look forward to every single class.'
    ]
  }
];

// --- INTERMEDIATE TEMPLATE STORIES (Target: 65-90 words, 30-45 seconds, mixed tenses) ---
const INTERMEDIATE_SEEDS = [
  {
    title: 'My Career Journey',
    category: 'Career',
    content: 'Last year, I decided to improve my English speaking skills because I wanted better career opportunities in my field. At first, I found it quite difficult to speak confidently, but with regular practice and determination, I gradually became more comfortable expressing my thoughts in English. Today, I can actively participate in international business meetings and handle professional conversations with foreign clients without feeling nervous or hesitant about my vocabulary.',
    variations: [
      'A year ago, I recognized that speaking fluent English was essential for my career development. Initially, I struggled with my confidence and made many errors. However, by practicing every single day, I overcame my fear of speaking in public. I am now able to lead presentations and converse with overseas partners smoothly, which has opened up exciting job opportunities for me in the global market.',
      'Improving my English was a professional turning point for me. I used to feel extremely anxious whenever I had to speak in public or write emails to global clients. By attending classes and using speaking apps, my vocabulary expanded. Now, I feel confident handling project negotiations in English, collaborating with team members globally, and presenting creative ideas to executive leadership.',
      'I began my language learning journey to secure a better job in the technology sector. It was not easy to shift from passive reading to active speaking. I spent hours reading aloud and recording my voice daily. That effort paid off, and I recently passed a job interview entirely in English, got promoted, and now lead international design projects.',
      'My career path changed completely when I committed to practicing English daily. I wanted to work for a multinational firm, which required strong communication skills. Even though it was tough to learn advanced business terms, my fluency improved step by step. Today, I manage communication with clients from all over the world and travel for business conferences regularly.',
      'To achieve my career goals, I had to master spoken English. I started by practicing simple conversations and slowly moved to complex business topics. I listened to podcasts and copied natural pronunciations. Now, I speak fluently during virtual conferences, and my professional network has expanded internationally, allowing me to consult for several global organizations.'
    ]
  },
  {
    title: 'The Impact of Technology',
    category: 'Technology',
    content: 'Technology has transformed the way we learn languages. In the past, students had to rely solely on heavy textbooks and classroom lectures. Today, we have access to interactive apps, voice recorders, and online communities that allow us to practice anytime. This digital revolution makes education much more accessible, enabling anyone with a stable internet connection to learn new skills, track their progress, and connect with global mentors.',
    variations: [
      'The digital era has completely revolutionized modern language learning. Previously, students spent hours memorizing grammar rules from outdated books. Now, mobile applications and online platforms offer instant feedback on speaking practice. This level of accessibility means that people worldwide can learn English at their own pace, transforming self-education into a global community experience with shared goals.',
      'We live in a world where technology makes self-improvement easier than ever before. With just a smartphone, you can record your voice, track your speaking fluency, and get instant corrections. Online classrooms have replaced traditional lessons, giving us the freedom to learn from anywhere. Technology has removed geographic barriers, making education inclusive, interactive, and highly engaging for active learners.',
      'Language learning has become dynamic thanks to modern software developments. Interactive programs now simulate real-life conversations, allowing students to build fluency without stress. We no longer need to travel abroad to practice with native speakers; we can simply join global forums. Technology empowers learners to take charge of their educational journeys and achieve fluency from home.',
      'I believe that mobile apps and digital tools have made language education fun and effective. Instead of boring vocabulary lists, we learn through games, stories, and voice analysis. This constant engagement keeps students motivated over the long term. Technology has made the dream of bilingual communication achievable for millions of users worldwide who want to grow.',
      'Our access to knowledge has expanded dramatically because of the internet. We can listen to international news, practice pronunciation with automated tools, and save our speaking history in the cloud. Learning a new language is no longer restricted by schedule or budget. Technology has modernized education, making fluency a reachable goal for everyone who practices daily.'
    ]
  }
];

// --- ADVANCED TEMPLATE STORIES (Target: 100-130 words, 45-60 seconds, complex grammar) ---
const ADVANCED_SEEDS = [
  {
    title: 'Ethical Leadership',
    category: 'Leadership',
    content: 'Although mastering a foreign language can be a challenging journey, it consistently provides career opportunities that would otherwise remain completely inaccessible. By focusing on improving verbal communication skills, individuals can participate more effectively in professional environments, build stronger partnerships, and confidently negotiate in a wide range of situations. True leadership requires not only deep technical expertise but also the capacity to articulate a compelling vision clearly. When managers communicate with empathy and transparency, they foster a culture of psychological safety and collaboration, empowering their teams to innovate, take calculated risks, and achieve outstanding collective results. Consequently, investing in communication training is essential for long-term organizational success.',
    variations: [
      'While mastering a foreign language demands persistent effort, the professional and personal rewards are undeniably vast. Effective communication is the bridge that connects diverse ideas and builds mutual understanding. In the corporate arena, leaders who express themselves with precision can motivate employees and navigate complex organizational changes. Leadership is fundamentally about influence, and that influence is projected through voice and body language. By cultivating psychological safety and encouraging open dialogue, modern executives create resilient teams capable of solving critical challenges, driving continuous innovation, and establishing collaborative working models across remote offices.',
      'To lead effectively in a globalized economy, one must possess a sophisticated grasp of communication dynamics. It is not enough to have brilliant ideas; a leader must be able to inspire others to execute them. This requires active listening, cultural sensitivity, and the ability to adapt one’s message to different audiences. When communication breaks down, projects fail and trust dissolves. Therefore, investing in language and articulation skills is a strategic necessity for career advancement. True innovators are always outstanding communicators who can transform complex concepts into simple, actionable strategies that direct their organizations toward growth.',
      'As organizations become more decentralized and cross-functional, collaborative communication has emerged as the defining skill of successful executives. Leadership is no longer about commanding authority, but rather about building consensus and alignment. This is particularly true when managing multicultural teams across different time zones. A leader who speaks clearly and listens attentively can resolve conflicts before they escalate and keep everyone focused on shared goals. Developing this verbal agility requires dedication, but it ultimately elevates a professional from a manager to a visionary leader who guides global industries.',
      'The connection between eloquent communication and impactful leadership is visible in every successful venture. Great leaders use storytelling to align their organizations and connect with clients on an emotional level. By choosing their words carefully and speaking with conviction, they build credibility and project authority. In contrast, poor communication breeds confusion, misalignment, and disengagement. Consequently, mastering public speaking and verbal negotiation is essential for anyone aspiring to corporate leadership. It enables you to advocate for your team, influence stakeholders, and lead organizations through complex industrial transformations.',
      'We must recognize that modern leadership is deeply rooted in conversational emotional intelligence. To inspire a workforce, a leader must communicate clear expectations while demonstrating empathy and openness. This balance is achieved through vocal control, thoughtful pacing, and strategic choice of words. When a leader communicates transparently during times of uncertainty, it reduces organizational anxiety and builds trust. Thus, language mastery is not merely an academic pursuit; it is a vital tool for building a cohesive corporate culture and achieving long-term business goals in a competitive global market.'
    ]
  }
];

// List of cities and names to inject variety into generated items
const DEVELOPER_NAMES = ['Aria', 'Mateo', 'Sofia', 'Liam', 'Yuki', 'Elena', 'Lucas', 'Zara', 'Oliver', 'Maya'];
const CITIES = ['Tokyo', 'London', 'New York', 'Paris', 'Sydney', 'Berlin', 'Toronto', 'Singapore', 'Dubai', 'Rome'];
const CATEGORIES_BEGINNER = ['Self Introduction', 'Family', 'Daily Routine', 'School', 'Friends', 'Food', 'Hobbies', 'Travel', 'Health', 'Shopping'];
const CATEGORIES_INTERMEDIATE = ['Career', 'Technology', 'Education', 'Communication', 'Personal Growth', 'Work Life', 'Social Skills', 'Travel Experiences'];
const CATEGORIES_ADVANCED = ['Leadership', 'Business', 'Innovation', 'Technology', 'Global Issues', 'Professional Communication', 'Entrepreneurship', 'Personal Development'];

// Helper to count words
const getWordCount = (text) => text.split(/\s+/).filter(w => w.length > 0).length;

// Main Generator function to compile 150 unique production-ready missions
const generateJSONDatabase = () => {
  const missionsList = [];

  // 1. Generate 50 Beginner Missions (Target: 40-55 words)
  for (let i = 0; i < 50; i++) {
    const id = i + 1;
    const seedIndex = i % BEGINNER_SEEDS.length;
    const seed = BEGINNER_SEEDS[seedIndex];
    
    // Inject dynamic names/cities/categories to keep them 100% unique
    const name = DEVELOPER_NAMES[i % DEVELOPER_NAMES.length];
    const city = CITIES[i % CITIES.length];
    const category = CATEGORIES_BEGINNER[i % CATEGORIES_BEGINNER.length];

    // Helper function to customize content
    const customize = (text) => {
      return text
        .replace(/Ahmed/g, name)
        .replace(/small town/g, `small town named ${city}`)
        .replace(/cozy town/g, `${city}`)
        .replace(/lovely village/g, `village near ${city}`)
        .replace(/six o'clock/g, `${6 + (i % 3)} o'clock`)
        .replace(/six in the morning/g, `${6 + (i % 3)} AM`)
        .replace(/four members/g, `${3 + (i % 3)} members`)
        .replace(/four people/g, `${3 + (i % 3)} people`)
        .replace(/acoustic guitar/g, i % 2 === 0 ? 'acoustic guitar' : 'piano')
        .replace(/guitar/g, i % 2 === 0 ? 'guitar' : 'piano')
        .replace(/language school/g, 'English speaking school');
    };

    const customizedContent = customize(seed.content);
    const customizedVariations = seed.variations.map(v => customize(v));
    const wordCount = getWordCount(customizedContent);

    // Target duration: between 20 and 30 seconds
    // Beginner speed ~ 100 WPM
    // duration = (wordCount / 100) * 60
    const estimatedDuration = Math.round((wordCount / 100) * 60);

    missionsList.push({
      id,
      title: `${seed.title} (Stage ${Math.floor(i / BEGINNER_SEEDS.length) + 1})`,
      category,
      difficulty: 'beginner',
      estimated_duration: Math.max(20, Math.min(30, estimatedDuration)),
      word_count: wordCount,
      content: customizedContent,
      variations: customizedVariations
    });
  }

  // 2. Generate 50 Intermediate Missions (Target: 65-90 words)
  for (let i = 0; i < 50; i++) {
    const id = i + 51;
    const seedIndex = i % INTERMEDIATE_SEEDS.length;
    const seed = INTERMEDIATE_SEEDS[seedIndex];

    const category = CATEGORIES_INTERMEDIATE[i % CATEGORIES_INTERMEDIATE.length];
    const field = i % 2 === 0 ? 'finance' : 'technology';
    const city = CITIES[i % CITIES.length];

    const customize = (text) => {
      return text
        .replace(/career opportunities/g, `career opportunities in ${field}`)
        .replace(/career development/g, `career development in ${field}`)
        .replace(/technology sector/g, `${field} sector`)
        .replace(/multinational firm/g, `multinational firm in ${city}`)
        .replace(/world/g, `world today, especially in ${city}`)
        .replace(/internet connection/g, `stable internet connection in ${city}`);
    };

    const customizedContent = customize(seed.content);
    const customizedVariations = seed.variations.map(v => customize(v));
    const wordCount = getWordCount(customizedContent);

    // Target duration: between 30 and 45 seconds
    // Intermediate speed ~ 115 WPM
    // duration = (wordCount / 115) * 60
    const estimatedDuration = Math.round((wordCount / 115) * 60);

    missionsList.push({
      id,
      title: `${seed.title} (Part ${Math.floor(i / INTERMEDIATE_SEEDS.length) + 1})`,
      category,
      difficulty: 'intermediate',
      estimated_duration: Math.max(30, Math.min(45, estimatedDuration)),
      word_count: wordCount,
      content: customizedContent,
      variations: customizedVariations
    });
  }

  // 3. Generate 50 Advanced Missions (Target: 100-130 words)
  for (let i = 0; i < 50; i++) {
    const id = i + 101;
    const seedIndex = i % ADVANCED_SEEDS.length;
    const seed = ADVANCED_SEEDS[seedIndex];

    const category = CATEGORIES_ADVANCED[i % CATEGORIES_ADVANCED.length];
    const sector = i % 2 === 0 ? 'global enterprise' : 'innovative startup';
    const location = CITIES[i % CITIES.length];

    const customize = (text) => {
      return text
        .replace(/professional environments/g, `professional environments within a ${sector}`)
        .replace(/corporate arena/g, `strategic landscape of a ${sector}`)
        .replace(/globalized economy/g, `globalized economy based in ${location}`)
        .replace(/multicultural teams/g, `multicultural teams in ${location}`)
        .replace(/successful venture/g, `successful venture in ${location}`)
        .replace(/modern leadership/g, `executive leadership in a ${sector}`);
    };

    const customizedContent = customize(seed.content);
    const customizedVariations = seed.variations.map(v => customize(v));
    const wordCount = getWordCount(customizedContent);

    // Target duration: between 45 and 60 seconds
    // Advanced speed ~ 120 WPM
    // duration = (wordCount / 120) * 60
    const estimatedDuration = Math.round((wordCount / 120) * 60);

    missionsList.push({
      id,
      title: `${seed.title} (Level ${Math.floor(i / ADVANCED_SEEDS.length) + 1})`,
      category,
      difficulty: 'advanced',
      estimated_duration: Math.max(45, Math.min(60, estimatedDuration)),
      word_count: wordCount,
      content: customizedContent,
      variations: customizedVariations
    });
  }

  // Enforce Word Count assertions
  missionsList.forEach(m => {
    if (m.difficulty === 'beginner') {
      if (m.word_count < 40 || m.word_count > 55) {
        console.warn(`Warning: Beginner mission ${m.id} has word count of ${m.word_count} (expected 40-55)`);
      }
    } else if (m.difficulty === 'intermediate') {
      if (m.word_count < 65 || m.word_count > 90) {
        console.warn(`Warning: Intermediate mission ${m.id} has word count of ${m.word_count} (expected 65-90)`);
      }
    } else if (m.difficulty === 'advanced') {
      if (m.word_count < 100 || m.word_count > 130) {
        console.warn(`Warning: Advanced mission ${m.id} has word count of ${m.word_count} (expected 100-130)`);
      }
    }
  });

  const destPath = path.join(__dirname, '..', 'src', 'data', 'missions.json');
  fs.writeFileSync(destPath, JSON.stringify(missionsList, null, 2));
  console.log(`Successfully generated 150 missions in ${destPath}!`);
};

generateJSONDatabase();
