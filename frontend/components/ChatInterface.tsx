'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  RotateCcw,
  BookOpen,
  Compass,
  Info,
  ExternalLink,
  MapPin,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { ChatMessage, SourceCitation, AdminUser } from '../types';
import { api } from '../services/api';

interface ChatInterfaceProps {
  onNavigateToUpload: () => void;
  currentUser?: AdminUser | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onNavigateToUpload,
  currentUser,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch suggested questions once on mount
  useEffect(() => {
    api.getSuggestions().then((suggs) => {
      if (suggs.length > 0) {
        setSuggestions(suggs);
      }
    }).catch(() => {});
  }, []);

  // Isolate chat history: User/Admin session vs Guest visitor session
  useEffect(() => {
    if (currentUser) {
      // 1. Authenticated Account: Load private account chat session & history
      api.getUserChatSession()
        .then((data) => {
          setSessionId(data.session_id);
          setMessages(data.messages || []);
          if (typeof window !== 'undefined') {
            localStorage.setItem(`ethiopia_chat_session_user_${currentUser.id}`, data.session_id);
          }
        })
        .catch(() => {
          let stored = '';
          if (typeof window !== 'undefined') {
            stored = localStorage.getItem(`ethiopia_chat_session_user_${currentUser.id}`) || '';
            if (!stored) {
              stored = `sess_u${currentUser.id}_` + Math.random().toString(36).substring(2, 10);
              localStorage.setItem(`ethiopia_chat_session_user_${currentUser.id}`, stored);
            }
          }
          setSessionId(stored);
          if (stored) {
            api.getChatHistory(stored).then((hist) => setMessages(hist || [])).catch(() => setMessages([]));
          }
        });
    } else {
      // 2. Guest Visitor: Switch to guest session; admin history is NEVER displayed
      let guestSession = '';
      if (typeof window !== 'undefined') {
        guestSession = localStorage.getItem('ethiopia_travel_chat_session_guest') || '';
        if (!guestSession) {
          guestSession = 'sess_guest_' + Math.random().toString(36).substring(2, 12);
          localStorage.setItem('ethiopia_travel_chat_session_guest', guestSession);
        }
      }
      setSessionId(guestSession);

      if (guestSession) {
        api.getChatHistory(guestSession)
          .then((history) => {
            setMessages(history || []);
          })
          .catch(() => {
            setMessages([]);
          });
      } else {
        setMessages([]);
      }
    }
  }, [currentUser]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || loading) return;

    setErrorMsg(null);
    setInputQuestion('');

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await api.sendChatMessage(q, sessionId);

      if (response.session_id && response.session_id !== sessionId) {
        setSessionId(response.session_id);
        if (typeof window !== 'undefined') {
          const key = currentUser
            ? `ethiopia_chat_session_user_${currentUser.id}`
            : 'ethiopia_travel_chat_session_guest';
          localStorage.setItem(key, response.session_id);
        }
      }

      const assistantMessage: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while communicating with the assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = async () => {
    if (sessionId) {
      await api.clearChatSession(sessionId);
    }
    setMessages([]);
    setErrorMsg(null);

    const prefix = currentUser ? `sess_u${currentUser.id}_` : 'sess_guest_';
    const newSession = prefix + Math.random().toString(36).substring(2, 12);
    setSessionId(newSession);

    if (typeof window !== 'undefined') {
      const key = currentUser
        ? `ethiopia_chat_session_user_${currentUser.id}`
        : 'ethiopia_travel_chat_session_guest';
      localStorage.setItem(key, newSession);
    }
  };

  /**
   * Clean message formatting:
   * Strips raw '**' or '*   **' and formats headers, bullets, and labels cleanly without asterisks.
   */
  const renderCleanMessageContent = (content: string) => {
    // 1. Normalize nested asterisks and bold tags
    const normalized = content
      .replace(/^\s*[*+-]\s+\*\*(.*?)\*\*:?/gm, '- $1:')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*\*/g, '')
      .replace(/^\s*\*\s+/gm, '• ');

    const lines = normalized.split('\n');

