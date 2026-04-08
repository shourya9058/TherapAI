// src/pages/ChatbotPage.tsx
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Sparkles, AlertCircle, RefreshCw, Mic, MicOff,
  Globe, ChevronDown, Plus, MessageSquare, Trash2, Menu, X,
  Heart, Brain, Wind, Sun, Moon, Star
} from 'lucide-react';
import { generateResponse, getErrorMessage } from '../utils/gemini';

/* ─── Types ──────────────────────────────────────────────────── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // stored as ISO string for JSON serialisation
  error?: boolean;
}

interface Session {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

/* ─── Constants ─────────────────────────────────────────────── */
const SESSION_KEY = 'therapai_sessions_v4';
const MAX_SESSIONS = 5;

const MOODS = [
  { emoji: '😔', label: 'Sad',      prompt: "I've been feeling really sad lately and I'm not sure why." },
  { emoji: '😰', label: 'Anxious',  prompt: "I've been feeling anxious and overwhelmed with everything." },
  { emoji: '😤', label: 'Stressed', prompt: "I'm feeling really stressed and don't know how to cope." },
  { emoji: '😐', label: 'Numb',     prompt: "I feel emotionally numb, like nothing matters right now." },
  { emoji: '🥲', label: 'Lost',     prompt: "I feel lost and don't know what direction my life is going." },
  { emoji: '😊', label: 'Okay',     prompt: "I'm feeling okay but just want to talk and reflect a bit." },
];

const STARTER_PROMPTS = [
  { icon: Brain, text: "Help me understand my anxiety",  sub: "Explore what triggers you" },
  { icon: Heart, text: "I need someone to talk to",      sub: "Just listen, no judgment"  },
  { icon: Wind,  text: "Teach me a calming technique",   sub: "Breathing & grounding"     },
  { icon: Sun,   text: "How can I improve my mood?",     sub: "Practical, gentle steps"   },
];

const LANGUAGES = [
  { code: 'auto', label: 'Auto-detect', flag: '🌐' },
  { code: 'en',   label: 'English',     flag: '🇬🇧' },
  { code: 'hi',   label: 'Hindi',       flag: '🇮🇳' },
  { code: 'hing', label: 'Hinglish',    flag: '🤝'  },
  { code: 'pa',   label: 'Punjabi',     flag: '🌾'  },
  { code: 'mr',   label: 'Marathi',     flag: '🏔️' },
  { code: 'es',   label: 'Spanish',     flag: '🇪🇸' },
];

/* ─── Helpers ────────────────────────────────────────────────── */
function createSession(): Session {
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: 'New Conversation',
    createdAt: new Date().toISOString(),
    messages: [],
  };
}

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(sessions)); } catch { /* noop */ }
}

/* ─── Sub-components ─────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 mb-5">
      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md flex-shrink-0">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xs font-semibold text-emerald-600 mb-1 ml-0.5">Dr. Lucille</p>
        <div className="bg-white border border-gray-100 shadow-sm px-4 py-3.5 rounded-2xl rounded-bl-sm inline-flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-emerald-400 block"
              style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.18}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`flex items-end gap-3 mb-5 ${isUser ? 'flex-row-reverse' : ''}`}
      style={{ animation: 'msgSlideIn 0.25s ease-out' }}
    >
      {/* Avatar */}
      {!isUser ? (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      ) : (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-md flex-shrink-0">
          <span className="text-white text-[10px] font-bold">You</span>
        </div>
      )}

      <div className={`flex flex-col max-w-[72%] ${isUser ? 'items-end' : 'items-start'}`}>
        <p className={`text-xs font-semibold mb-1 mx-0.5 ${isUser ? 'text-gray-500' : 'text-emerald-600'}`}>
          {isUser ? 'You' : 'Dr. Lucille'}
        </p>
        <div
          className={`px-4 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm'
              : `bg-white border rounded-bl-sm text-gray-800 ${msg.error ? 'border-red-200' : 'border-gray-100'}`
          }`}
        >
          {msg.error && (
            <div className="flex items-center gap-1.5 mb-2 text-red-500 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Connection issue — please try again</span>
            </div>
          )}
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
        <p className="text-xs text-gray-400 mt-1 mx-0.5">{time}</p>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────── */
