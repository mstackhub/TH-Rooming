'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp, ChatMessage, User } from '@/context/AppContext';
import { 
  MessageSquare, 
  Bell, 
  Send, 
  X, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Mic,
  Users,
  User as UserIcon,
  Search,
  Hash,
  MessageCircle
} from 'lucide-react';

export default function ChatWidget() {
  const { 
    currentUser, 
    chatMessages, 
    sendChatMessage, 
    fetchChatMessages,
    clearWeeklyChat,
    changeRequests,
    allUsersAdmin,
    setCurrentTab,
    showToast,
    isMounted
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'notifications'>('chat');
  const [chatMode, setChatMode] = useState<'general' | 'dm'>('general');
  const [selectedDmUser, setSelectedDmUser] = useState<User | null>(null);
  const [dmSearch, setDmSearch] = useState('');
  
  const [inputMessage, setInputMessage] = useState('');
  const [lastReadChatTime, setLastReadChatTime] = useState<string>('');
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load last read timestamp from localStorage
  useEffect(() => {
    if (!isMounted) return;
    const savedTime = localStorage.getItem('th_last_read_chat') || '';
    setLastReadChatTime(savedTime);

    try {
      const savedRead = JSON.parse(localStorage.getItem('th_read_notifs') || '[]');
      if (Array.isArray(savedRead)) setReadNotifIds(savedRead);
    } catch (e) {}
  }, [isMounted]);

  // Fast lightweight polling when chat drawer is open
  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      fetchChatMessages();
      const interval = setInterval(() => {
        fetchChatMessages();
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeTab, fetchChatMessages]);

  // Filter messages for current view
  const currentViewMessages = useMemo(() => {
    if (!currentUser) return [];
    
    if (chatMode === 'general') {
      // General messages (no recipient or recipient === 'general')
      return chatMessages.filter(m => !m.recipientEmail || m.recipientEmail === 'general');
    }

    if (chatMode === 'dm' && selectedDmUser) {
      // 1-on-1 Direct messages between currentUser and selectedDmUser
      const myEmail = currentUser.email.toLowerCase();
      const targetEmail = selectedDmUser.email.toLowerCase();
      
      return chatMessages.filter(m => {
        const sEmail = (m.senderEmail || '').toLowerCase();
        const rEmail = (m.recipientEmail || '').toLowerCase();
        return (sEmail === myEmail && rEmail === targetEmail) || 
               (sEmail === targetEmail && rEmail === myEmail);
      });
    }

    return [];
  }, [chatMessages, chatMode, selectedDmUser, currentUser]);

  // Scroll to bottom when new message arrives and chat is open
  useEffect(() => {
    if (isOpen && activeTab === 'chat' && (chatMode === 'general' || selectedDmUser)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentViewMessages, isOpen, activeTab, chatMode, selectedDmUser]);

  // Update last read time when opening chat
  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      const nowIso = new Date().toISOString();
      setLastReadChatTime(nowIso);
      localStorage.setItem('th_last_read_chat', nowIso);
    }
  }, [isOpen, activeTab, chatMessages.length]);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Master Admin' || currentUser.permissions?.isAdmin;

  // Compute unread general chat count
  const unreadGeneralChatCount = chatMessages.filter(m => {
    if (m.recipientEmail && m.recipientEmail !== 'general') return false;
    if (m.senderEmail.toLowerCase() === currentUser.email.toLowerCase()) return false;
    if (!lastReadChatTime) return true;
    return new Date(m.createdAt).getTime() > new Date(lastReadChatTime).getTime();
  }).length;

  // Compute unread direct messages count
  const unreadDmCount = chatMessages.filter(m => {
    if (!m.recipientEmail) return false;
    if (m.recipientEmail.toLowerCase() !== currentUser.email.toLowerCase()) return false;
    if (m.senderEmail.toLowerCase() === currentUser.email.toLowerCase()) return false;
    if (!lastReadChatTime) return true;
    return new Date(m.createdAt).getTime() > new Date(lastReadChatTime).getTime();
  }).length;

  const totalUnreadChatCount = unreadGeneralChatCount + unreadDmCount;

  // Generate system notifications from change requests and DMs
  const pendingRequests = changeRequests.filter(r => r.status === 'Pending');
  const myResolvedRequests = changeRequests.filter(r => 
    r.requesterEmail.toLowerCase() === currentUser.email.toLowerCase() && 
    (r.status === 'Approved' || r.status === 'Rejected')
  );

  const notificationsList: Array<{
    id: string;
    type: 'pending_request' | 'approved' | 'rejected' | 'dm';
    title: string;
    desc: string;
    time: string;
    action?: () => void;
  }> = [];

  // Direct message notifications for current user
  chatMessages
    .filter(m => m.recipientEmail && m.recipientEmail.toLowerCase() === currentUser.email.toLowerCase())
    .slice(-5)
    .forEach(m => {
      notificationsList.push({
        id: `dm_${m.id}`,
        type: 'dm',
        title: `ข้อความส่วนตัวจาก ${m.senderName}`,
        desc: m.message,
        time: m.createdAt,
        action: () => {
          const target = allUsersAdmin.find(u => u.email.toLowerCase() === m.senderEmail.toLowerCase());
          if (target) {
            setSelectedDmUser(target);
            setChatMode('dm');
            setActiveTab('chat');
          }
        }
      });
    });

  // If Admin: notify about pending change requests
  if (isAdmin) {
    pendingRequests.forEach(r => {
      let details: any = {};
      try { details = JSON.parse(r.requestDetails); } catch (e) {}
      notificationsList.push({
        id: `pending_${r.id}`,
        type: 'pending_request',
        title: `มีคำขอ${r.requestType === 'cancel' ? 'ยกเลิกคิว' : 'แก้ไขคิว'}ใหม่`,
        desc: `โดย ${r.requesterName} (คิว ${details.bookingId || r.bookingCustomId || ''})`,
        time: r.createdAt,
        action: () => {
          setCurrentTab('change-requests');
          setIsOpen(false);
        }
      });
    });
  }

  // Notify requester about their resolved requests
  myResolvedRequests.forEach(r => {
    const isApprove = r.status === 'Approved';
    notificationsList.push({
      id: `resolved_${r.id}`,
      type: isApprove ? 'approved' : 'rejected',
      title: isApprove ? 'คำขอแก้ไขคิวได้รับการอนุมัติแล้ว' : 'คำขอแก้ไขคิวถูกปฏิเสธ',
      desc: isApprove 
        ? `อนุมัติโดย ${r.handlerName || 'ผู้ดูแลระบบ'}` 
        : `เหตุผล: ${r.handlerNote || 'ไม่ระบุเหตุผล'}`,
      time: r.handledAt || r.createdAt,
      action: () => {
        setCurrentTab('my-bookings');
        setIsOpen(false);
      }
    });
  });

  const unreadNotifCount = notificationsList.filter(n => !readNotifIds.includes(n.id)).length;
  const totalBadgeCount = totalUnreadChatCount + unreadNotifCount;

  // Filter team members for DM list
  const teamMembers = useMemo(() => {
    const term = dmSearch.trim().toLowerCase();
    return allUsersAdmin
      .filter(u => u.email.toLowerCase() !== currentUser.email.toLowerCase())
      .filter(u => {
        if (!term) return true;
        return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || (u.role || '').toLowerCase().includes(term);
      });
  }, [allUsersAdmin, currentUser, dmSearch]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    // Instant clear input (0ms!)
    setInputMessage('');

    const targetEmail = chatMode === 'dm' && selectedDmUser ? selectedDmUser.email : null;
    const targetName = chatMode === 'dm' && selectedDmUser ? selectedDmUser.name : null;

    await sendChatMessage(trimmed, targetEmail, targetName);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const markAllNotifsAsRead = () => {
    const allIds = notificationsList.map(n => n.id);
    setReadNotifIds(allIds);
    localStorage.setItem('th_read_notifs', JSON.stringify(allIds));
    showToast('อ่านการแจ้งเตือนทั้งหมดแล้ว', 'info');
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      
      if (isToday) return timeStr;
      return `${date.getDate()}/${date.getMonth() + 1} ${timeStr}`;
    } catch (e) {
      return '';
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'Master Admin' || role === 'Admin') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
          <ShieldCheck className="w-2.5 h-2.5" /> Admin
        </span>
      );
    }
    if (role === 'MC' || role === 'MC Live') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300">
          <Mic className="w-2.5 h-2.5" /> MC
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        <Users className="w-2.5 h-2.5" /> Staff
      </span>
    );
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-5 right-5 z-40 p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer flex items-center justify-center group focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
        title="เปิดห้องแชทและการแจ้งเตือน"
      >
        <div className="relative">
          {isOpen ? (
            <X className="w-6 h-6 transition-transform duration-200 rotate-0 group-hover:scale-110" />
          ) : (
            <MessageSquare className="w-6 h-6 transition-transform duration-200 group-hover:scale-110" />
          )}

          {/* Unread badge */}
          {!isOpen && totalBadgeCount > 0 && (
            <span className="absolute -top-2.5 -right-2.5 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full min-w-[18px] text-center border-2 border-white dark:border-slate-900 animate-bounce">
              {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
            </span>
          )}
        </div>
      </button>

      {/* Chat & Notification Popover Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 z-40 w-[360px] sm:w-[420px] h-[560px] max-h-[82vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 text-slate-800 dark:text-slate-200">
          
          {/* Main Header */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-850 bg-slate-50/80 dark:bg-slate-950/50 backdrop-blur-sm flex items-center justify-between">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                แชท
                {totalUnreadChatCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] font-black rounded-full">
                    {totalUnreadChatCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'notifications'
                    ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                การแจ้งเตือน
                {unreadNotifCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full">
                    {unreadNotifCount}
                  </span>
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {isAdmin && activeTab === 'chat' && chatMode === 'general' && currentViewMessages.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('คุณต้องการล้างข้อความแชททั้งหมดในระบบใช่หรือไม่?')) {
                      clearWeeklyChat();
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors cursor-pointer"
                  title="ล้างข้อความแชท (Admin Only)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TAB 1: CHAT VIEW */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Channel / DM Switcher Sub-Header */}
              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-2 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-1.5 text-xs">
                {chatMode === 'dm' && selectedDmUser ? (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={() => {
                        setSelectedDmUser(null);
                        setChatMode('dm');
                      }}
                      className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      title="กลับไปเลือกเพื่อน"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] flex items-center justify-center shrink-0">
                        {selectedDmUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                          {selectedDmUser.name}
                        </span>
                      </div>
                      <div className="ml-auto shrink-0">
                        {getRoleBadge(selectedDmUser.role)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setChatMode('general');
                          setSelectedDmUser(null);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          chatMode === 'general'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                        }`}
                      >
                        <Hash className="w-3 h-3" /> แชทรวมทีม
                        {unreadGeneralChatCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setChatMode('dm');
                          setSelectedDmUser(null);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          chatMode === 'dm' && !selectedDmUser
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                        }`}
                      >
                        <UserIcon className="w-3 h-3" /> แชท 1-on-1
                        {unreadDmCount > 0 && (
                          <span className="px-1 py-0.2 bg-rose-500 text-white text-[8px] font-black rounded-full">
                            {unreadDmCount}
                          </span>
                        )}
                      </button>
                    </div>

                    <span className="text-[9px] text-slate-400 font-semibold hidden sm:inline">
                      ล้างอัตโนมัติ 7 วัน
                    </span>
                  </div>
                )}
              </div>

              {/* DM Select Teammate List View */}
              {chatMode === 'dm' && !selectedDmUser ? (
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
                  {/* Search Bar */}
                  <div className="p-3 border-b border-slate-100 dark:border-slate-850">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อเพื่อนร่วมทีม หรือตำแหน่ง..."
                        value={dmSearch}
                        onChange={(e) => setDmSearch(e.target.value)}
                        style={{ paddingLeft: '2.25rem' }}
                        className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Teammates List */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {teamMembers.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs italic">
                        ไม่พบรายชื่อเพื่อนร่วมทีม
                      </div>
                    ) : (
                      teamMembers.map(u => {
                        // Check if this user has unread messages for Me
                        const hasUnreadFromThisUser = chatMessages.some(m => 
                          m.senderEmail.toLowerCase() === u.email.toLowerCase() &&
                          m.recipientEmail && m.recipientEmail.toLowerCase() === currentUser.email.toLowerCase() &&
                          (!lastReadChatTime || new Date(m.createdAt).getTime() > new Date(lastReadChatTime).getTime())
                        );

                        return (
                          <div
                            key={u.email}
                            onClick={() => setSelectedDmUser(u)}
                            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl hover:border-emerald-300 dark:hover:border-emerald-700/50 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                  {u.name}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate">
                                  {u.email}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {hasUnreadFromThisUser && (
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                              )}
                              {getRoleBadge(u.role)}
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* Chat Messages Stream & Input (For General OR Selected 1-on-1) */
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* Messages Area */}
                  <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5">
                    {currentViewMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                        <MessageSquare className="w-10 h-10 stroke-1 text-slate-300 dark:text-slate-700" />
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {chatMode === 'dm' && selectedDmUser 
                            ? `เริ่มบทสนทนาส่วนตัวกับ ${selectedDmUser.name}` 
                            : 'ยังไม่มีข้อความในสัปดาห์นี้'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {chatMode === 'dm' 
                            ? 'ข้อความนี้จะเห็นเฉพาะคุณและผู้รับเท่านั้นครับ' 
                            : 'เริ่มพิมพ์ข้อความเพื่อพูดคุยประสานงานกับทุกคนในทีมได้เลยครับ'}
                        </p>
                      </div>
                    ) : (
                      currentViewMessages.map(msg => {
                        const isMine = msg.senderEmail.toLowerCase() === currentUser.email.toLowerCase();

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                          >
                            {/* Sender Info (Only for others in General chat) */}
                            {!isMine && chatMode === 'general' && (
                              <div className="flex items-center gap-1.5 px-1">
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
                                  {msg.senderName}
                                </span>
                                {getRoleBadge(msg.senderRole)}
                              </div>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={`max-w-[82%] px-3.5 py-2 rounded-2xl text-xs break-words shadow-2xs ${
                                isMine
                                  ? 'bg-emerald-600 text-white rounded-tr-none'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.message}</p>
                            </div>

                            {/* Timestamp */}
                            <span className="text-[9px] text-slate-400 font-medium px-1">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSend} className="p-3 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/30 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={
                        chatMode === 'dm' && selectedDmUser 
                          ? `ส่งข้อความหา ${selectedDmUser.name}...` 
                          : "พิมพ์ข้อความคุยกับทีม... (กด Enter เพื่อส่ง)"
                      }
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1 text-xs border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim()}
                      className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-xl transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top bar */}
              <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">
                  แจ้งเตือนสถานะคิวงาน & ข้อความ
                </span>
                {notificationsList.length > 0 && (
                  <button
                    onClick={markAllNotifsAsRead}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    อ่านทั้งหมดแล้ว
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                {notificationsList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <Bell className="w-10 h-10 stroke-1 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">ไม่มีการแจ้งเตือนใหม่</p>
                    <p className="text-[10px] text-slate-400">เมื่อมีการขอแก้ไขคิวหรือข้อความแชทส่วนตัว จะแจ้งเตือนที่นี่ครับ</p>
                  </div>
                ) : (
                  notificationsList.map(notif => {
                    const isRead = readNotifIds.includes(notif.id);

                    return (
                      <div
                        key={notif.id}
                        onClick={notif.action}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer group ${
                          isRead
                            ? 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 opacity-75'
                            : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5">
                            {notif.type === 'pending_request' && (
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                            {notif.type === 'approved' && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            )}
                            {notif.type === 'rejected' && (
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                            )}
                            {notif.type === 'dm' && (
                              <MessageCircle className="w-4 h-4 text-emerald-500" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {notif.title}
                              </h4>
                              {!isRead && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {notif.desc}
                            </p>
                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-850 text-[9px] text-slate-400 font-medium">
                              <span>{formatMessageTime(notif.time)}</span>
                              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">
                                เปิดดู <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </>
  );
}
