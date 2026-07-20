'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Booking {
  id: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  brandName: string;
  campaignName: string;
  briefText: string;
  briefLink: string;
  lsArtworkLayout: string; // JSON string of links: Array<{type: string, url: string}>
  ownerEmail: string;
  ownerName: string;
  status: 'Confirmed' | 'Live' | 'Completed' | 'Cancelled';
  remark: string;
  createdAt?: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  status: 'Active' | 'Inactive';
}

export interface User {
  email: string;
  name: string;
  role: string;
  status: 'Active' | 'Inactive';
  password?: string;
  permissions?: {
    roleName: string;
    allowedTabs: string;
    canCreateBooking: boolean;
    canEditBooking: boolean;
    canCancelBooking: boolean;
    isAdmin: boolean;
  };
}

export interface Role {
  roleName: string;
  description: string;
  allowedTabs: string;
  canCreateBooking: boolean;
  canEditBooking: boolean;
  canCancelBooking: boolean;
  isAdmin: boolean;
}

export interface AuditLog {
  timestamp: string;
  userEmail: string;
  userName: string;
  action: string;
  target: string;
  details: string;
  ip: string;
  device: string;
}

export interface SystemSettings {
  lineNotificationsEnabled: boolean;
  lineChannelAccessToken: string;
  lineDestinationId: string;
  frontendUrl: string;
}

export interface Filters {
  room: string;
  brand: string[]; // Supported multi-select array
  status: string;
  action: 'all' | 'mine';
}

interface AppContextType {
  currentTab: string;
  currentUser: User | null;
  token: string | null;
  isSessionRestoring: boolean;
  bookings: Booking[];
  calendarBookings: Booking[];
  myBookings: Booking[];
  rooms: Room[];
  brands: Brand[];
  filters: Filters;
  selectedDate: string;
  calendarSelectedDate: string;
  schedulerSearch: string;
  
  // Admin Data Pools
  allRoomsAdmin: Room[];
  allBrandsAdmin: Brand[];
  allUsersAdmin: User[];
  roles: Role[];
  auditLogs: AuditLog[];
  settings: SystemSettings | null;
  
  // State methods
  setCurrentTab: (tab: string) => void;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  setSelectedDate: (date: string) => void;
  setCalendarSelectedDate: (date: string) => void;
  setSchedulerSearch: (search: string) => void;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings | null>>;
  
  // Modal states
  activeBookingIdForEdit: string | null;
  setActiveBookingIdForEdit: (id: string | null) => void;
  activeBookingCreateData: { date: string; roomName: string; startTime: string; endTime: string } | null;
  setActiveBookingCreateData: (data: { date: string; roomName: string; startTime: string; endTime: string } | null) => void;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  highlightedBookingId: string | null;
  setHighlightedBookingId: (id: string | null) => void;
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  apiCall: (action: string, payload: any, callback?: (err: string | null, data?: any) => void) => Promise<any>;
  refreshActiveTabData: () => Promise<void>;
  
  // Toast notifications helper
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  toasts: Array<{ id: string; msg: string; type: string }>;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentTab, setCurrentTab] = useState<string>('scheduler');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSessionRestoring, setIsSessionRestoring] = useState<boolean>(true);
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [calendarBookings, setCalendarBookings] = useState<Booking[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string>('');
  const [schedulerSearch, setSchedulerSearch] = useState<string>('');
  const [toasts, setToasts] = useState<Array<{ id: string; msg: string; type: string }>>([]);

  // Modal toggle states
  const [activeBookingIdForEdit, setActiveBookingIdForEdit] = useState<string | null>(null);
  const [activeBookingCreateData, setActiveBookingCreateData] = useState<{ date: string; roomName: string; startTime: string; endTime: string } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [highlightedBookingId, setHighlightedBookingId] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    room: '',
    brand: [],
    status: '',
    action: 'all'
  });

  // Admin Data state
  const [allRoomsAdmin, setAllRoomsAdmin] = useState<Room[]>([]);
  const [allBrandsAdmin, setAllBrandsAdmin] = useState<Brand[]>([]);
  const [allUsersAdmin, setAllUsersAdmin] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Initialize Dates
  useEffect(() => {
    const today = new Date();
    const formatted = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    setSelectedDate(formatted);
    setCalendarSelectedDate(formatted);
  }, []);

  // Show Toast
  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Generic Secure API caller matching standard apiCall
  const apiCall = useCallback(async (action: string, payload: any, callback?: (err: string | null, data?: any) => void) => {
    const activeToken = token || localStorage.getItem('th_booking_token');
    const body = {
      action,
      token: activeToken,
      ...payload
    };

    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (res.status === 401) {
        // Force logout on token expiry
        setCurrentUser(null);
        setToken(null);
        localStorage.removeItem('th_booking_token');
        showToast("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง", "warning");
        if (callback) callback("Unauthorized");
        return null;
      }

      const data = await res.json();
      if (data.success === false) {
        const friendlyMsg = translateDatabaseError(data.message || 'Error occurred');
        if (callback) callback(friendlyMsg);
        return data;
      }
      
      if (callback) callback(null, data);
      return data;
    } catch (err: any) {
      console.error("API Call error:", err);
      const friendlyMsg = translateDatabaseError(err.message || 'Network/Server connection error');
      if (callback) callback(friendlyMsg);
      return null;
    }
  }, [token, showToast]);

  // Translate database error constraints into friendly Thai messages
  function translateDatabaseError(err: string): string {
    if (!err) return 'เกิดข้อผิดพลาดที่ไม่รู้จักในระบบ';
    
    const errStr = String(err);
    
    if (errStr.includes('rooms_name_key') || (errStr.includes('Room') && errStr.includes('already exists'))) {
      return 'ชื่อห้องสตูดิโอนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น';
    }
    if (errStr.includes('brands_name_key') || (errStr.includes('already exists') && errStr.includes('brands'))) {
      return 'ชื่อแบรนด์ลูกค้านี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น';
    }
    if (errStr.includes('users_email_key') || (errStr.includes('already exists') && errStr.includes('users'))) {
      return 'อีเมลหรือชื่อผู้ใช้งานนี้ได้รับการลงทะเบียนแล้ว กรุณาใช้ชื่ออื่น';
    }
    if (errStr.includes('violates foreign key constraint')) {
      if (errStr.includes('bookings_room_name_fkey') || (errStr.includes('bookings') && errStr.includes('room'))) {
        return 'ไม่สามารถลบห้องนี้ได้ เนื่องจากมีคิวจองที่อ้างอิงถึงห้องนี้อยู่ในปฏิทิน (กรุณาลบคิวจองของห้องนี้ออกก่อน)';
      }
      if (errStr.includes('bookings_brand_name_fkey') || (errStr.includes('bookings') && errStr.includes('brand'))) {
        return 'ไม่สามารถลบแบรนด์นี้ได้ เนื่องจากมีคิวจองที่อ้างอิงถึงแบรนด์นี้อยู่ในปฏิทิน (กรุณาลบคิวจองของแบรนด์นี้ออกก่อน)';
      }
      if (errStr.includes('users_role_fkey') || (errStr.includes('users') && errStr.includes('role'))) {
        return 'ไม่สามารถลบระดับสิทธิ์นี้ได้ เนื่องจากมีบัญชีผู้ใช้งานระบบที่ผูกกับระดับสิทธิ์นี้อยู่';
      }
      return 'ไม่สามารถลบหรือแก้ไขข้อมูลนี้ได้ เนื่องจากมีข้อมูลอื่นใช้งานอ้างอิงเชื่อมโยงกันอยู่ในระบบ';
    }
    if (errStr.includes('collision') || errStr.includes('overlap')) {
      return 'ไม่สามารถบันทึกได้ เนื่องจากช่วงเวลาและห้องที่เลือก ซ้อนทับกับคิวที่มีอยู่แล้ว';
    }
    if (errStr.includes('not found') || errStr.includes('PGRST205')) {
      return 'ไม่พบตารางข้อมูลในระบบ กรุณาตรวจสอบว่าได้ทำการ Run คำสั่งสร้างตารางใน Supabase SQL Editor แล้วหรือยัง';
    }
    if (errStr.includes('Missing SUPABASE_URL') || errStr.includes('SUPABASE_KEY')) {
      return 'ขาดคีย์เชื่อมต่อ Supabase ในไฟล์ .env.local กรุณาตรวจสอบให้ครบถ้วน';
    }
    
    if (errStr.includes('Forbidden')) {
      return 'สิทธิ์การใช้งานของคุณไม่เพียงพอสำหรับการดำเนินการนี้ กรุณาติดต่อ Master Admin';
    }
    
    return err;
  }

  // Sync / Refresh data
  const refreshActiveTabData = useCallback(async () => {
    if (!token) return;
    
    // Equivalent of getInitData
    await apiCall('getInitData', {}, (err, data) => {
      if (err) {
        console.warn("Silent background load failed:", err);
        return;
      }
      
      if (data) {
        if (data.rooms) setRooms(data.rooms);
        if (data.brands) setBrands(data.brands);
        if (data.allBookings) {
          setCalendarBookings(data.allBookings);
          // Sync scheduler bookings for current selected date
          const dateVal = selectedDate || new Date().toISOString().split('T')[0];
          setBookings(data.allBookings.filter((b: Booking) => b.date === dateVal && b.status !== 'Cancelled'));
        }
        
        // Admin panels sync
        if (data.allRoomsAdmin) setAllRoomsAdmin(data.allRoomsAdmin);
        if (data.allBrandsAdmin) setAllBrandsAdmin(data.allBrandsAdmin);
        if (data.allUsersAdmin) setAllUsersAdmin(data.allUsersAdmin);
        if (data.roles) setRoles(data.roles);
        
        // Local My Bookings filtering matching getMyBookings
        if (data.user && data.allBookings) {
          setMyBookings(data.allBookings.filter((b: Booking) => b.ownerEmail.toLowerCase() === data.user.email.toLowerCase()));
        }
      }
    });
  }, [token, apiCall, selectedDate, currentUser]);

  // Enforce tab permissions dynamically when currentUser or currentTab changes
  useEffect(() => {
    if (currentUser && currentUser.permissions) {
      const allowed = (currentUser.permissions.allowedTabs || '').split(',');
      if (allowed.length > 0) {
        // If currentTab is setting/admin subtabs and we have settings access
        const isSettingsSub = ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings'].includes(currentTab);
        const hasSettingsAccess = allowed.some(tab => 
          ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings'].includes(tab)
        );
        
        if (isSettingsSub && hasSettingsAccess) {
          return;
        }
        
        if (!allowed.includes(currentTab)) {
          setCurrentTab(allowed[0]);
        }
      }
    }
  }, [currentUser, currentTab]);

  // Login handler
  const login = async (email: string, password: string) => {
    const data = await apiCall('login', { email, password });
    if (data && data.success && data.token) {
      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('th_booking_token', data.token);
      showToast(`ยินดีต้อนรับคุณ ${data.user.name} เข้าสู่ระบบ`, "success");
      
      // Switch to first allowed tab on login
      if (data.user.permissions) {
        const allowed = (data.user.permissions.allowedTabs || '').split(',');
        if (allowed.length > 0 && !allowed.includes(currentTab)) {
          setCurrentTab(allowed[0]);
        }
      }

      // Immediately load initial states
      setTimeout(() => {
        refreshActiveTabData();
      }, 50);
      
      return { success: true };
    }
    return { success: false, message: data?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
  };

  // Logout handler
  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('th_booking_token');
    showToast("ออกจากระบบเรียบร้อยแล้ว", "info");
  };

  // Auto restore login session on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('th_booking_token');
    if (savedToken) {
      setToken(savedToken);
      // Validate session and pre-fetch
      apiCall('getInitData', { token: savedToken }, (err, data) => {
        try {
          if (!err && data && data.user) {
            setCurrentUser(data.user);
            if (data.rooms) setRooms(data.rooms);
            if (data.brands) setBrands(data.brands);
            if (data.allBookings) {
              setCalendarBookings(data.allBookings);
              // Default selectedDate filtering
              const today = new Date().toISOString().split('T')[0];
              setBookings(data.allBookings.filter((b: Booking) => b.date === today && b.status !== 'Cancelled'));
            }
            if (data.allRoomsAdmin) setAllRoomsAdmin(data.allRoomsAdmin);
            if (data.allBrandsAdmin) setAllBrandsAdmin(data.allBrandsAdmin);
            if (data.allUsersAdmin) setAllUsersAdmin(data.allUsersAdmin);
            if (data.roles) setRoles(data.roles);
            if (data.allBookings) {
              setMyBookings(data.allBookings.filter((b: Booking) => b.ownerEmail.toLowerCase() === data.user.email.toLowerCase()));
            }

            // Switch to first allowed tab on restore
            if (data.user.permissions) {
              const allowed = (data.user.permissions.allowedTabs || '').split(',');
              if (allowed.length > 0 && !allowed.includes(currentTab)) {
                setCurrentTab(allowed[0]);
              }
            }
          } else {
            // Token is invalid/expired
            localStorage.removeItem('th_booking_token');
            setToken(null);
          }
        } finally {
          setIsSessionRestoring(false);
        }
      });
    } else {
      setIsSessionRestoring(false);
    }
  }, [token, apiCall]);

  // Polling data every 30 seconds for background real-time sync (replaces GAS trigger pool)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      refreshActiveTabData();
    }, 30000);
    return () => clearInterval(interval);
  }, [token, refreshActiveTabData]);

  // Watch for selectedDate changes to update bookings list in Scheduler view
  useEffect(() => {
    if (calendarBookings.length > 0 && selectedDate) {
      setBookings(calendarBookings.filter(b => b.date === selectedDate && b.status !== 'Cancelled'));
    }
  }, [selectedDate, calendarBookings]);

  return (
    <AppContext.Provider value={{
      currentTab,
      currentUser,
      token,
      isSessionRestoring,
      bookings,
      calendarBookings,
      myBookings,
      rooms,
      brands,
      filters,
      selectedDate,
      calendarSelectedDate,
      schedulerSearch,
      
      allRoomsAdmin,
      allBrandsAdmin,
      allUsersAdmin,
      roles,
      auditLogs,
      settings,
      
      setCurrentTab,
      setFilters,
      setSelectedDate,
      setCalendarSelectedDate,
      setSchedulerSearch,
      setAuditLogs,
      setSettings,
      
      activeBookingIdForEdit,
      setActiveBookingIdForEdit,
      activeBookingCreateData,
      setActiveBookingCreateData,
      isImportModalOpen,
      setIsImportModalOpen,
      highlightedBookingId,
      setHighlightedBookingId,
      
      login,
      logout,
      apiCall,
      refreshActiveTabData,
      
      showToast,
      toasts,
      removeToast
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
