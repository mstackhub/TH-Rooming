'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Calendar, 
  CalendarClock,
  BookOpen, 
  LineChart, 
  Settings, 
  LogOut, 
  User as UserIcon,
  ChevronDown,
  FileEdit,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export default function Navigation() {
  const { currentTab, setCurrentTab, currentUser, logout, changeRequests } = useApp();
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('th_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('th_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const pendingRequestsCount = (changeRequests || []).filter(r => r && r.status === 'Pending').length;

  // Auto-expand dropdowns when active tab is one of their sub-tabs
  useEffect(() => {
    if (['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live'].includes(currentTab)) {
      setIsSettingsExpanded(true);
    }
    if (['analytics', 'analytics-staff', 'analytics-mc'].includes(currentTab)) {
      setIsAnalyticsExpanded(true);
    }
  }, [currentTab]);

  if (!currentUser) return null;

  const allowedTabs = currentUser.permissions?.allowedTabs.split(',') || [];

  const allNavItems = [
    { id: 'scheduler', name: 'ตารางงานรายวัน', icon: CalendarClock },
    { id: 'calendar', name: 'ปฏิทินห้องไลฟ์', icon: Calendar },
    { id: 'my-bookings', name: 'ประวัติการจองของฉัน', icon: UserIcon },
    { id: 'campaign-schedule', name: 'แคมเปญทั้งหมด', icon: BookOpen },
    { id: 'change-requests', name: 'จัดการคำขอแก้ไขคิว', icon: FileEdit, badge: pendingRequestsCount },
    { id: 'analytics', name: 'รายงานและสถิติ', icon: LineChart },
    { id: 'settings', name: 'ตั้งค่าระบบ', icon: Settings, adminOnly: true }
  ];

  const visibleItems = allNavItems.filter(item => {
    if (item.id === 'settings') {
      return allowedTabs.some(tab => 
        ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live'].includes(tab)
      );
    }
    if (item.id === 'analytics') {
      return allowedTabs.includes('analytics');
    }
    return allowedTabs.includes(item.id);
  });

  return (
    <aside 
      id="app-sidebar" 
      className={`w-full ${
        isCollapsed ? 'lg:w-20' : 'lg:w-72'
      } bg-white dark:bg-slate-900/90 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800/85 flex flex-col shrink-0 transition-all duration-300 z-20`}
    >
      {/* Sidebar Header */}
      <div className={`p-4 lg:p-5 border-b border-slate-100 dark:border-slate-800/60 select-none ${
        isCollapsed ? 'flex flex-col items-center justify-center gap-2' : ''
      }`}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-base font-black text-slate-900 dark:text-white leading-tight tracking-tight">TH Booking</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase mt-0.5">Live Studio Portal</span>
            </div>
            <button
              onClick={toggleCollapse}
              title="หุบเมนูด้านข้าง (เหลือเฉพาะไอคอน)"
              className="p-2 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:text-brand-400 dark:hover:bg-slate-800 transition-all cursor-pointer hidden lg:flex items-center justify-center"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-brand-500/20 tracking-tighter">
              TH
            </div>
            <button
              onClick={toggleCollapse}
              title="ขยายเมนูด้านข้าง"
              className="p-2 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-950/30 transition-all cursor-pointer hidden lg:flex items-center justify-center"
            >
              <PanelLeftOpen className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <nav className={`flex-1 p-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto gap-1.5 text-slate-700 dark:text-slate-350 select-none ${
        isCollapsed ? 'lg:items-center' : ''
      }`}>
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isSettingsItem = item.id === 'settings';
          const isAnalyticsItem = item.id === 'analytics';
          
          const isActive = isSettingsItem 
            ? ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live'].includes(currentTab)
            : isAnalyticsItem
              ? ['analytics', 'analytics-staff', 'analytics-mc'].includes(currentTab)
              : currentTab === item.id;

          return (
            <div key={item.id} className={`w-full flex flex-col gap-1 shrink-0 ${isCollapsed ? 'lg:items-center' : ''}`}>
              <button
                onClick={() => {
                  if (isCollapsed) {
                    // In collapsed mode, clicking Settings or Analytics directly opens the main subtab
                    if (isSettingsItem) {
                      const firstAllowedSub = ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live'].find(t => allowedTabs.includes(t)) || 'rooms';
                      setCurrentTab(firstAllowedSub);
                    } else if (isAnalyticsItem) {
                      setCurrentTab('analytics');
                    } else {
                      setCurrentTab(item.id);
                    }
                    return;
                  }

                  if (isSettingsItem) {
                    setIsSettingsExpanded(!isSettingsExpanded);
                    const currentIsSub = ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live'].includes(currentTab);
                    if (!currentIsSub) {
                      const firstAllowedSub = ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live'].find(t => allowedTabs.includes(t));
                      if (firstAllowedSub) {
                        setCurrentTab(firstAllowedSub);
                      }
                    }
                  } else if (isAnalyticsItem) {
                    setIsAnalyticsExpanded(!isAnalyticsExpanded);
                    const currentIsSub = ['analytics', 'analytics-staff', 'analytics-mc'].includes(currentTab);
                    if (!currentIsSub) {
                      setCurrentTab('analytics');
                    }
                  } else {
                    setCurrentTab(item.id);
                  }
                }}
                title={item.name}
                className={`group flex items-center text-left transition-all cursor-pointer relative ${
                  isCollapsed
                    ? 'lg:w-11 lg:h-11 lg:p-0 lg:justify-center rounded-2xl ' + (isActive 
                        ? 'bg-gradient-to-r from-brand-500 to-indigo-600 text-white shadow-md shadow-brand-500/20' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100')
                    : 'w-full gap-3 px-4 py-3.5 text-xs lg:text-[13px] font-bold rounded-2xl ' + (isActive 
                        ? 'bg-gradient-to-r from-brand-500 to-indigo-600 text-white shadow-lg shadow-brand-500/20' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100')
                }`}
              >
                {/* Active Item Vertical Accent Bar */}
                {isActive && !isSettingsItem && !isAnalyticsItem && !isCollapsed && (
                  <div className="absolute left-0 top-1/3 bottom-1/3 w-1.5 bg-white rounded-r-full" />
                )}
                
                <Icon className={`w-4.5 h-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                }`} />

                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-full animate-pulse ${
                        isActive ? 'bg-white text-brand-600' : 'bg-rose-500 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {(isSettingsItem || isAnalyticsItem) && (
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isSettingsItem ? (isSettingsExpanded ? 'rotate-180' : '') : (isAnalyticsExpanded ? 'rotate-180' : '')
                      } ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    )}
                  </>
                )}

                {/* Collapsed notification badge indicator */}
                {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </button>

              {/* Indented Collapsible Analytics Sub-menus (Only when expanded) */}
              {!isCollapsed && isAnalyticsItem && isAnalyticsExpanded && (
                <div className="pl-3 pr-2 py-1 flex flex-col gap-1 border-l border-slate-200 dark:border-slate-800 ml-6 mt-1.5 animate-in slide-in-from-top-1 duration-150">
                  {[
                    { id: 'analytics', name: 'สถิติและการใช้งาน' },
                    { id: 'analytics-staff', name: 'ประสิทธิภาพ Staff' },
                    { id: 'analytics-mc', name: 'ประสิทธิภาพ MC' }
                  ].map(sub => {
                    const isSubActive = currentTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setCurrentTab(sub.id)}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all focus:outline-none ${
                          isSubActive
                            ? 'bg-brand-50/90 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 font-bold border-l-2 border-brand-500 rounded-r-xl rounded-l-none pl-3'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 hover:text-slate-800 dark:hover:text-slate-200 border-l-2 border-transparent pl-3'
                        }`}
                      >
                        {sub.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Indented Collapsible Settings Sub-menus (Only when expanded) */}
              {!isCollapsed && isSettingsItem && isSettingsExpanded && (
                <div className="pl-3 pr-2 py-1 flex flex-col gap-1 border-l border-slate-200 dark:border-slate-800 ml-6 mt-1.5 animate-in slide-in-from-top-1 duration-150">
                  {[
                    { id: 'rooms', name: 'ห้องสตูดิโอ' },
                    { id: 'brands', name: 'แบรนด์ลูกค้า' },
                    { id: 'mc-live', name: 'การจัดการ MC ไลฟ์สด' },
                    { id: 'users', name: 'ผู้ใช้งานระบบ' },
                    { id: 'roles-mgmt', name: 'ระดับสิทธิ์การจอง' },
                    { id: 'audit-log', name: 'ประวัติกิจกรรม' },
                    { id: 'settings', name: 'ตั้งค่าระบบการแจ้งเตือน' }
                  ].filter(sub => allowedTabs.includes(sub.id)).map(sub => {
                    const isSubActive = currentTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setCurrentTab(sub.id)}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all focus:outline-none flex items-center justify-between ${
                          isSubActive
                            ? 'bg-brand-50/90 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 font-bold border-l-2 border-brand-500 rounded-r-xl rounded-l-none pl-3'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 hover:text-slate-800 dark:hover:text-slate-200 border-l-2 border-transparent pl-3'
                        }`}
                      >
                        <span>{sub.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile Card */}
      <div className={`p-3 lg:p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20 flex items-center text-slate-800 dark:text-slate-200 ${
        isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between gap-3'
      }`}>
        <div className={`flex items-center gap-3 overflow-hidden select-none ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="relative">
            <div 
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-650 text-white flex items-center justify-center font-black text-sm shrink-0 uppercase shadow-inner"
              title={`${currentUser.name} (${currentUser.role})`}
            >
              {currentUser.name ? currentUser.name.substring(0, 2) : 'US'}
            </div>
            {/* Active Status Dot */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold truncate leading-tight">{currentUser.name}</span>
              <span className="text-[9px] text-slate-455 dark:text-slate-500 font-bold uppercase tracking-wider truncate mt-0.5">{currentUser.role}</span>
            </div>
          )}
        </div>
        
        <button
          onClick={logout}
          title="ออกจากระบบ"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