    return (
      <div className="space-y-2 text-[14px] sm:text-[15px] leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          // Section Header lines (e.g. "### Title" or "Historical Significance:" or "KEY HIGHLIGHTS:")
          const isMarkdownHeading = trimmed.startsWith('#');
          const isColonHeading =
            trimmed.endsWith(':') &&
            trimmed.length < 65 &&
            !trimmed.startsWith('•') &&
            !trimmed.startsWith('-');

          if (isMarkdownHeading || isColonHeading) {
            const headingText = trimmed.replace(/^#+\s*/, '');
            return (
              <h4
                key={idx}
                className="font-bold text-[#0d3d24] mt-3 mb-1 text-sm sm:text-base tracking-wide flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#d48b14] shrink-0"></span>
                <span>{headingText}</span>
              </h4>
            );
          }

          // Bullet item lines
          if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
            const itemText = trimmed.substring(2);
            const colonIndex = itemText.indexOf(':');

            if (colonIndex > 0 && colonIndex < 35) {
              const label = itemText.substring(0, colonIndex + 1);
              const value = itemText.substring(colonIndex + 1);

              return (
                <div key={idx} className="flex items-start gap-2 pl-2 py-0.5 text-[#242b26]">
                  <span className="text-[#d48b14] mt-1 shrink-0 font-bold">•</span>
                  <div>
                    <span className="font-semibold text-[#0d3d24]">{label}</span>
                    <span>{value}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className="flex items-start gap-2 pl-2 py-0.5 text-[#242b26]">
                <span className="text-[#d48b14] mt-1 shrink-0 font-bold">•</span>
                <span>{itemText}</span>
              </div>
            );
          }

          // Regular paragraph text
          return (
            <p key={idx} className="text-[#242b26]">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto px-4 py-4 sm:py-6">
      {/* Chat Header / Welcome Banner */}
      <div className="mb-4 bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#e8ded1] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#0d3d24] text-[#f3a628] flex items-center justify-center shrink-0 shadow">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-[#0d3d24]">
                Discover Ethiopia
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Memory Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#5e6660]">
              Ask me about historical sites, national parks, lakes, scenery, culture, and hotels.
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-block text-xs text-[#8c948e]">
              {messages.length} messages in history
            </span>
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#5e6660] hover:text-[#0d3d24] hover:bg-[#f4efe6] transition border border-[#e8ded1]"
              title="Start fresh conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        )}
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[360px] text-center p-6 bg-white/70 backdrop-blur rounded-2xl border border-[#e8ded1] shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#0d3d24]/10 text-[#0d3d24] flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-[#d48b14]" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#0d3d24] mb-2">
              Welcome to the Ethiopian Tourist Destination Assistant
            </h2>

            <p className="text-sm text-[#5e6660] max-w-lg mb-6">
              I am powered by a verified knowledge base grounded on official tourism documents uploaded by our administrators.
            </p>

            {/* Suggested Question Pills */}
            <div className="w-full max-w-2xl">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0d3d24] uppercase tracking-wider mb-3">
                <HelpCircle className="w-4 h-4 text-[#d48b14]" />
                Suggested Questions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {suggestions.slice(0, 6).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="p-3 text-xs sm:text-sm rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e8ded1] text-[#1e2420] transition-all hover:border-[#d48b14] hover:shadow-sm flex items-start gap-2.5"
                  >
                    <MapPin className="w-4 h-4 text-[#d48b14] shrink-0 mt-0.5" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 shadow-sm text-sm sm:text-base leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#0d3d24] text-white rounded-br-sm'
                    : 'bg-white text-[#1e2420] border border-[#e8ded1] rounded-bl-sm'
                }`}
              >
                {/* Assistant Label */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 text-xs font-semibold text-[#0d3d24]">
                    <Compass className="w-4 h-4 text-[#d48b14]" />
                    <span>Ethiopian Tourism Guide</span>
                  </div>
                )}

                {/* Content */}
                {msg.role === 'assistant' ? (
                  renderCleanMessageContent(msg.content)
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}

                {/* Grounded Source Citations */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#e8ded1]/80 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-[#0d3d24] mb-2">
                      <BookOpen className="w-3.5 h-3.5 text-[#d48b14]" />
                      <span>Retrieved Knowledge Sources:</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#faf7f2] border border-[#e8ded1] text-[#1e2420]"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#d48b14]" />
                          <span className="font-medium">{src.title}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#0d3d24]/10 text-[#0d3d24]">
                            {src.category}
                          </span>
                          {src.similarity !== undefined && (
                            <span className="text-[10px] text-gray-500 font-mono">
                              ({Math.round(src.similarity * 100)}% match)
                            </span>
                          )}
                          {src.source_url && (
                            <a
                              href={src.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#d48b14] hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0d3d24] text-[#f3a628] flex items-center justify-center shadow-sm shrink-0">
              <Compass className="w-5 h-5 animate-spin" />
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm p-4 border border-[#e8ded1] shadow-sm flex items-center gap-3">
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0d3d24] animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#d48b14] animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#165b36] animate-bounce"></div>
              </div>
              <span className="text-xs sm:text-sm text-[#5e6660]">
                Searching tourism knowledge base & formulating answer...
              </span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-500 hover:text-red-800 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Area */}
      <div className="mt-2 bg-white rounded-2xl border border-[#e8ded1] shadow-sm p-2 sm:p-2.5 focus-within:border-[#0d3d24] focus-within:ring-1 focus-within:ring-[#0d3d24] transition-all">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about Ethiopian destinations, national parks, Lalibela, hotels, culture..."
            rows={2}
            className="flex-1 resize-none bg-transparent outline-none px-2 py-1 text-sm sm:text-base text-[#1e2420] placeholder-[#5e6660]/60"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={!inputQuestion.trim() || loading}
            className="p-3 rounded-xl bg-[#0d3d24] text-white hover:bg-[#165b36] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
            title="Send Message"
          >
            <Send className="w-5 h-5 text-[#f3a628]" />
          </button>
        </form>

        <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-[#5e6660]">
          <span>Press Enter to send, Shift + Enter for new line</span>
          <span className="text-[#0d3d24] font-medium">Grounded RAG Chatbot</span>
        </div>
      </div>
    </div>
  );
};
