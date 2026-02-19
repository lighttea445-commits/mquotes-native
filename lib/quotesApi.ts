// Quotes API — ZenQuotes via Supabase Edge Function with client-side keyword filtering

export interface ApiQuote {
  _id: string;
  content: string;
  author: string;
  tags: string[];
  authorSlug: string;
  length: number;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

// Category keywords — all 19 categories
const categoryKeywords: Record<string, string[]> = {
  motivation: ['achieve', 'goal', 'dream', 'work', 'effort', 'strive', 'push', 'never give up', 'keep going', 'determination', 'drive', 'persist', 'win', 'conquer', 'overcome', 'action', 'start', 'hustle'],
  success: ['success', 'achieve', 'accomplish', 'win', 'victory', 'triumph', 'excel', 'prosper', 'thrive', 'goal', 'great', 'champion', 'failure', 'rise'],
  mindfulness: ['present', 'moment', 'peace', 'calm', 'breath', 'aware', 'conscious', 'meditation', 'stillness', 'quiet', 'inner', 'mindful', 'zen', 'tranquil', 'serene', 'pause', 'reflect'],
  'self-love': ['self', 'worthy', 'enough', 'accept', 'embrace', 'compassion', 'believe in yourself', 'value', 'confidence', 'yourself', 'own', 'who you are', 'be yourself'],
  growth: ['grow', 'learn', 'change', 'evolve', 'improve', 'better', 'progress', 'develop', 'transform', 'become', 'journey', 'potential', 'expand', 'flourish', 'advance'],
  happiness: ['happy', 'joy', 'smile', 'laugh', 'pleasure', 'delight', 'content', 'cheerful', 'bliss', 'glad', 'enjoy', 'wonderful', 'beautiful', 'gratitude', 'grateful'],
  courage: ['courage', 'brave', 'fear', 'bold', 'dare', 'risk', 'warrior', 'fight', 'stand', 'hero', 'fearless', 'face', 'strong', 'strength'],
  love: ['love', 'heart', 'affection', 'romance', 'beloved', 'passion', 'loving', 'care', 'tender', 'adore', 'cherish', 'devotion', 'soul', 'kiss', 'warm'],
  hope: ['hope', 'dream', 'believe', 'faith', 'tomorrow', 'light', 'better', 'possible', 'wish', 'bright', 'future', 'optimis', 'expect', 'trust', 'aspir', 'promise', 'dawn'],
  strength: ['strong', 'strength', 'power', 'overcome', 'endure', 'resilient', 'tough', 'unbreakable', 'mighty', 'iron', 'will', 'persist', 'determin', 'warrior'],
  wisdom: ['wisdom', 'wise', 'knowledge', 'learn', 'understand', 'truth', 'know', 'think', 'thought', 'insight', 'mind', 'intellect', 'reason', 'teach', 'lesson', 'experience', 'reflect'],
  time: ['time', 'moment', 'now', 'past', 'future', 'present', 'today', 'tomorrow', 'yesterday', 'clock', 'hour', 'day', 'year', 'season', 'age', 'wait', 'patience', 'fleeting', 'eternal'],
  nature: ['nature', 'tree', 'flower', 'earth', 'sky', 'ocean', 'sea', 'sun', 'moon', 'star', 'mountain', 'river', 'wind', 'rain', 'forest', 'garden', 'bloom', 'spring', 'wild', 'water'],
  change: ['change', 'transform', 'new', 'different', 'evolve', 'grow', 'become', 'improve', 'adapt', 'shift', 'move', 'turn', 'transition', 'begin', 'start', 'fresh', 'reinvent'],
  friendship: ['friend', 'friendship', 'together', 'companion', 'people', 'others', 'trust', 'loyal', 'bond', 'connect', 'share', 'support', 'ally', 'community', 'belong'],
  solitude: ['alone', 'solitude', 'quiet', 'silence', 'self', 'within', 'inner', 'peace', 'reflect', 'stillness', 'lonely', 'meditat', 'retreat', 'private', 'thought'],
  ambition: ['ambition', 'goal', 'achieve', 'drive', 'determination', 'purpose', 'vision', 'aspire', 'aim', 'mission', 'target', 'strive', 'pursue', 'reach', 'climb', 'greatness'],
  death: ['death', 'die', 'mortal', 'end', 'finite', 'eternal', 'gone', 'loss', 'grave', 'legacy', 'remember', 'memory', 'farewell', 'grief'],
  peace: ['peace', 'calm', 'tranquil', 'serene', 'quiet', 'still', 'rest', 'harmony', 'gentle', 'ease', 'relax', 'sooth', 'comfort', 'soft', 'breath', 'balance'],
};

// Mood keywords
const moodKeywords: Record<string, string[]> = {
  motivated: ['achieve', 'goal', 'success', 'work', 'effort', 'push', 'determination', 'drive', 'action', 'start', 'now'],
  anxious: ['peace', 'calm', 'breath', 'relax', 'still', 'quiet', 'let go', 'accept', 'worry', 'fear', 'trust'],
  sad: ['hope', 'light', 'better', 'tomorrow', 'strength', 'this too shall pass', 'rise', 'heal', 'comfort'],
  confident: ['power', 'strong', 'capable', 'can', 'will', 'unstoppable', 'believe', 'greatness', 'champion'],
  grateful: ['grateful', 'thankful', 'appreciate', 'blessing', 'gift', 'fortune', 'lucky', 'abundance'],
  lost: ['path', 'way', 'journey', 'find', 'discover', 'purpose', 'meaning', 'direction', 'guide', 'search'],
  awesome: ['great', 'amazing', 'joy', 'celebrate', 'wonderful', 'beautiful', 'love', 'happy', 'dream', 'inspire', 'shine', 'brilliant'],
  good: ['good', 'happy', 'smile', 'enjoy', 'content', 'better', 'bright', 'positive', 'grateful', 'kind', 'warm'],
  neutral: ['think', 'reflect', 'life', 'world', 'truth', 'wisdom', 'learn', 'mind', 'understand', 'know', 'time'],
  bad: ['hope', 'strength', 'overcome', 'through', 'better', 'rise', 'courage', 'endure', 'tough', 'persist', 'forward'],
  terrible: ['survive', 'strength', 'endure', 'pain', 'storm', 'hope', 'darkness', 'light', 'heal', 'rise', 'never give up', 'hold on'],
  other: ['life', 'world', 'change', 'moment', 'believe', 'dream', 'soul', 'heart', 'truth', 'journey', 'purpose'],
};

// Topic keywords
const topicKeywords: Record<string, string[]> = {
  love: ['love', 'heart', 'affection', 'romance', 'beloved', 'passion', 'loving', 'care', 'tender', 'adore', 'cherish', 'embrace', 'devotion', 'desire', 'soul', 'partner', 'kiss', 'dear', 'warm'],
  hope: ['hope', 'dream', 'believe', 'faith', 'tomorrow', 'light', 'better', 'possible', 'wish', 'bright', 'future', 'optimis', 'expect', 'trust', 'aspir', 'potential', 'promise', 'dawn'],
  strength: ['strong', 'strength', 'power', 'overcome', 'endure', 'courage', 'brave', 'fear', 'bold', 'resilient', 'warrior', 'tough', 'stand', 'unbreakable', 'mighty', 'iron', 'will', 'conquer', 'fight', 'persist', 'determin'],
  wisdom: ['wisdom', 'wise', 'knowledge', 'learn', 'understand', 'truth', 'know', 'think', 'thought', 'insight', 'mind', 'intellect', 'reason', 'teach', 'lesson', 'experience', 'judge', 'discern', 'aware', 'reflect'],
  time: ['time', 'moment', 'now', 'past', 'future', 'present', 'today', 'tomorrow', 'yesterday', 'clock', 'hour', 'day', 'year', 'season', 'age', 'wait', 'patience', 'fleeting', 'eternal', 'forever'],
  nature: ['nature', 'tree', 'flower', 'earth', 'sky', 'ocean', 'sea', 'sun', 'moon', 'star', 'mountain', 'river', 'wind', 'rain', 'forest', 'garden', 'bloom', 'spring', 'wild', 'water'],
  change: ['change', 'transform', 'new', 'different', 'evolve', 'grow', 'become', 'improve', 'adapt', 'shift', 'move', 'turn', 'transition', 'begin', 'start', 'fresh', 'reinvent', 'revolution'],
  friendship: ['friend', 'friendship', 'together', 'companion', 'people', 'others', 'trust', 'loyal', 'bond', 'connect', 'share', 'support', 'ally', 'brother', 'sister', 'community', 'belong'],
  solitude: ['alone', 'solitude', 'quiet', 'silence', 'self', 'within', 'inner', 'peace', 'reflect', 'stillness', 'lonely', 'meditat', 'introvert', 'retreat', 'private', 'thought'],
  ambition: ['ambition', 'goal', 'achieve', 'success', 'drive', 'determination', 'purpose', 'vision', 'aspire', 'aim', 'mission', 'target', 'strive', 'pursue', 'reach', 'climb', 'win', 'greatness'],
  happiness: ['happy', 'happiness', 'joy', 'smile', 'content', 'pleasure', 'delight', 'bliss', 'laugh', 'cheerful', 'enjoy', 'glad', 'wonderful', 'fun', 'celebrate', 'gratitude', 'grateful', 'thank'],
  growth: ['grow', 'growth', 'evolve', 'progress', 'develop', 'mature', 'advance', 'learn', 'improve', 'better', 'journey', 'expand', 'flourish', 'potential', 'become', 'transform', 'rise'],
  death: ['death', 'die', 'mortal', 'end', 'finite', 'eternal', 'gone', 'loss', 'life and death', 'grave', 'legacy', 'remember', 'memory', 'farewell', 'grief', 'mourn'],
  peace: ['peace', 'calm', 'tranquil', 'serene', 'quiet', 'still', 'rest', 'harmony', 'gentle', 'ease', 'relax', 'sooth', 'comfort', 'soft', 'breath', 'mindful', 'balance'],
  'self-love': ['love yourself', 'self', 'worthy', 'enough', 'accept', 'embrace', 'compassion', 'kind to yourself', 'believe in yourself', 'value', 'respect yourself', 'confidence'],
  mindfulness: ['present', 'moment', 'peace', 'calm', 'breath', 'aware', 'conscious', 'meditation', 'stillness', 'quiet', 'inner', 'mindful', 'zen', 'tranquil', 'serene'],
};

let cachedQuotes: ApiQuote[] = [];
const seenQuoteTexts = new Set<string>();

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function filterByKeywords(quotes: ApiQuote[], keywords: string[]): ApiQuote[] {
  if (!keywords || keywords.length === 0) return quotes;
  return quotes.filter(q => {
    const text = q.content.toLowerCase();
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  });
}

function scoreByRelevance(quotes: ApiQuote[], keywords: string[]): { quote: ApiQuote; score: number }[] {
  return quotes.map(q => {
    const text = q.content.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) score++;
    }
    return { quote: q, score };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
}

async function fetchFromApi(): Promise<ApiQuote[]> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/quotes`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const quotes: ApiQuote[] = await response.json();
    const newQuotes = quotes.filter(q => !seenQuoteTexts.has(q.content));
    newQuotes.forEach(q => seenQuoteTexts.add(q.content));
    return newQuotes;
  } catch (error) {
    console.error('API fetch failed:', error);
    return [];
  }
}

async function ensureQuotesAvailable(minCount: number = 10): Promise<void> {
  while (cachedQuotes.length < minCount) {
    const newQuotes = await fetchFromApi();
    if (newQuotes.length === 0) break;
    cachedQuotes = [...cachedQuotes, ...newQuotes];
  }
}

function getQuotes(count: number): ApiQuote[] {
  const quotes: ApiQuote[] = [];
  for (let i = 0; i < count && cachedQuotes.length > 0; i++) {
    const quote = cachedQuotes.shift();
    if (quote) quotes.push(quote);
  }
  return quotes;
}

export async function fetchRandomQuote(): Promise<ApiQuote | null> {
  await ensureQuotesAvailable();
  if (cachedQuotes.length === 0) return null;
  return cachedQuotes.shift() || null;
}

export async function fetchMultipleRandomQuotes(count: number = 20): Promise<ApiQuote[]> {
  await ensureQuotesAvailable(count + 10);
  return shuffleArray(getQuotes(count));
}

export async function fetchQuotesByCategory(category: string): Promise<ApiQuote[]> {
  const keywords = categoryKeywords[category] || [];
  if (keywords.length === 0) return [];

  const collected: ApiQuote[] = [];
  const collectedIds = new Set<string>();
  const maxAttempts = 6;

  for (let attempt = 0; attempt < maxAttempts && collected.length < 15; attempt++) {
    await ensureQuotesAvailable(50);
    const scored = scoreByRelevance(
      cachedQuotes.filter(q => !collectedIds.has(q._id)),
      keywords,
    );
    for (const { quote } of scored) {
      if (collected.length >= 15) break;
      collected.push(quote);
      collectedIds.add(quote._id);
      const idx = cachedQuotes.findIndex(c => c._id === quote._id);
      if (idx > -1) cachedQuotes.splice(idx, 1);
    }
    if (scored.length === 0) {
      const fresh = await fetchFromApi();
      cachedQuotes = [...cachedQuotes, ...fresh];
      if (fresh.length === 0) break;
    }
  }

  return shuffleArray(collected);
}

export async function fetchQuotesByTopic(topicId: string): Promise<ApiQuote[]> {
  const catKeywords = categoryKeywords[topicId];
  if (catKeywords && catKeywords.length > 0) {
    return fetchQuotesByCategory(topicId);
  }

  const keywords = topicKeywords[topicId] || [];
  if (keywords.length === 0) return [];

  const collected: ApiQuote[] = [];
  const collectedIds = new Set<string>();
  const maxAttempts = 6;

  for (let attempt = 0; attempt < maxAttempts && collected.length < 15; attempt++) {
    const fresh = await fetchFromApi();
    cachedQuotes = [...cachedQuotes, ...fresh];
    const scored = scoreByRelevance(
      cachedQuotes.filter(q => !collectedIds.has(q._id)),
      keywords,
    );
    for (const { quote } of scored) {
      if (collected.length >= 15) break;
      if (collectedIds.has(quote._id)) continue;
      collected.push(quote);
      collectedIds.add(quote._id);
      const idx = cachedQuotes.findIndex(c => c._id === quote._id);
      if (idx > -1) cachedQuotes.splice(idx, 1);
    }
  }

  return shuffleArray(collected);
}

export async function fetchQuotesByMood(moodId: string): Promise<ApiQuote[]> {
  const keywords = moodKeywords[moodId] || [];
  if (keywords.length === 0) return [];

  const collected: ApiQuote[] = [];
  const collectedIds = new Set<string>();
  const maxAttempts = 6;

  for (let attempt = 0; attempt < maxAttempts && collected.length < 15; attempt++) {
    await ensureQuotesAvailable(50);
    const scored = scoreByRelevance(
      cachedQuotes.filter(q => !collectedIds.has(q._id)),
      keywords,
    );
    for (const { quote } of scored) {
      if (collected.length >= 15) break;
      collected.push(quote);
      collectedIds.add(quote._id);
      const idx = cachedQuotes.findIndex(c => c._id === quote._id);
      if (idx > -1) cachedQuotes.splice(idx, 1);
    }
    if (scored.length === 0) {
      const fresh = await fetchFromApi();
      cachedQuotes = [...cachedQuotes, ...fresh];
      if (fresh.length === 0) break;
    }
  }

  return shuffleArray(collected);
}

export async function fetchQuotesByAuthor(authorSlug: string): Promise<ApiQuote[]> {
  await ensureQuotesAvailable(50);
  const authorName = authorSlug.replace(/-/g, ' ').toLowerCase();
  const filtered = cachedQuotes.filter(q =>
    q.author.toLowerCase().includes(authorName),
  );
  return shuffleArray(filtered);
}

export async function fetchQuotesByTags(tags: string[]): Promise<ApiQuote[]> {
  const keywords = tags.flatMap(tag => categoryKeywords[tag] || [tag]);
  await ensureQuotesAvailable(100);
  const filtered = filterByKeywords([...cachedQuotes], keywords);
  if (filtered.length >= 10) return shuffleArray(filtered.slice(0, 15));
  return fetchMultipleRandomQuotes(15);
}

export function convertApiQuote(apiQuote: ApiQuote): Quote {
  return {
    id: apiQuote._id || `zen-${Date.now()}`,
    text: apiQuote.content,
    author: apiQuote.author,
    category: 'inspiration',
  };
}
