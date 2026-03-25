// src/components/ChatSession.tsx
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, AlertCircle, MessageSquare, Trash2, Plus, Menu, X } from 'lucide-react';
import { generateResponse } from '../utils/gemini';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';

const API_URL = 'http://localhost:5000/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface ChatSession {
  _id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export default function ChatSession() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      console.log('🔄 Loading chat sessions from server...');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoadingError('Please login to use the chat feature');
        setIsInitializing(false);
        return;
      }

      const response = await axios.get(`${API_URL}/chat-sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const loadedSessions = response.data.sessions.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));

      console.log('📦 Loaded sessions:', loadedSessions.length);
      
      if (loadedSessions.length === 0) {
        console.log('✨ No sessions found, creating new one...');
        await createNewSession();
      } else {
        setSessions(loadedSessions);
        const latestSession = loadedSessions[0];
        setCurrentSessionId(latestSession._id);
        setMessages(latestSession.messages);
        setShowWelcome(latestSession.messages.length === 0);
        console.log('✅ Loaded latest session:', latestSession.title);
      }
      setIsInitializing(false);
    } catch (error: any) {
      console.error('❌ Error loading sessions:', error);
      setLoadingError(error.response?.data?.message || 'Failed to load chat sessions');
      setIsInitializing(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewSession = async () => {
    try {
      console.log('➕ Creating new session...');
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_URL}/chat-sessions`,
        { title: 'New Chat' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newSession = {
        ...response.data.session,
        createdAt: new Date(response.data.session.createdAt),
        updatedAt: new Date(response.data.session.updatedAt),
        messages: []
      };

      const updatedSessions = [newSession, ...sessions];
      setSessions(updatedSessions);
      setCurrentSessionId(newSession._id);
      setMessages([]);
      setShowWelcome(true);
      setInput('');
      
      console.log('✅ New session created:', newSession._id);
    } catch (error: any) {
      console.error('❌ Error creating session:', error);
      alert(error.response?.data?.message || 'Failed to create new session');
    }
  };

  const switchSession = (sessionId: string) => {
    console.log('🔄 Switching to session:', sessionId);
    const session = sessions.find(s => s._id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setShowWelcome(session.messages.length === 0);
      console.log('✅ Switched to:', session.title);
    }
    
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (sessions.length === 1) {
      alert('You must have at least one session');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this chat session?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting session:', sessionId);
      const token = localStorage.getItem('token');

      await axios.delete(`${API_URL}/chat-sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedSessions = sessions.filter(s => s._id !== sessionId);
      setSessions(updatedSessions);
      
      if (currentSessionId === sessionId) {
        const nextSession = updatedSessions[0];
        setCurrentSessionId(nextSession._id);
        setMessages(nextSession.messages);
        setShowWelcome(nextSession.messages.length === 0);
      }
      
      console.log('✅ Session deleted');
    } catch (error: any) {
      console.error('❌ Error deleting session:', error);
      alert(error.response?.data?.message || 'Failed to delete session');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userInput = input.trim();
    if (!userInput || isLoading) return;

    console.log('💬 User message:', userInput);

    if (showWelcome) {
      setShowWelcome(false);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      console.log('🤖 Generating AI response...');
      const aiResponse = await generateResponse(updatedMessages);
      console.log('✅ AI response received');
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      // Update session in database
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/chat-sessions/${currentSessionId}`,
        { messages: finalMessages },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedSession = {
        ...response.data.session,
        createdAt: new Date(response.data.session.createdAt),
        updatedAt: new Date(response.data.session.updatedAt),
        messages: response.data.session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      };

      setSessions(prevSessions =>
        prevSessions.map(s => s._id === currentSessionId ? updatedSession : s)
      );
      
    } catch (error: any) {
      console.error('❌ Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please check your internet connection and try again.",
        timestamp: new Date(),
        error: true
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentSession = sessions.find(s => s._id === currentSessionId);

  if (isInitializing) {
  return <LoadingSpinner />;
}

  if (loadingError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pt-16 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Chat</h2>
          <p className="text-gray-600 mb-4">{loadingError}</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 h-[calc(100vh-8rem)]">
          {/* Sidebar */}
          <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0`}>
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 h-full flex flex-col p-4">
              <button
                onClick={createNewSession}
                className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center space-x-2 font-semibold mb-4"
              >
                <Plus className="w-5 h-5" />
                <span>New Chat</span>
              </button>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-3 mb-2">
                  Recent Chats ({sessions.length}/5)
                </h3>
                {sessions.length === 0 && (
                  <p className="text-sm text-gray-400 px-3 py-2">No chat sessions yet</p>
                )}
                {sessions.map((session) => (
                  <div
                    key={session._id}
                    onClick={() => switchSession(session._id)}
                    className={`group relative px-3 py-3 rounded-xl cursor-pointer transition-all ${
                      currentSessionId === session._id
                        ? 'bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {session.title}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(session.updatedAt).toLocaleDateString()} • {session.messages.length} msgs
                        </p>
                      </div>
                      {sessions.length > 1 && (
                        <button
                          onClick={(e) => deleteSession(session._id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded-lg ml-2"
                          title="Delete session"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  {sessions.length < 5 ? `${5 - sessions.length} more sessions available` : 'Maximum sessions reached'}
                </p>
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col min-w-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                  >
                    {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
                  </button>
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Bot className="w-8 h-8 text-emerald-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
                      <span>Lucille</span>
                      <Sparkles className="w-5 h-5" />
                    </h1>
                    <p className="text-emerald-100 text-sm">Your AI mental health companion</p>
                  </div>
                </div>
                <div className="text-emerald-100 text-sm hidden sm:block">
                  {currentSession && (
                    <div className="text-right">
                      <div className="font-semibold">{currentSession.title}</div>
                      <div className="text-xs opacity-90">{currentSession.messages.length} messages</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {showWelcome && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-2xl px-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
                      <Bot className="w-12 h-12 text-white" strokeWidth={2} />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                      Welcome to Lucille 💚
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                      I'm here to listen and support you through whatever you're experiencing. This is a safe, judgment-free space where you can share your thoughts and feelings openly. How are you doing today?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                      {[
                        "I'm feeling overwhelmed today",
                        "Can you help me manage stress?",
                        "I need someone to talk to",
                        "How can I improve my mood?"
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInput(prompt)}
                          className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all text-sm text-gray-700 text-left group"
                        >
                          <span className="group-hover:text-emerald-600 transition-colors">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                    >
                      <div className={`flex items-start space-x-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-gray-600 to-gray-700 shadow-md'
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md'
                        }`}>
                          {message.role === 'user' ? (
                            <User className="w-5 h-5 text-white" strokeWidth={2.5} />
                          ) : (
                            <Bot className="w-5 h-5 text-white" strokeWidth={2.5} />
                          )}
                        </div>
                        <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        } ${message.error ? 'border-red-200 bg-red-50' : ''}`}>
                          <div className="flex items-start space-x-2">
                            {message.error && <AlertCircle className="flex-shrink-0 w-4 h-4 mt-0.5 text-red-500" />}
                            <div className="flex-1">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                              <p className={`text-xs mt-1.5 ${
                                message.role === 'user' 
                                  ? 'text-emerald-100' 
                                  : message.error 
                                    ? 'text-red-400' 
                                    : 'text-gray-500'
                              }`}>
                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start animate-fadeIn">
                      <div className="flex items-start space-x-3 max-w-[80%]">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                          <Bot className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <div className="px-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                            <span className="text-sm text-gray-600">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-gray-200 flex-shrink-0">
              <form onSubmit={handleSubmit} className="flex space-x-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Share what's on your mind..."
                  className="flex-1 px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder-gray-500 text-sm"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold"
                >
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Lucille is here to support you. For emergencies, please contact local mental health services.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )};