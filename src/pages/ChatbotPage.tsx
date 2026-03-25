// src/pages/ChatbotPage.tsx
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';
import { generateResponse } from '../utils/gemini';
import LoadingSpinner from '../components/LoadingSpinner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Try to load messages from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lucille_chat_history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        } catch (e) {
          console.error('Failed to parse saved messages', e);
        }
      }
    }
    
    // Default welcome message
    return [{
      id: '1',
      role: 'assistant',
      content: "Hi there! I'm Lucille, your AI mental health companion. I'm here to listen and support you 24/7. How are you feeling today?",
      timestamp: new Date()
    }];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lucille_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userInput = input.trim();
    if (!userInput || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Generate AI response
      const aiResponse = await generateResponse([...messages, userMessage]);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting to my servers. Please check your internet connection and try again.",
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat history
  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history? This cannot be undone.')) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "Hi there! I'm Lucille, your AI mental health companion. I'm here to listen and support you. How can I help you today?",
        timestamp: new Date()
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
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
              <button
                onClick={clearChat}
                className="text-emerald-100 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Clear chat history"
              >
                Clear Chat
              </button>
            </div>
          </div>

          <div className="h-[600px] overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-gray-600 to-gray-700'
                      : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-5 h-5 text-white" strokeWidth={2.5} />
                    ) : (
                      <Bot className="w-5 h-5 text-white" strokeWidth={2.5} />
                    )}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  } ${message.error ? 'border-red-200 bg-red-50' : ''}`}>
                    <div className="flex items-start space-x-2">
                      {message.error && <AlertCircle className="flex-shrink-0 w-4 h-4 mt-0.5 text-red-500" />}
                      <div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' 
                            ? 'text-emerald-100' 
                            : message.error 
                              ? 'text-red-400' 
                              : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
  <div className="flex justify-start">
    <div className="flex items-start space-x-3 max-w-[80%]">
      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
        <Bot className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>
      <div className="px-4 py-3 bg-white border border-gray-200 rounded-2xl">
        <LoadingSpinner size="xs" fullScreen={false} />
      </div>
    </div>
  </div>
)}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-6 bg-white border-t border-gray-200">
            <form onSubmit={handleSubmit} className="flex space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold"
              >
                <Send className="w-5 h-5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
