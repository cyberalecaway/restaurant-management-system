'use client';

import React from 'react';
import { Conversation } from '@/lib/domain';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function ConversationList({ conversations, activeId, onSelect, search, onSearchChange }: ConversationListProps) {
  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-[#DDE3E8]">
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search conversations..."
          className="w-full px-3 py-2 text-sm bg-[#F4F6F8] border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] placeholder:text-[#9BAAB8] text-[#1A2332]"
        />
      </div>
      {/* Label */}
      <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#DDE3E8]">
        <p className="text-[10px] font-bold text-[#9BAAB8] uppercase tracking-widest">Channels &amp; Conversations</p>
      </div>
      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(conv => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full flex items-start gap-3 px-3 py-3 text-left border-b border-[#F0F3F6] transition-colors ${
              conv.id === activeId ? 'bg-red-50 border-l-2 border-l-[#D92F2F]' : 'hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#1E2A2F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {getInitials(conv.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#1A2332] truncate">{conv.name}</p>
                <span className="text-[10px] text-[#9BAAB8] ml-1 flex-shrink-0">{conv.lastTime}</span>
              </div>
              <p className="text-[11px] text-[#9BAAB8] truncate mt-0.5">{conv.lastMessage}</p>
            </div>
            {conv.unread > 0 && (
              <span className="w-4 h-4 bg-[#D92F2F] text-white text-[9px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                {conv.unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
