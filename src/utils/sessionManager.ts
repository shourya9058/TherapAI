// Session management utilities - FIXED VERSION
// src/utils/sessionManager.ts
const STORAGE_KEY = 'lucille_chat_sessions';
const MAX_SESSIONS = 5;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Save chat sessions to localStorage - FIXED: Takes array
 */
export function saveChatSession(sessions: ChatSession[]): void {
  try {
    // Keep only the most recent MAX_SESSIONS
    const sessionsToSave = sessions.slice(0, MAX_SESSIONS);
    const serialized = JSON.stringify(sessionsToSave);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save chat sessions:', error);
  }
}

/**
 * Load chat sessions from localStorage
 */
export function loadChatSessions(): ChatSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    return parsed.map((session: any) => ({
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      messages: session.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }));
  } catch (error) {
    console.error('Failed to load chat sessions:', error);
    return [];
  }
}

/**
 * Delete the oldest session when limit is exceeded - FIXED: Returns array
 */
export function deleteOldestSession(sessions: ChatSession[]): ChatSession[] {
  if (sessions.length <= MAX_SESSIONS) {
    return sessions;
  }
  
  // Sort by updatedAt (most recent first)
  const sorted = [...sessions].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  
  // Keep only the most recent MAX_SESSIONS
  return sorted.slice(0, MAX_SESSIONS);
}

/**
 * Generate a session title from the first user message
 */
export function generateSessionTitle(firstMessage: string): string {
  // Remove extra whitespace
  const cleaned = firstMessage.trim().replace(/\s+/g, ' ');
  
  // Keywords to look for to generate meaningful titles
  const keywords = {
    stress: ['stress', 'stressed', 'anxiety', 'anxious', 'worried', 'overwhelmed', 'तनाव', 'चिंता'],
    sad: ['sad', 'depressed', 'down', 'unhappy', 'upset', 'crying', 'उदास', 'दुखी'],
    sleep: ['sleep', 'insomnia', 'tired', 'exhausted', 'fatigue', 'नींद', 'थकान'],
    work: ['work', 'job', 'career', 'office', 'boss', 'colleague', 'काम', 'नौकरी'],
    relationship: ['relationship', 'partner', 'boyfriend', 'girlfriend', 'spouse', 'family', 'रिश्ता', 'परिवार'],
    health: ['health', 'sick', 'pain', 'hurt', 'doctor', 'medical', 'स्वास्थ्य', 'बीमार'],
    lonely: ['lonely', 'alone', 'isolated', 'friend', 'अकेला', 'दोस्त'],
    help: ['help', 'advice', 'support', 'guidance', 'मदद', 'सलाह']
  };
  
  const lowerMessage = cleaned.toLowerCase();
  
  // Check for keywords
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => lowerMessage.includes(word))) {
      const categoryTitles: Record<string, string> = {
        stress: 'Managing Stress',
        sad: 'Feeling Down',
        sleep: 'Sleep Issues',
        work: 'Work Challenges',
        relationship: 'Relationship Talk',
        health: 'Health Concerns',
        lonely: 'Feeling Lonely',
        help: 'Seeking Support'
      };
      return categoryTitles[category];
    }
  }
  
  // If no keywords found, use first 4-5 words
  const words = cleaned.split(' ');
  if (words.length <= 5) {
    return cleaned.length > 30 ? cleaned.substring(0, 30) + '...' : cleaned;
  }
  
  return words.slice(0, 4).join(' ') + '...';
}

/**
 * Clear all chat sessions (for testing or user request)
 */
export function clearAllSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear chat sessions:', error);
  }
}

/**
 * Export sessions as JSON (for backup)
 */
export function exportSessions(): string {
  const sessions = loadChatSessions();
  return JSON.stringify(sessions, null, 2);
}

/**
 * Import sessions from JSON (for restore)
 */
export function importSessions(jsonData: string): boolean {
  try {
    const sessions = JSON.parse(jsonData);
    saveChatSession(sessions);
    return true;
  } catch (error) {
    console.error('Failed to import sessions:', error);
    return false;
  }
}