export default function ChatbotPage() {
  // Sessions state — single source of truth
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [activeId, setActiveId] = useState<string>(() => loadSessions()[0]?.id ?? '');

  // UI state
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('auto');
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Derive current session & its messages
  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeId) ?? null,
    [sessions, activeId]
  );
  const messages = activeSession?.messages ?? [];

  /* Persist on every sessions change */
  useEffect(() => { saveSessions(sessions); }, [sessions]);

  /* Scroll to bottom */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  /* Close dropdowns on outside click */
  useEffect(() => {
    const h = () => { setLangOpen(false); setMoodOpen(false); };
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  /* ── Session helpers ── */
  const ensureSession = useCallback((): string => {
    if (activeId && sessions.some(s => s.id === activeId)) return activeId;
    // create fresh
    const s = createSession();
    setSessions(prev => {
      const next = [s, ...prev].slice(0, MAX_SESSIONS);
      return next;
    });
    setActiveId(s.id);
    return s.id;
  }, [activeId, sessions]);

  const createNewSession = () => {
    const s = createSession();
    setSessions(prev => [s, ...prev].slice(0, MAX_SESSIONS));
    setActiveId(s.id);
    setInput('');
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? '');
      return next;
    });
  };

  /* ── Core send function ── */
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    // Resolve session id synchronously before any await
    let sessionId = activeId;
    let sessionExists = sessions.some(s => s.id === sessionId);

    let freshSession: Session | null = null;
    if (!sessionId || !sessionExists) {
      freshSession = createSession();
      sessionId = freshSession.id;
    }

    // Build the user message
    const userMsg: Message = {
      id: `m_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    // Get history from current session (before state update)
    const currentSession = sessions.find(s => s.id === activeId);
    const prevMessages: Message[] = currentSession?.messages ?? [];
    const allMessages = [...prevMessages, userMsg];

    // Persist user message immediately to state
    setSessions(prev => {
      let next = prev;
      if (freshSession) next = [freshSession, ...prev].slice(0, MAX_SESSIONS);
      return next.map(s => {
        if (s.id !== sessionId) return s;
        const title =
          s.messages.length === 0
            ? trimmed.slice(0, 40) + (trimmed.length > 40 ? '…' : '')
            : s.title;
        return { ...s, title, messages: allMessages };
      });
    });
    if (freshSession) setActiveId(sessionId);

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    // Build language hint
    const langHint =
      selectedLang !== 'auto'
        ? `[Respond in ${LANGUAGES.find(l => l.code === selectedLang)?.label ?? selectedLang}] `
        : '';

    // Build messages array for AI (convert to role/content format, add lang hint to last)
    const forAI = [
      ...allMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: langHint + trimmed },
    ];

    try {
      const aiText = await generateResponse(forAI);

      const aiMsg: Message = {
        id: `m_${Date.now() + 1}`,
        role: 'assistant',
        content: aiText,
        timestamp: new Date().toISOString(),
      };

      setSessions(prev =>
        prev.map(s =>
          s.id !== sessionId
            ? s
            : { ...s, messages: [...allMessages, aiMsg] }
        )
      );
    } catch (err) {
      console.error('[ChatbotPage] AI error:', err);
      const errMsg: Message = {
        id: `m_${Date.now() + 1}`,
        role: 'assistant',
        content: getErrorMessage(trimmed),
        timestamp: new Date().toISOString(),
        error: true,
      };
      setSessions(prev =>
        prev.map(s =>
          s.id !== sessionId
            ? s
            : { ...s, messages: [...allMessages, errMsg] }
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeId, sessions, isLoading, selectedLang]);

  /* ── Input handlers ── */
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
  };

  /* ── Voice input ── */
  const toggleVoice = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { alert('Voice input requires Chrome.'); return; }
    if (isListening) { recognitionRef.current?.stop(); return; }
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'pa' ? 'pa-IN' : 'en-IN';
    r.onstart = () => setIsListening(true);
    r.onresult = (ev: any) =>
      setInput(Array.from(ev.results).map((r: any) => r[0].transcript).join(''));
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
  }, [isListening, selectedLang]);

  const showWelcome = messages.length === 0 && !isLoading;
  const currentLang = LANGUAGES.find(l => l.code === selectedLang)!;

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%,60%,100% { transform:translateY(0); opacity:.35 }
          30%          { transform:translateY(-6px); opacity:1 }
        }
        @keyframes msgSlideIn {
          from { opacity:0; transform:translateY(8px) }
          to   { opacity:1; transform:translateY(0) }
        }
      `}</style>

      <div className="flex h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pt-16 overflow-hidden">

        {/* ────────── Sidebar ─────────────────────────────── */}
        <aside
          className={`${sidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out`}
        >
          <div className="w-72 h-full bg-white/80 backdrop-blur-md border-r border-gray-200/80 flex flex-col">
            {/* Brand + new chat */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm leading-tight">Dr. Lucille</p>
                  <p className="text-xs text-gray-500">AI Therapy Companion</p>
                </div>
              </div>
              <button
                onClick={createNewSession}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-xl hover:shadow-md hover:shadow-emerald-200 transition-all duration-200 hover:scale-[1.02] active:scale-100"
              >
                <Plus className="w-4 h-4" />
                New Conversation
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1.5">
                Recent Sessions
              </p>
              {sessions.length === 0 && (
                <p className="text-xs text-gray-400 px-2 py-3">No conversations yet — start one above</p>
              )}
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                    s.id === activeId
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <MessageSquare
                    className={`w-4 h-4 flex-shrink-0 ${s.id === activeId ? 'text-emerald-600' : 'text-gray-400'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${s.id === activeId ? 'text-emerald-700' : 'text-gray-700'}`}>
                      {s.title}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.messages.length} messages</p>
                  </div>
                  <button
                    onClick={e => deleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}
            </div>

            {/* Crisis footer */}
            <div className="p-4 border-t border-gray-100">
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-600 mb-1">🆘 Crisis Support</p>
                <p className="text-[10px] text-red-500 leading-relaxed">
                  iCall: <strong>9152987821</strong><br />
                  Vandrevala: <strong>1860-2662-345</strong><br />
                  US Lifeline: <strong>988</strong>
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ────────── Main Chat ────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Top bar */}
          <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-200/70 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="p-2 rounded-xl text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">Dr. Lucille</p>
                  <p className="text-xs text-emerald-500 font-medium">Online · Ready to listen</p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Mood picker */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setMoodOpen(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:border-emerald-300 hover:text-emerald-600 transition-colors shadow-sm"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">How are you?</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {moodOpen && (
                  <div className="absolute right-0 top-10 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 w-64">
                    <p className="text-xs font-semibold text-gray-500 mb-2 px-1">How are you feeling?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {MOODS.map(m => (
                        <button
                          key={m.label}
                          onClick={() => { setMoodOpen(false); sendMessage(m.prompt); }}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-emerald-50 transition-colors"
                        >
                          <span className="text-xl">{m.emoji}</span>
                          <span className="text-[10px] text-gray-600 font-medium">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Language picker */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setLangOpen(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:border-emerald-300 hover:text-emerald-600 transition-colors shadow-sm"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-10 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-44">
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        onClick={() => { setSelectedLang(l.code); setLangOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-emerald-50 ${
                          selectedLang === l.code ? 'text-emerald-600 font-semibold bg-emerald-50' : 'text-gray-700'
                        }`}
                      >
                        <span>{l.flag}</span>
                        <span>{l.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* New session */}
              <button
                onClick={createNewSession}
                title="New conversation"
                className="p-2 rounded-xl text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto px-4 sm:px-8 py-6"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#a7f3d0 transparent' }}
          >
            <div className="max-w-2xl mx-auto">

              {/* Welcome state */}
              {showWelcome && (
                <div className="flex flex-col items-center text-center pt-4 pb-4">
                  <div className="relative mb-5">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-200">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                      <Star className="w-4 h-4 text-emerald-500" style={{ fill: '#a7f3d0' }} />
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Hi, I'm Dr. Lucille</h2>
                  <p className="text-gray-500 text-sm max-w-md mb-1 leading-relaxed">
                    A safe, confidential space to talk about anything on your mind.
                    I use evidence-based therapy — CBT, mindfulness, and more.
                  </p>
                  <p className="text-xs text-gray-400 mb-8">
                    English · Hindi · Hinglish · Punjabi · Marathi · Spanish — whichever feels natural.
                  </p>

                  {/* Starter cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mb-6">
                    {STARTER_PROMPTS.map(({ icon: Icon, text, sub }) => (
                      <button
                        key={text}
                        onClick={() => sendMessage(text)}
                        className="group flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-2xl text-left hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100 transition-all duration-200"
                      >
                        <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                          <Icon className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 leading-tight">{text}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Mood pills */}
                  <div className="w-full max-w-lg">
                    <p className="text-xs text-gray-400 mb-2 font-medium">Or, how are you feeling right now?</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {MOODS.map(m => (
                        <button
                          key={m.label}
                          onClick={() => sendMessage(m.prompt)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                        >
                          <span>{m.emoji}</span>
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Render messages */}
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {/* Typing indicator */}
              {isLoading && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-t border-gray-200/70 px-4 py-3">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit}>
                <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-emerald-400 focus-within:shadow-md focus-within:shadow-emerald-100 transition-all duration-200">
                  {/* Voice */}
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={`p-2 rounded-xl transition-all flex-shrink-0 ${
                      isListening
                        ? 'bg-red-50 text-red-500 animate-pulse'
                        : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleTextChange}
                    onKeyDown={handleKey}
                    disabled={isLoading || isListening}
                    placeholder={
                      isListening
                        ? '🎙️ Listening…'
                        : "Share what's on your mind… (Enter to send, Shift+Enter for new line)"
                    }
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none leading-relaxed py-1"
                    style={{ minHeight: '22px', maxHeight: '128px' }}
                    autoFocus
                  />

                  {/* Send */}
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow hover:shadow-md hover:shadow-emerald-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-center text-[11px] text-gray-400 mt-2">
                  Dr. Lucille is an AI companion — not a substitute for professional medical advice.
                </p>
              </form>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
