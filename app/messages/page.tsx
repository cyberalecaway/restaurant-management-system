'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Phone, MoreHorizontal, Send, Paperclip } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConversationList } from '@/components/messages/ConversationList';
import { mockConversations, Conversation, Message } from '@/lib/mock-data';

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [activeId, setActiveId] = useState(mockConversations[1].id);
  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const active = conversations.find(c => c.id === activeId)!;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages.length]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const newMsg: Message = {
      id: `m${Date.now()}`,
      senderId: 'admin',
      senderName: 'Admin User',
      content: text,
      timestamp: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      isAdmin: true,
    };
    setConversations(prev => prev.map(c =>
      c.id === activeId
        ? { ...c, messages: [...c.messages, newMsg], lastMessage: text, lastTime: newMsg.timestamp }
        : c
    ));
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <DashboardLayout searchPlaceholder="Search messages...">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#1A2332]">Communication &amp; Messages</h1>
        <p className="text-sm text-[#9BAAB8] mt-0.5">Internal team messaging and announcements</p>
      </div>

      <div className="bg-white border border-[#DDE3E8] rounded-lg shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}>
        <div className="flex h-full">
          {/* Left sidebar */}
          <div className="w-64 flex-shrink-0 border-r border-[#DDE3E8] flex flex-col">
            <ConversationList
              conversations={conversations}
              activeId={activeId}
              onSelect={id => setActiveId(id)}
              search={search}
              onSearchChange={setSearch}
            />
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#DDE3E8] bg-[#FAFBFC]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1E2A2F] flex items-center justify-center text-white text-xs font-bold">
                  {getInitials(active.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A2332]">{active.name}</p>
                  <p className="text-xs text-[#9BAAB8]">{active.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                  Active 2m ago
                </span>
                <button className="p-1.5 text-[#9BAAB8] hover:text-[#6B7A8D] hover:bg-gray-100 rounded transition-colors">
                  <Phone size={15} />
                </button>
                <button className="p-1.5 text-[#9BAAB8] hover:text-[#6B7A8D] hover:bg-gray-100 rounded transition-colors">
                  <MoreHorizontal size={15} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
              {active.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[72%] ${msg.isAdmin ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    {!msg.isAdmin && (
                      <span className="text-[10px] text-[#9BAAB8] px-1">{msg.senderName}</span>
                    )}
                    <div className={`px-3.5 py-2.5 rounded-xl text-xs leading-relaxed ${
                      msg.isAdmin
                        ? 'bg-[#D92F2F] text-white rounded-tr-sm'
                        : 'bg-white text-[#1A2332] border border-[#DDE3E8] rounded-tl-sm shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-[#9BAAB8] px-1">{msg.timestamp}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="px-4 py-3 border-t border-[#DDE3E8] bg-white">
              <div className="flex items-center gap-2">
                <button className="p-2 text-[#9BAAB8] hover:text-[#6B7A8D] hover:bg-gray-100 rounded-md transition-colors flex-shrink-0">
                  <Paperclip size={16} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your reply here..."
                  className="flex-1 px-3 py-2 text-sm bg-[#F4F6F8] border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] placeholder:text-[#9BAAB8] text-[#1A2332]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="flex-shrink-0 p-2.5 bg-[#D92F2F] hover:bg-[#B82525] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
