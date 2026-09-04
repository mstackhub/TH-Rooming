'use client';

import React, { useState, useMemo } from 'react';
import { useApp, Room, Brand, User, Role, AuditLog, BookingChangeRequest, Booking } from '@/context/AppContext';
import { formatThaiDate, getAutoStatus, generateBookingCustomId, parseTimeToMinutes } from '@/utils/time';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  Database, 
  Tag, 
  UserPlus, 
  Layers, 
  Settings as SettingsIcon,
  Search,
  Check,
  X,
  Bell,
  RefreshCw,
  Clock,
  FileEdit,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
  Users,
  HelpCircle,
  AlertTriangle,
  SlidersHorizontal,
  Filter,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  UserCheck,
  Radio,
  Download,
  HardDrive,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';

type SubTab = 'rooms' | 'brands' | 'users' | 'roles' | 'logs' | 'settings' | 'mc-live' | 'change-requests';

function safeDateLocaleString(val: any): string {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString('th-TH');
  } catch (e) {
    return String(val);
  }
}

export default function AdminPanels() {
  const {
    allRoomsAdmin,
    allBrandsAdmin,
    allUsersAdmin,
    rooms,
    brands,
    roles,
    auditLogs,
    settings,
    setAuditLogs,
    setSettings,
    apiCall,
    refreshActiveTabData,
    showToast,
    currentUser,
    calendarBookings,
    currentTab,
    setCurrentTab,
    mcList,
    mcTiers,
    changeRequests,
    setSelectedDate,
    setHighlightedBookingId
  } = useApp();

  const allowedTabs = useMemo(() => currentUser?.permissions?.allowedTabs.split(',') || [], [currentUser]);

  // Fine-grained permission checker with strict matching
  const hasPerm = (perm: string) => {
    if (currentUser?.permissions?.isAdmin || currentUser?.role === 'Master Admin') return true;
    return allowedTabs.includes(perm);
  };

  const activeSubTab = useMemo<SubTab>(() => {
    if (currentTab === 'rooms') return 'rooms';
    if (currentTab === 'brands') return 'brands';
    if (currentTab === 'mc-live') return 'mc-live';
    if (currentTab === 'change-requests') return 'change-requests';
    if (currentTab === 'users') return 'users';
    if (currentTab === 'roles-mgmt') return 'roles';
    if (currentTab === 'audit-log') return 'logs';
    if (currentTab === 'settings') return 'settings';
    
    // Fallback based on permissions
    if (allowedTabs.includes('rooms')) return 'rooms';
    if (allowedTabs.includes('brands')) return 'brands';
    if (allowedTabs.includes('mc-live')) return 'mc-live';
    if (allowedTabs.includes('change-requests')) return 'change-requests';
    if (allowedTabs.includes('users')) return 'users';
    if (allowedTabs.includes('roles-mgmt')) return 'roles';
    if (allowedTabs.includes('audit-log')) return 'logs';
    if (allowedTabs.includes('settings')) return 'settings';
    return 'rooms';
  }, [currentTab, allowedTabs]);
  
  // Generic Loading states
  const [submitting, setSubmitting] = useState(false);

  // Search filter query
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // Form states - ROOMS
  const [roomOldName, setRoomOldName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [roomStatus, setRoomStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  // Form states - BRANDS
  const [brandOldName, setBrandOldName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandStatus, setBrandStatus] = useState<'Active' | 'Inactive'>('Active');
  const [brandAssignedUsers, setBrandAssignedUsers] = useState<string[]>([]);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  // Brands Selection & Filter states
  const [selectedBrandNames, setSelectedBrandNames] = useState<string[]>([]);
  const [brandStatusFilter, setBrandStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [isBrandStatusFilterOpen, setIsBrandStatusFilterOpen] = useState(false);
  const [brandCaregiverFilter, setBrandCaregiverFilter] = useState<string[]>([]);
  const [isCaregiverFilterOpen, setIsCaregiverFilterOpen] = useState(false);
  const [caregiverFilterSearch, setCaregiverFilterSearch] = useState('');

  // Quick Caregiver Modal states
  const [quickCaregiverBrand, setQuickCaregiverBrand] = useState<Brand | null>(null);
  const [quickCaregiverUsers, setQuickCaregiverUsers] = useState<string[]>([]);
  const [isQuickCaregiverModalOpen, setIsQuickCaregiverModalOpen] = useState(false);

  // Brand Block / Warning Modal states
  const [blockedBrandName, setBlockedBrandName] = useState('');
  const [blockedBrandAction, setBlockedBrandAction] = useState<'inactive' | 'delete'>('inactive');
  const [blockedBrandBookings, setBlockedBrandBookings] = useState<Booking[]>([]);
  const [isBrandBlockModalOpen, setIsBrandBlockModalOpen] = useState(false);

  // Live session viewer modal state
  const [viewingBrandSessions, setViewingBrandSessions] = useState<{ brandName: string; bookings: Booking[] } | null>(null);

  // Form states - USERS
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('Viewer');
  const [userStatus, setUserStatus] = useState<'Active' | 'Inactive'>('Active');
  const [userPassword, setUserPassword] = useState('');
  const [showUserPasswordInput, setShowUserPasswordInput] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Form states - ROLES
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleAllowedTabs, setRoleAllowedTabs] = useState<string[]>(['my-bookings', 'calendar', 'scheduler', 'campaign-schedule', 'analytics']);
  const [canCreateBooking, setCanCreateBooking] = useState(false);
  const [canEditBooking, setCanEditBooking] = useState(false);
  const [canCancelBooking, setCanCancelBooking] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Form states - SETTINGS
  const [settingsLineEnabled, setSettingsLineEnabled] = useState(settings?.lineNotificationsEnabled || false);
  const [settingsLineToken, setSettingsLineToken] = useState(settings?.lineChannelAccessToken || '');
  const [settingsLineDestId, setSettingsLineDestId] = useState(settings?.lineDestinationId || '');
  const [settingsUrl, setSettingsUrl] = useState(settings?.frontendUrl || '');
  const [settingsLiveChannels, setSettingsLiveChannels] = useState(settings?.liveChannels || '');
  const [settingsChangeRequestLockDays, setSettingsChangeRequestLockDays] = useState<number>(settings?.changeRequestLockDays !== undefined ? settings.changeRequestLockDays : 14);

  // Form states - MC LIVE MANAGEMENT
  const [mcSubTab, setMcSubTab] = useState<'list' | 'tiers'>('list');
  const [mcSearch, setMcSearch] = useState('');
  const [mcFilterTiers, setMcFilterTiers] = useState<string[]>([]);
  const [isMcTierFilterOpen, setIsMcTierFilterOpen] = useState(false);
  const [mcTierFilterSearch, setMcTierFilterSearch] = useState('');
  const [mcFilterStatus, setMcFilterStatus] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [isMcStatusFilterOpen, setIsMcStatusFilterOpen] = useState(false);
  const [mcSort, setMcSort] = useState<'name-asc' | 'name-desc' | 'tier-asc'>('name-asc');
  const [isMcSortOpen, setIsMcSortOpen] = useState(false);

  const [isMcModalOpen, setIsMcModalOpen] = useState(false);
  const [editingMc, setEditingMc] = useState<any | null>(null);
  const [mcName, setMcName] = useState('');
  const [mcTierId, setMcTierId] = useState('');
  const [mcStatus, setMcStatus] = useState<'Active' | 'Inactive'>('Active');

  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<any | null>(null);
  const [tierName, setTierName] = useState('');
  const [tierSortOrder, setTierSortOrder] = useState<number | string>('');

  const [blockedBookings, setBlockedBookings] = useState<any[]>([]);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockedMcName, setBlockedMcName] = useState('');

  const getNextAvailableSortOrder = (excludeTierId?: string) => {
    const usedOrders = new Set(
      mcTiers
        .filter(t => t.id !== excludeTierId && typeof t.sortOrder === 'number')
        .map(t => t.sortOrder)
    );
    let next = 0;
    while (usedOrders.has(next)) {
      next++;
    }
    return next;
  };

  const resetMcForm = () => {
    setMcName('');
    setMcTierId(mcTiers[0]?.id || '');
    setMcStatus('Active');
    setEditingMc(null);
  };

  const resetTierForm = () => {
    setTierName('');
    setTierSortOrder(getNextAvailableSortOrder());
    setEditingTier(null);
  };

  // Reset all forms
  const resetRoomForm = () => {
    setRoomOldName('');
    setRoomName('');
    setRoomDesc('');
    setRoomStatus('Active');
    setIsEditingRoom(false);
    setIsRoomModalOpen(false);
  };

  const resetBrandForm = () => {
    setBrandOldName('');
    setBrandName('');
    setBrandStatus('Active');
    setBrandAssignedUsers([]);
    setIsEditingBrand(false);
    setIsBrandModalOpen(false);
  };

  // Full System Backup States & Handler
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);

  const handleDownloadBackup = async (format: 'json' | 'xlsx') => {
    setIsBackingUp(true);
    setBackupSuccessMsg(null);
    try {
      await apiCall('exportFullBackup', {}, (err, res) => {
        setIsBackingUp(false);
        if (err || !res?.backupData) {
          showToast(err || 'ไม่สามารถดึงข้อมูลสำรองได้', 'error');
          return;
        }

        const backupData = res.backupData;
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

        if (format === 'json') {
          // JSON Export
          const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute('href', jsonString);
          downloadAnchor.setAttribute('download', `backup_th_rooming_${dateStr}.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
          showToast('ดาวน์โหลดไฟล์สำรองข้อมูล JSON สำเร็จ', 'success');
          setBackupSuccessMsg(`สำรองข้อมูล JSON สำเร็จ (${backupData.summary?.bookingsCount || 0} คิวจอง, ${backupData.summary?.brandsCount || 0} แบรนด์, ${backupData.summary?.roomsCount || 0} ห้อง)`);
        } else {
          // XLSX Multi-Sheet Export
          const wb = XLSX.utils.book_new();

          // Sheet 1: Summary Info
          const summaryRows = [
            { "หัวข้อ": "ระบบ", "รายละเอียด": backupData.system },
            { "หัวข้อ": "เวอร์ชันโครงสร้าง", "รายละเอียด": backupData.version },
            { "หัวข้อ": "วันที่และเวลาที่สำรองข้อมูล", "รายละเอียด": backupData.exportedAt },
            { "หัวข้อ": "ผู้ทำการสำรองข้อมูล", "รายละเอียด": `${backupData.exportedBy?.name || ''} (${backupData.exportedBy?.email || ''})` },
            { "หัวข้อ": "จำนวนคิวจองทั้งหมด (Bookings)", "รายละเอียด": backupData.summary?.bookingsCount || 0 },
            { "หัวข้อ": "จำนวนแบรนด์ทั้งหมด (Brands)", "รายละเอียด": backupData.summary?.brandsCount || 0 },
            { "หัวข้อ": "จำนวนห้องสตูดิโอ (Rooms)", "รายละเอียด": backupData.summary?.roomsCount || 0 },
            { "หัวข้อ": "จำนวนรายชื่อ MC (MC List)", "รายละเอียด": backupData.summary?.mcListCount || 0 },
            { "หัวข้อ": "จำนวนระดับ MC Tier", "รายละเอียด": backupData.summary?.mcTiersCount || 0 },
            { "หัวข้อ": "จำนวนผู้ใช้งานระบบ (Users)", "รายละเอียด": backupData.summary?.usersCount || 0 },
            { "หัวข้อ": "จำนวนระดับสิทธิ์ (Roles)", "รายละเอียด": backupData.summary?.rolesCount || 0 },
            { "หัวข้อ": "จำนวนคำขอแก้ไขคิว (Change Requests)", "รายละเอียด": backupData.summary?.changeRequestsCount || 0 }
          ];
          const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
          XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

          // Sheet 2: Bookings
          if (backupData.tables?.bookings && backupData.tables.bookings.length > 0) {
            const wsBookings = XLSX.utils.json_to_sheet(backupData.tables.bookings);
            XLSX.utils.book_append_sheet(wb, wsBookings, 'Bookings');
          }

          // Sheet 3: Brands
          if (backupData.tables?.brands && backupData.tables.brands.length > 0) {
            const wsBrands = XLSX.utils.json_to_sheet(backupData.tables.brands);
            XLSX.utils.book_append_sheet(wb, wsBrands, 'Brands');
          }

          // Sheet 4: Rooms
          if (backupData.tables?.rooms && backupData.tables.rooms.length > 0) {
            const wsRooms = XLSX.utils.json_to_sheet(backupData.tables.rooms);
            XLSX.utils.book_append_sheet(wb, wsRooms, 'Rooms');
          }

          // Sheet 5: MC List
          if (backupData.tables?.mc_list && backupData.tables.mc_list.length > 0) {
            const wsMc = XLSX.utils.json_to_sheet(backupData.tables.mc_list);
            XLSX.utils.book_append_sheet(wb, wsMc, 'MC_List');
          }

          // Sheet 6: MC Tiers
          if (backupData.tables?.mc_tiers && backupData.tables.mc_tiers.length > 0) {
            const wsTiers = XLSX.utils.json_to_sheet(backupData.tables.mc_tiers);
            XLSX.utils.book_append_sheet(wb, wsTiers, 'MC_Tiers');
          }

          // Sheet 7: Users
          if (backupData.tables?.users && backupData.tables.users.length > 0) {
            const wsUsers = XLSX.utils.json_to_sheet(backupData.tables.users);
            XLSX.utils.book_append_sheet(wb, wsUsers, 'Users');
          }

          // Sheet 8: Roles
          if (backupData.tables?.roles && backupData.tables.roles.length > 0) {
            const wsRoles = XLSX.utils.json_to_sheet(backupData.tables.roles);
            XLSX.utils.book_append_sheet(wb, wsRoles, 'Roles');
          }

          // Sheet 9: Change Requests
          if (backupData.tables?.booking_change_requests && backupData.tables.booking_change_requests.length > 0) {
            const wsRequests = XLSX.utils.json_to_sheet(backupData.tables.booking_change_requests);
            XLSX.utils.book_append_sheet(wb, wsRequests, 'Change_Requests');
          }

          // Sheet 10: System Settings
          const settingsRows = backupData.tables?.settings || backupData.tables?.system_settings || [];
          if (settingsRows.length > 0) {
            const wsSettings = XLSX.utils.json_to_sheet(settingsRows);
            XLSX.utils.book_append_sheet(wb, wsSettings, 'Settings');
          }

          XLSX.writeFile(wb, `backup_th_rooming_all_sheets_${dateStr}.xlsx`);
          showToast('ดาวน์โหลดไฟล์สำรองข้อมูล Excel รวมทุกชีตสำเร็จ', 'success');
          setBackupSuccessMsg(`สำรองข้อมูล Excel รวมทุกชีตสำเร็จ (${backupData.summary?.bookingsCount || 0} คิวจอง, ${backupData.summary?.brandsCount || 0} แบรนด์, ${backupData.summary?.roomsCount || 0} ห้อง)`);
        }
      });
    } catch (e: any) {
      setIsBackingUp(false);
      showToast('เกิดข้อผิดพลาดในการสำรองข้อมูล: ' + (e.message || ''), 'error');
    }
  };

  const resetUserForm = () => {
    setUserEmail('');
    setUserName('');
    setUserRole('Viewer');
    setUserStatus('Active');
    setUserPassword('');
    setShowUserPasswordInput(false);
    setIsEditingUser(false);
    setIsUserModalOpen(false);
  };

  const resetRoleForm = () => {
    setRoleName('');
    setRoleDesc('');
    setRoleAllowedTabs(['my-bookings', 'calendar', 'scheduler', 'campaign-schedule', 'analytics']);
    setCanCreateBooking(false);
    setCanEditBooking(false);
    setCanCancelBooking(false);
    setIsAdmin(false);
    setIsEditingRole(false);
    setIsRoleModalOpen(false);
  };

  // Sync state settings on load
  React.useEffect(() => {
    if (settings) {
      setSettingsLineEnabled(settings.lineNotificationsEnabled);
      setSettingsLineToken(settings.lineChannelAccessToken);
      setSettingsLineDestId(settings.lineDestinationId);
      setSettingsUrl(settings.frontendUrl);
      setSettingsLiveChannels(settings.liveChannels || '');
      setSettingsChangeRequestLockDays(settings.changeRequestLockDays !== undefined ? settings.changeRequestLockDays : 14);
    }
  }, [settings]);

  // Loading state for logs
  const [logsLoading, setLogsLoading] = React.useState(false);

  // Fetch settings on-demand
  React.useEffect(() => {
    if (activeSubTab === 'settings') {
      apiCall('getSystemSettings', {}, (err, data) => {
        if (!err && data) setSettings(data);
      });
    }
  }, [activeSubTab, apiCall, setSettings]);

  // Fetch logs on-demand (only when activeSubTab is 'logs')
  React.useEffect(() => {
    if (activeSubTab === 'logs') {
      setLogsLoading(true);
      apiCall('getActivityLogs', {}, (err, data) => {
        setLogsLoading(false);
        if (!err && data && data.logs) {
          setAuditLogs(data.logs);
        }
      });
    }
  }, [activeSubTab, apiCall, setAuditLogs]);

  // Change Requests Review & Approval States
  const [reqFilterStatus, setReqFilterStatus] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedReq, setSelectedReq] = useState<BookingChangeRequest | null>(null);
  const [reviewMatchedBooking, setReviewMatchedBooking] = useState<Booking | null>(null);
  const [reviewHandlerNote, setReviewHandlerNote] = useState('');
  
  // Review form fields for updating the booking
  const [revDate, setRevDate] = useState('');
  const [revStartTime, setRevStartTime] = useState('09:00');
  const [revEndTime, setRevEndTime] = useState('11:00');
  const [revRoom, setRevRoom] = useState('');
  const [revBrand, setRevBrand] = useState('');
  const [revCampaign, setRevCampaign] = useState('');
  const [revSelectedMcIds, setRevSelectedMcIds] = useState<string[]>([]);
  const [revBriefText, setRevBriefText] = useState('');
  const [revBriefLink, setRevBriefLink] = useState('');
  const [revRemark, setRevRemark] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);

  // Time slots list for review modal
  const reviewTimeSlotOptions = useMemo(() => {
    const list: string[] = [];
    for (let h = 0; h < 24; h++) {
      const hh = String(h).padStart(2, '0');
      list.push(`${hh}:00`);
      list.push(`${hh}:30`);
    }
    list.push('23:59');
    return list;
  }, []);

  // Check room conflict for review modal
  const reviewSlotConflict = useMemo(() => {
    if (!revDate || !revRoom || !revStartTime || !revEndTime) return null;
    const sMin = parseTimeToMinutes(revStartTime);
    const eMin = parseTimeToMinutes(revEndTime);
    if (sMin >= eMin) return 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด';
    const conflict = calendarBookings.find(b => {
      if (b.status === 'Cancelled') return false;
      if (selectedReq?.bookingId && b.id === selectedReq.bookingId) return false;
      if (b.date !== revDate || b.roomName !== revRoom) return false;
      const bS = parseTimeToMinutes(b.startTime);
      const bE = parseTimeToMinutes(b.endTime);
      return sMin < bE && eMin > bS;
    });
    return conflict ? `ห้อง ${revRoom} มีคิวชนกับแบรนด์ ${conflict.brandName} (${conflict.startTime} - ${conflict.endTime} น.)` : null;
  }, [revDate, revRoom, revStartTime, revEndTime, calendarBookings, selectedReq]);

  const handleOpenReview = (req: BookingChangeRequest) => {
    setSelectedReq(req);
    setReviewHandlerNote(req.handlerNote || '');
    
    const padTime = (t: string) => {
      if (!t) return '09:00';
      const parts = t.trim().split(':');
      if (parts.length === 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
      return t;
    };

    if (req.requestType === 'create_slot') {
      let draft: any = {};
      try {
        const parsed = JSON.parse(req.requestDetails);
        draft = parsed.bookingDraft || parsed;
      } catch (e) {}

      setReviewMatchedBooking(null);
      setRevDate(draft.date || new Date().toISOString().split('T')[0]);
      setRevStartTime(padTime(draft.startTime || '09:00'));
      setRevEndTime(padTime(draft.endTime || '10:00'));
      setRevRoom(draft.roomName || (rooms && rooms[0] ? rooms[0].name : ''));
      setRevBrand(draft.brandName || (brands && brands[0] ? brands[0].name : ''));
      setRevCampaign(draft.campaignName || '');
      setRevSelectedMcIds(draft.mcId ? draft.mcId.split(',').map((x: string) => x.trim()).filter(Boolean) : []);
      setRevBriefText(draft.briefText || '');
      setRevBriefLink(draft.briefLink || '');
      setRevRemark(draft.remark || '');
    } else {
      // Find matched booking from calendarBookings
      const matched = calendarBookings.find(b => b.id === req.bookingId) || null;
      setReviewMatchedBooking(matched);
      
      if (matched) {
        setRevDate(matched.date);
        setRevStartTime(padTime(matched.startTime));
        setRevEndTime(padTime(matched.endTime));
        setRevRoom(matched.roomName);
        setRevBrand(matched.brandName);
        setRevCampaign(matched.campaignName);
        setRevSelectedMcIds(matched.mcId ? matched.mcId.split(',').map(x => x.trim()).filter(Boolean) : []);
        setRevBriefText(matched.briefText || '');
        setRevBriefLink(matched.briefLink || '');
        setRevRemark(matched.remark || '');
      }
    }
    setIsReviewModalOpen(true);
  };

  const handleOpenRejectModal = () => {
    setRejectReason(reviewHandlerNote || '');
    setIsRejectModalOpen(true);
  };

  const handleResolveRequest = async (decision: 'APPROVE' | 'REJECT', customNote?: string) => {
    if (!selectedReq) return;
    if (!hasPerm('change-requests-edit')) {
      showToast('คุณไม่มีสิทธิ์ในการอนุมัติหรือปฏิเสธคำขอนี้', 'error');
      return;
    }
    if (decision === 'APPROVE' && selectedReq.requestType !== 'cancel' && reviewSlotConflict) {
      showToast(`ไม่สามารถอนุมัติได้: ${reviewSlotConflict}`, 'error');
      return;
    }
    setRevSubmitting(true);
    
    let updatedBookingData: any = null;
    if (decision === 'APPROVE') {
      if (selectedReq.requestType === 'create_slot') {
        let draft: any = {};
        try {
          const parsed = JSON.parse(selectedReq.requestDetails);
          draft = parsed.bookingDraft || parsed;
        } catch (e) {}

        updatedBookingData = {
          ...draft,
          date: revDate,
          startTime: revStartTime,
          endTime: revEndTime,
          roomName: revRoom,
          brandName: revBrand,
          campaignName: revCampaign,
          briefText: revBriefText,
          briefLink: revBriefLink,
          remark: revRemark,
          mcId: revSelectedMcIds.join(','),
          status: 'Confirmed'
        };
      } else if (selectedReq.requestType === 'edit' && reviewMatchedBooking) {
        updatedBookingData = {
          ...reviewMatchedBooking,
          date: revDate,
          startTime: revStartTime,
          endTime: revEndTime,
          roomName: revRoom,
          brandName: revBrand,
          campaignName: revCampaign,
          briefText: revBriefText,
          briefLink: revBriefLink,
          remark: revRemark,
          mcId: revSelectedMcIds.join(',')
        };
      }
    }

    const finalNote = customNote !== undefined ? customNote : reviewHandlerNote;

    await apiCall('resolveChangeRequest', {
      requestId: selectedReq.id,
      decision,
      handlerNote: finalNote,
      updatedBookingData
    }, (err, res) => {
      setRevSubmitting(false);
      if (err) {
        showToast(err, 'error');
      } else {
        showToast(decision === 'APPROVE' ? 'อนุมัติและอัปเดตข้อมูลคิวจองเรียบร้อยแล้ว' : 'ปฏิเสธคำขอเรียบร้อยแล้ว', 'success');
        setIsReviewModalOpen(false);
        setIsRejectModalOpen(false);
        setRejectReason('');
        refreshActiveTabData();
      }
    });
  };

  // CRUD Handles - ROOMS
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingRoom ? !hasPerm('rooms-edit') : !hasPerm('rooms-create')) {
      return showToast(isEditingRoom
        ? "คุณไม่มีสิทธิ์แก้ไขห้องสตูดิโอ กรุณาขอสิทธิ์จาก Master Admin"
        : "คุณไม่มีสิทธิ์เพิ่มห้องสตูดิโอ กรุณาขอสิทธิ์จาก Master Admin", "error");
    }
    if (!roomName.trim()) return showToast("กรุณากรอกชื่อห้องสตูดิโอก่อน", "warning");

    setSubmitting(true);
    const subAction = isEditingRoom ? 'UPDATE' : 'CREATE';
    const payload = {
      subAction,
      payload: {
        oldName: roomOldName,
        name: roomName.trim(),
        description: roomDesc.trim(),
        status: roomStatus
      }
    };

    await apiCall('manageRooms', payload, (err) => {
      setSubmitting(false);
      if (err) {
        showToast(isEditingRoom
          ? `แก้ไขห้องสตูดิโอ "${roomName}" ไม่สำเร็จ: ${err}`
          : `เพิ่มห้องสตูดิโอ "${roomName}" ไม่สำเร็จ: ${err}`, "error");
      } else {
        showToast(isEditingRoom
          ? `แก้ไขห้องสตูดิโอ "${roomName}" เรียบร้อยแล้ว`
          : `เพิ่มห้องสตูดิโอ "${roomName}" เข้าระบบสำเร็จ`, "success");
        resetRoomForm();
        refreshActiveTabData();
      }
    });
  };

  const handleEditRoomSelect = (room: Room) => {
    setRoomOldName(room.name);
    setRoomName(room.name);
    setRoomDesc(room.description || '');
    setRoomStatus(room.status);
    setIsEditingRoom(true);
    setIsRoomModalOpen(true);
  };

  const handleDeleteRoom = async (room: Room) => {
    if (!hasPerm('rooms-delete')) return showToast("คุณไม่มีสิทธิ์ลบห้องสตูดิโอ กรุณาขอสิทธิ์จาก Master Admin", "error");
    // Check if the room has upcoming or active bookings
    const activeOrUpcoming = calendarBookings.some(b =>
      b.roomName === room.name &&
      getAutoStatus(b) === 'Confirmed'
    );

    if (activeOrUpcoming) {
      showToast(`ไม่สามารถลบ "${room.name}" ได้ — ยังมีคิวไลฟ์ที่ Confirmed อยู่ในระบบ กรุณายกเลิกคิวก่อน`, "error");
      return;
    }

    if (!window.confirm(`ปิดใช้งานห้อง "${room.name}" ใช่หรือไม่?\n\nระบบจะเปลี่ยนสถานะเป็น Inactive แทนการลบ เพื่อรักษาประวัติการจองในอดีตไว้`)) return;

    await apiCall('manageRooms', {
      subAction: 'UPDATE',
      payload: {
        oldName: room.name,
        name: room.name,
        description: room.description,
        status: 'Inactive'
      }
    }, (err) => {
      if (err) showToast(`ปิดใช้งานห้อง "${room.name}" ไม่สำเร็จ: ${err}`, "error");
      else {
        showToast(`ปิดใช้งานห้อง "${room.name}" แล้ว — ประวัติคิวเดิมยังคงอยู่`, "success");
        refreshActiveTabData();
      }
    });
  };

  // Helper to compute active/upcoming live queues and safety lock for a brand
  const getBrandLiveStats = (bName: string) => {
    const thDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const todayStr = thDate.getFullYear() + '-' + String(thDate.getMonth() + 1).padStart(2, '0') + '-' + String(thDate.getDate()).padStart(2, '0');
    const currentMin = thDate.getHours() * 60 + thDate.getMinutes();

    const brandBookings = calendarBookings.filter(b => b.brandName === bName && b.status !== 'Cancelled');
    
    const ongoing: Booking[] = [];
    const upcoming: Booking[] = [];

    brandBookings.forEach(b => {
      const startM = parseTimeToMinutes(b.startTime);
      const endM = parseTimeToMinutes(b.endTime);

      if (b.date === todayStr && currentMin >= startM && currentMin <= endM) {
        ongoing.push(b);
      } else if (b.date > todayStr || (b.date === todayStr && endM > currentMin)) {
        upcoming.push(b);
      }
    });

    const totalActiveUpcoming = ongoing.length + upcoming.length;
    const allBlocking = [...ongoing, ...upcoming];

    return {
      ongoingCount: ongoing.length,
      upcomingCount: upcoming.length,
      totalCount: totalActiveUpcoming,
      ongoing,
      upcoming,
      allBlocking
    };
  };

  // CRUD Handles - BRANDS
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingBrand ? !hasPerm('brands-edit') : !hasPerm('brands-create')) {
      return showToast(isEditingBrand
        ? "คุณไม่มีสิทธิ์แก้ไขแบรนด์ลูกค้า กรุณาขอสิทธิ์จาก Master Admin"
        : "คุณไม่มีสิทธิ์เพิ่มแบรนด์ลูกค้า กรุณาขอสิทธิ์จาก Master Admin", "error");
    }
    if (!brandName.trim()) return showToast("กรุณากรอกชื่อแบรนด์ก่อน", "warning");

    // Safety check if changing from Active to Inactive
    if (isEditingBrand && brandStatus === 'Inactive') {
      const stats = getBrandLiveStats(brandOldName || brandName);
      if (stats.totalCount > 0) {
        setBlockedBrandName(brandOldName || brandName);
        setBlockedBrandAction('inactive');
        setBlockedBrandBookings(stats.allBlocking);
        setIsBrandBlockModalOpen(true);
        return;
      }
    }

    setSubmitting(true);
    const subAction = isEditingBrand ? 'UPDATE' : 'CREATE';
    const payload = {
      subAction,
      payload: {
        oldName: brandOldName,
        name: brandName.trim(),
        description: brandAssignedUsers.length > 0 ? `emails:${brandAssignedUsers.join(',')}` : '',
        status: brandStatus
      }
    };

    await apiCall('manageBrands', payload, (err) => {
      setSubmitting(false);
      if (err) {
        showToast(isEditingBrand
          ? `แก้ไขแบรนด์ "${brandName}" ไม่สำเร็จ: ${err}`
          : `เพิ่มแบรนด์ "${brandName}" ไม่สำเร็จ: ${err}`, "error");
      } else {
        showToast(isEditingBrand
          ? `แก้ไขแบรนด์ "${brandName}" เรียบร้อยแล้ว`
          : `เพิ่มแบรนด์ "${brandName}" เข้าระบบสำเร็จ`, "success");
        resetBrandForm();
        refreshActiveTabData();
      }
    });
  };

  const handleToggleBrandStatus = async (brand: Brand) => {
    if (!hasPerm('brands-edit')) return showToast("คุณไม่มีสิทธิ์แก้ไขสถานะแบรนด์", "error");

    const newStatus: 'Active' | 'Inactive' = brand.status === 'Active' ? 'Inactive' : 'Active';

    if (newStatus === 'Inactive') {
      const stats = getBrandLiveStats(brand.name);
      if (stats.totalCount > 0) {
        setBlockedBrandName(brand.name);
        setBlockedBrandAction('inactive');
        setBlockedBrandBookings(stats.allBlocking);
        setIsBrandBlockModalOpen(true);
        return;
      }
    }

    setSubmitting(true);
    await apiCall('manageBrands', {
      subAction: 'UPDATE',
      payload: {
        oldName: brand.name,
        name: brand.name,
        description: brand.description || '',
        status: newStatus
      }
    }, (err) => {
      setSubmitting(false);
      if (err) {
        showToast(`เปลี่ยนสถานะแบรนด์ "${brand.name}" ไม่สำเร็จ: ${err}`, "error");
      } else {
        showToast(`เปลี่ยนสถานะแบรนด์ "${brand.name}" เป็น ${newStatus === 'Active' ? 'เปิดใช้งาน (Active)' : 'ระงับชั่วคราว (Inactive)'} สำเร็จ`, "success");
        refreshActiveTabData();
      }
    });
  };

  const handleEditBrandSelect = (brand: Brand) => {
    setBrandOldName(brand.name);
    setBrandName(brand.name);
    setBrandStatus(brand.status);
    
    // Parse assigned users from description (format emails:u1,u2,...)
    if (brand.description && brand.description.startsWith('emails:')) {
      const emailsList = brand.description.substring(7).split(',').filter(Boolean);
      setBrandAssignedUsers(emailsList);
    } else {
      setBrandAssignedUsers([]);
    }
    
    setIsEditingBrand(true);
    setIsBrandModalOpen(true);
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!hasPerm('brands-delete')) return showToast("คุณไม่มีสิทธิ์ลบแบรนด์ลูกค้า กรุณาขอสิทธิ์จาก Master Admin", "error");

    // Safety check before delete
    const stats = getBrandLiveStats(brand.name);
    if (stats.totalCount > 0) {
      setBlockedBrandName(brand.name);
      setBlockedBrandAction('delete');
      setBlockedBrandBookings(stats.allBlocking);
      setIsBrandBlockModalOpen(true);
      return;
    }

    if (!window.confirm(`คุณแน่ใจว่าต้องการลบแบรนด์ "${brand.name}" ออกจากระบบใช่หรือไม่?`)) return;

    setSubmitting(true);
    await apiCall('manageBrands', {
      subAction: 'DELETE',
      payload: {
        name: brand.name
      }
    }, (err) => {
      setSubmitting(false);
      if (err) {
        showToast(`ลบแบรนด์ "${brand.name}" ไม่สำเร็จ: ${err}`, "error");
      } else {
        showToast(`ลบแบรนด์ "${brand.name}" ออกจากระบบเรียบร้อยแล้ว`, "success");
        setSelectedBrandNames(prev => prev.filter(n => n !== brand.name));
        refreshActiveTabData();
      }
    });
  };

  // Quick Caregiver Modal Handlers
  const handleOpenQuickCaregiver = (brand: Brand) => {
    setQuickCaregiverBrand(brand);
    if (brand.description && brand.description.startsWith('emails:')) {
      const emailsList = brand.description.substring(7).split(',').filter(Boolean);
      setQuickCaregiverUsers(emailsList);
    } else {
      setQuickCaregiverUsers([]);
    }
    setIsQuickCaregiverModalOpen(true);
  };

  const handleSaveQuickCaregiver = async () => {
    if (!quickCaregiverBrand) return;
    if (!hasPerm('brands-edit')) return showToast("คุณไม่มีสิทธิ์แก้ไขผู้ดูแลแบรนด์", "error");

    setSubmitting(true);
    await apiCall('manageBrands', {
      subAction: 'UPDATE',
      payload: {
        oldName: quickCaregiverBrand.name,
        name: quickCaregiverBrand.name,
        description: quickCaregiverUsers.length > 0 ? `emails:${quickCaregiverUsers.join(',')}` : '',
        status: quickCaregiverBrand.status
      }
    }, (err) => {
      setSubmitting(false);
      if (err) {
        showToast(`บันทึกผู้ดูแลแบรนด์ไม่สำเร็จ: ${err}`, "error");
      } else {
        showToast(`อัปเดตผู้ดูแลแบรนด์ "${quickCaregiverBrand.name}" สำเร็จ`, "success");
        setIsQuickCaregiverModalOpen(false);
        setQuickCaregiverBrand(null);
        refreshActiveTabData();
      }
    });
  };

  // Bulk Brand Actions Handlers
  const handleBulkActivateBrands = async () => {
    if (selectedBrandNames.length === 0) return;
    if (!hasPerm('brands-edit')) return showToast("คุณไม่มีสิทธิ์แก้ไขแบรนด์", "error");

    setSubmitting(true);
    let successCount = 0;
    for (const bName of selectedBrandNames) {
      const bObj = allBrandsAdmin.find(b => b.name === bName);
      if (!bObj || bObj.status === 'Active') continue;
      await new Promise<void>((resolve) => {
        apiCall('manageBrands', {
          subAction: 'UPDATE',
          payload: { oldName: bObj.name, name: bObj.name, description: bObj.description || '', status: 'Active' }
        }, (err) => {
          if (!err) successCount++;
          resolve();
        });
      });
    }
    setSubmitting(false);
    showToast(`เปิดใช้งานแบรนด์ (Active) สำเร็จ ${successCount} รายการ`, "success");
    setSelectedBrandNames([]);
    refreshActiveTabData();
  };

  const handleBulkInactivateBrands = async () => {
    if (selectedBrandNames.length === 0) return;
    if (!hasPerm('brands-edit')) return showToast("คุณไม่มีสิทธิ์แก้ไขแบรนด์", "error");

    const blocked: { name: string; bookings: Booking[] }[] = [];
    const eligible: Brand[] = [];

    selectedBrandNames.forEach(bName => {
      const bObj = allBrandsAdmin.find(b => b.name === bName);
      if (!bObj) return;
      const stats = getBrandLiveStats(bName);
      if (stats.totalCount > 0) {
        blocked.push({ name: bName, bookings: stats.allBlocking });
      } else {
        eligible.push(bObj);
      }
    });

    if (blocked.length > 0) {
      setBlockedBrandName(blocked.map(b => b.name).join(', '));
      setBlockedBrandAction('inactive');
      setBlockedBrandBookings(blocked.flatMap(b => b.bookings));
      setIsBrandBlockModalOpen(true);
      if (eligible.length === 0) return;
    }

    if (eligible.length > 0) {
      if (!window.confirm(`พบแบรนด์ที่ไม่มีคิวไลฟ์ค้าง ${eligible.length} แบรนด์ ต้องการเปลี่ยนเป็น Inactive ใช่หรือไม่?`)) return;

      setSubmitting(true);
      for (const bObj of eligible) {
        await new Promise<void>((resolve) => {
          apiCall('manageBrands', {
            subAction: 'UPDATE',
            payload: { oldName: bObj.name, name: bObj.name, description: bObj.description || '', status: 'Inactive' }
          }, () => resolve());
        });
      }
      setSubmitting(false);
      showToast(`เปลี่ยนสถานะแบรนด์เป็น Inactive สำเร็จ ${eligible.length} รายการ`, "success");
      setSelectedBrandNames([]);
      refreshActiveTabData();
    }
  };

  const handleBulkDeleteBrands = async () => {
    if (selectedBrandNames.length === 0) return;
    if (!hasPerm('brands-delete')) return showToast("คุณไม่มีสิทธิ์ลบแบรนด์", "error");

    const blocked: { name: string; bookings: Booking[] }[] = [];
    const eligible: Brand[] = [];

    selectedBrandNames.forEach(bName => {
      const bObj = allBrandsAdmin.find(b => b.name === bName);
      if (!bObj) return;
      const stats = getBrandLiveStats(bName);
      if (stats.totalCount > 0) {
        blocked.push({ name: bName, bookings: stats.allBlocking });
      } else {
        eligible.push(bObj);
      }
    });

    if (blocked.length > 0) {
      setBlockedBrandName(blocked.map(b => b.name).join(', '));
      setBlockedBrandAction('delete');
      setBlockedBrandBookings(blocked.flatMap(b => b.bookings));
      setIsBrandBlockModalOpen(true);
      if (eligible.length === 0) return;
    }

    if (eligible.length > 0) {
      if (!window.confirm(`คุณแน่ใจว่าต้องการลบแบรนด์ที่ไม่มีคิวไลฟ์ค้าง ${eligible.length} รายการ ใช่หรือไม่?`)) return;

      setSubmitting(true);
      for (const bObj of eligible) {
        await new Promise<void>((resolve) => {
          apiCall('manageBrands', {
            subAction: 'DELETE',
            payload: { name: bObj.name }
          }, () => resolve());
        });
      }
      setSubmitting(false);
      showToast(`ลบแบรนด์ออกจากระบบสำเร็จ ${eligible.length} รายการ`, "success");
      setSelectedBrandNames([]);
      refreshActiveTabData();
    }
  };

  // CRUD Handles - MC LIVE MANAGEMENT
  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierName.trim()) return showToast("กรุณากรอกชื่อ Tier", "warning");

    const sortOrderNum = parseInt(String(tierSortOrder).trim(), 10);
    if (isNaN(sortOrderNum) || sortOrderNum < 0) {
      return showToast("กรุณาระบุลำดับความสำคัญเป็นตัวเลขตั้งแต่ 0 ขึ้นไป (0 คือสำคัญที่สุด)", "warning");
    }

    // Check duplicate sort order
    const duplicateTier = mcTiers.find(t => t.id !== editingTier?.id && t.sortOrder === sortOrderNum);
    if (duplicateTier) {
      return showToast(`ลำดับความสำคัญ "${sortOrderNum}" มีอยู่ในระบบแล้ว (Tier "${duplicateTier.name}") กรุณาระบุลำดับที่ไม่ซ้ำกัน (เช่น 0, 1, 2, 3...)`, "warning");
    }

    setSubmitting(true);
    const subAction = editingTier ? 'UPDATE' : 'CREATE';
    const payload = editingTier 
      ? { id: editingTier.id, name: tierName.trim(), sortOrder: sortOrderNum }
      : { name: tierName.trim(), sortOrder: sortOrderNum };

    await apiCall('manageMcTiers', { subAction, payload }, (err) => {
      setSubmitting(false);
      if (err) {
        showToast(err, "error");
      } else {
        showToast(`${editingTier ? 'แก้ไข' : 'เพิ่ม'} Tier สำเร็จ`, "success");
        setTierName('');
        setTierSortOrder('');
        setEditingTier(null);
        setIsTierModalOpen(false);
        refreshActiveTabData();
      }
    });
  };

  const handleDeleteTier = async (tier: any) => {
    if (!window.confirm(`คุณแน่ใจว่าต้องการลบ Tier "${tier.name}" ใช่หรือไม่?`)) return;

    await apiCall('manageMcTiers', { subAction: 'DELETE', payload: { id: tier.id } }, (err) => {
      if (err) {
        showToast(err, "error");
      } else {
        showToast("ลบ Tier สำเร็จ", "success");
        refreshActiveTabData();
      }
    });
  };

  const handleMoveTier = async (tierId: string, direction: 'up' | 'down') => {
    const currentIndex = mcTiers.findIndex(t => t.id === tierId);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === mcTiers.length - 1) return;

    const newTiers = [...mcTiers];
    const swapWithIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    const temp = newTiers[currentIndex];
    newTiers[currentIndex] = newTiers[swapWithIndex];
    newTiers[swapWithIndex] = temp;

    const payloadTiers = newTiers.map((t, idx) => ({
      id: t.id,
      sortOrder: idx + 1
    }));

    await apiCall('manageMcTiers', { subAction: 'UPDATE_ORDER', payload: { tiers: payloadTiers } }, (err) => {
      if (err) {
        showToast(err, "error");
      } else {
        refreshActiveTabData();
      }
    });
  };

  const handleSaveMc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcName.trim()) return showToast("กรุณากรอกชื่อ MC", "warning");
    if (!mcTierId) return showToast("กรุณาเลือก Tier", "warning");

    setSubmitting(true);
    const subAction = editingMc ? 'UPDATE' : 'CREATE';
    const payload = editingMc 
      ? { id: editingMc.id, name: mcName.trim(), tierId: mcTierId, status: mcStatus }
      : { name: mcName.trim(), tierId: mcTierId, status: mcStatus };

    await apiCall('manageMcList', { subAction, payload }, (err) => {
      setSubmitting(false);
      if (err) {
        showToast(err, "error");
      } else {
        showToast(`${editingMc ? 'แก้ไข' : 'เพิ่ม'} MC สำเร็จ`, "success");
        setMcName('');
        setMcTierId('');
        setMcStatus('Active');
        setEditingMc(null);
        setIsMcModalOpen(false);
        refreshActiveTabData();
      }
    });
  };

  const handleDeleteMc = async (mc: any) => {
    if (!window.confirm(`คุณแน่ใจว่าต้องการลบ MC "${mc.name}" ใช่หรือไม่?`)) return;

    await apiCall('manageMcList', { subAction: 'DELETE', payload: { id: mc.id, name: mc.name } }, (err, data) => {
      if (err) {
        showToast(err, "error");
      } else if (data && data.success === false && data.bookings) {
        setBlockedMcName(mc.name);
        setBlockedBookings(data.bookings);
        setIsBlockModalOpen(true);
      } else {
        showToast("ลบ MC สำเร็จ", "success");
        refreshActiveTabData();
      }
    });
  };

  // CRUD Handles - USERS
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingUser ? !hasPerm('users-edit') : !hasPerm('users-create')) {
      return showToast(isEditingUser
        ? "คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้งาน กรุณาขอสิทธิ์จาก Master Admin"
        : "คุณไม่มีสิทธิ์เพิ่มผู้ใช้งาน กรุณาขอสิทธิ์จาก Master Admin", "error");
    }
    if (!userEmail.trim()) return showToast("กรุณากรอกอีเมล / บัญชีผู้ใช้ก่อน", "warning");
    if (!userName.trim()) return showToast("กรุณากรอกชื่อ-นามสกุลผู้ใช้งาน", "warning");
    if (!isEditingUser && !userPassword) return showToast("กรุณากำหนดรหัสผ่านสำหรับบัญชีใหม่", "warning");

    setSubmitting(true);
    const subAction = isEditingUser ? 'UPDATE' : 'CREATE';
    const payload = {
      subAction,
      payload: {
        email: userEmail.trim().toLowerCase(),
        name: userName.trim(),
        role: userRole,
        status: userStatus,
        password: userPassword
      }
    };

    await apiCall('manageUsers', payload, (err) => {
      setSubmitting(false);
      if (err) {
        showToast(isEditingUser
          ? `แก้ไขผู้ใช้ "${userEmail}" ไม่สำเร็จ: ${err}`
          : `เพิ่มผู้ใช้ "${userEmail}" ไม่สำเร็จ: ${err}`, "error");
      } else {
        showToast(isEditingUser
          ? `แก้ไขข้อมูลผู้ใช้ "${userEmail}" เรียบร้อยแล้ว`
          : `เพิ่มผู้ใช้ "${userEmail}" เข้าระบบสำเร็จ`, "success");
        resetUserForm();
        refreshActiveTabData();
      }
    });
  };

  const handleEditUserSelect = (user: User) => {
    setUserEmail(user.email);
    setUserName(user.name);
    setUserRole(user.role);
    setUserStatus(user.status);
    setUserPassword(user.password || '');
    setIsEditingUser(true);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (!hasPerm('users-delete')) return showToast("คุณไม่มีสิทธิ์ลบผู้ใช้งาน กรุณาขอสิทธิ์จาก Master Admin", "error");
    if (user.email === currentUser?.email) return showToast("ไม่สามารถลบบัญชีของตนเองขณะล็อคอินอยู่ได้", "warning");
    if (!window.confirm(`ลบผู้ใช้ "${user.name}" (${user.email}) ออกจากระบบถาวรใช่หรือไม่?\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return;

    await apiCall('manageUsers', { subAction: 'DELETE', payload: { email: user.email } }, (err) => {
      if (err) showToast(`ลบผู้ใช้ "${user.email}" ไม่สำเร็จ: ${err}`, "error");
      else {
        showToast(`ลบผู้ใช้ "${user.name}" ออกจากระบบแล้ว`, "success");
        refreshActiveTabData();
      }
    });
  };

  // CRUD Handles - ROLES
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingRole ? !hasPerm('roles-edit') : !hasPerm('roles-create')) {
      return showToast(isEditingRole
        ? "คุณไม่มีสิทธิ์แก้ไขระดับสิทธิ์ กรุณาขอสิทธิ์จาก Master Admin"
        : "คุณไม่มีสิทธิ์สร้างระดับสิทธิ์ใหม่ กรุณาขอสิทธิ์จาก Master Admin", "error");
    }
    if (!roleName.trim()) return showToast("กรุณากรอกชื่อระดับสิทธิ์ก่อน", "warning");

    setSubmitting(true);
    const subAction = isEditingRole ? 'UPDATE' : 'CREATE';
    const payload = {
      subAction,
      payload: {
        roleName: roleName.trim(),
        description: roleDesc.trim(),
        allowedTabs: roleAllowedTabs.join(','),
        canCreateBooking,
        canEditBooking,
        canCancelBooking,
        isAdmin
      }
    };

    await apiCall('manageRoles', payload, (err) => {
      setSubmitting(false);
      if (err) {
        showToast(isEditingRole
          ? `แก้ไขระดับสิทธิ์ "${roleName}" ไม่สำเร็จ: ${err}`
          : `สร้างระดับสิทธิ์ "${roleName}" ไม่สำเร็จ: ${err}`, "error");
      } else {
        showToast(isEditingRole
          ? `อัพเดทระดับสิทธิ์ "${roleName}" เรียบร้อยแล้ว`
          : `สร้างระดับสิทธิ์ "${roleName}" สำเร็จ`, "success");
        resetRoleForm();
        refreshActiveTabData();
      }
    });
  };

  const handleEditRoleSelect = (role: Role) => {
    setRoleName(role.roleName);
    setRoleDesc(role.description);
    setRoleAllowedTabs(role.allowedTabs.split(','));
    setCanCreateBooking(role.canCreateBooking);
    setCanEditBooking(role.canEditBooking);
    setCanCancelBooking(role.canCancelBooking);
    setIsAdmin(role.isAdmin);
    setIsEditingRole(true);
    setIsRoleModalOpen(true);
  };

  const handleDeleteRole = async (role: Role) => {
    if (!hasPerm('roles-delete')) return showToast("คุณไม่มีสิทธิ์ลบระดับสิทธิ์ กรุณาขอสิทธิ์จาก Master Admin", "error");
    if (role.roleName === 'Master Admin') return showToast("ไม่สามารถลบ Master Admin ได้ — สิทธิ์นี้ถูกป้องกันโดยระบบ", "error");
    if (!window.confirm(`ลบระดับสิทธิ์ "${role.roleName}" ใช่หรือไม่?\n\nผู้ใช้งานที่มีสิทธิ์นี้จะถูกเปลี่ยนเป็นสิทธิ์ Default ทันที`)) return;

    await apiCall('manageRoles', { subAction: 'DELETE', payload: { roleName: role.roleName } }, (err) => {
      if (err) showToast(`ลบระดับสิทธิ์ "${role.roleName}" ไม่สำเร็จ: ${err}`, "error");
      else {
        showToast(`ลบระดับสิทธิ์ "${role.roleName}" ออกจากระบบแล้ว`, "success");
        refreshActiveTabData();
      }
    });
  };

  // CRUD Handles - SYSTEM SETTINGS
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const payload = {
      settings: {
        lineNotificationsEnabled: settingsLineEnabled,
        lineChannelAccessToken: settingsLineToken,
        lineDestinationId: settingsLineDestId,
        frontendUrl: settingsUrl,
        liveChannels: settingsLiveChannels,
        changeRequestLockDays: settingsChangeRequestLockDays
      }
    };

    await apiCall('saveSystemSettings', payload, (err) => {
      setSubmitting(false);
      if (err) showToast(err, "error");
      else {
        showToast("บันทึกการตั้งค่าระบบเรียบร้อยแล้ว", "success");
        refreshActiveTabData();
      }
    });
  };

  // Search queries for admin tables
  const filteredRooms = useMemo(() => {
    return allRoomsAdmin.filter(r => 
      r.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      String(r.description || '').toLowerCase().includes(adminSearchQuery.toLowerCase())
    );
  }, [allRoomsAdmin, adminSearchQuery]);

  const filteredBrands = useMemo(() => {
    return allBrandsAdmin.filter(b => {
      // 1. Text search
      const query = adminSearchQuery.toLowerCase().trim();
      if (query && !b.name.toLowerCase().includes(query)) {
        return false;
      }

      // 2. Status filter
      if (brandStatusFilter !== 'all' && b.status !== brandStatusFilter) {
        return false;
      }

      // 3. Caregiver multi-select filter
      if (brandCaregiverFilter.length > 0) {
        const assignedList = b.description && b.description.startsWith('emails:')
          ? b.description.substring(7).split(',').filter(Boolean).map(x => x.toLowerCase().trim())
          : [];
        
        const matchUnassigned = brandCaregiverFilter.includes('__unassigned__') && assignedList.length === 0;
        const matchCaregiver = brandCaregiverFilter.some(filterEmail => assignedList.includes(filterEmail.toLowerCase().trim()));

        if (!matchUnassigned && !matchCaregiver) return false;
      }

      return true;
    });
  }, [allBrandsAdmin, adminSearchQuery, brandStatusFilter, brandCaregiverFilter]);

  const filteredUsers = useMemo(() => {
    return allUsersAdmin.filter(u => 
      u.email.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(adminSearchQuery.toLowerCase())
    );
  }, [allUsersAdmin, adminSearchQuery]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(l => 
      l.userEmail.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      l.userName.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      String(l.target || '').toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      String(l.details || '').toLowerCase().includes(adminSearchQuery.toLowerCase())
    );
  }, [auditLogs, adminSearchQuery]);

  // Tab Item list helper
  const tabsList = [
    { id: 'rooms', name: 'ห้องสตูดิโอ', icon: Database },
    { id: 'brands', name: 'แบรนด์ลูกค้า', icon: Tag },
    { id: 'mc-live', name: 'จัดการ MC ไลฟ์สด', icon: UserPlus },
    { id: 'change-requests', name: 'คำขอแก้ไขคิวไลฟ์', icon: FileEdit },
    { id: 'users', name: 'ผู้ใช้งานระบบ', icon: UserPlus },
    { id: 'roles', name: 'ระดับสิทธิ์การจอง', icon: Layers },
    { id: 'logs', name: 'ประวัติกิจกรรม (Audit)', icon: Clock },
    { id: 'settings', name: 'ตั้งค่าระบบและการแจ้งเตือน', icon: Bell }
  ];

  const handleTabToggle = (tabId: SubTab) => {
    setAdminSearchQuery(''); // reset search
    const mappedTab = 
      tabId === 'roles' ? 'roles-mgmt' : 
      tabId === 'logs' ? 'audit-log' : 
      tabId;
    setCurrentTab(mappedTab);
  };

  const handleCheckboxTabToggle = (tab: string) => {
    setRoleAllowedTabs(prev => {
      return prev.includes(tab) 
        ? prev.filter(t => t !== tab)
        : [...prev, tab];
    });
  };

  return (
    <div className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
          {currentTab === 'change-requests' ? (
            <>
              <FileEdit className="w-5 h-5 text-indigo-500" />
              จัดการคำขอแก้ไขและยกเลิกคิวไลฟ์
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 text-brand-500" />
              ระบบจัดการและตั้งค่า
            </>
          )}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {currentTab === 'change-requests'
            ? 'ตรวจสอบ พิจารณาอนุมัติ และอัปเดตข้อมูลคิวไลฟ์ตามคำร้องขอของผู้จอง'
            : 'ตั้งค่าสตูดิโอ แบรนด์ผู้ใช้ สิทธิ์เข้าถึง ตรวจสอบประวัติกิจกรรม และเชื่อมการแจ้งเตือน'}
        </p>
      </div>

      {/* Settings workspace area (Full Width) */}
      <div className="w-full space-y-6">
          
          {/* ROOMS SUBTAB */}
          {activeSubTab === 'rooms' && (() => {
            const canCreate = hasPerm('rooms-create');
            const canEdit = hasPerm('rooms-edit');
            const canDelete = hasPerm('rooms-delete');
            return (
              <div className="w-full flex flex-col gap-6">
                {/* Full-width Table List card */}
                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                        <Database className="w-4.5 h-4.5 text-brand-500" />
                        รายชื่อห้องสตูดิโอทั้งหมด
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">จัดการห้องสตูดิโอไลฟ์สด เพิ่มห้องใหม่ หรือแก้ไขรายละเอียดห้อง</p>
                    </div>
                    
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                      <div className="relative w-48 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="search"
                          placeholder="ค้นหาห้อง..."
                          value={adminSearchQuery}
                          onChange={(e) => setAdminSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                        />
                      </div>

                      {canCreate && (
                        <button
                          onClick={() => {
                            resetRoomForm();
                            setIsEditingRoom(false);
                            setIsRoomModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>เพิ่มห้องสตูดิโอใหม่</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider select-none">
                          <th className="px-4 py-3.5">ชื่อสตูดิโอ</th>
                          <th className="px-4 py-3.5">คำอธิบายรายละเอียด</th>
                          <th className="px-4 py-3.5">สถานะ</th>
                          {(canEdit || canDelete) && <th className="px-4 py-3.5 text-center">จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal">
                        {filteredRooms.map(room => (
                          <tr key={room.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors">
                            <td className="px-4 py-3.5 font-normal text-slate-900 dark:text-white">{room.name}</td>
                            <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={room.description}>
                              {room.description || '-'}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                room.status === 'Active' 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' 
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${room.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {room.status === 'Active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            {(canEdit || canDelete) && (
                              <td className="px-4 py-3.5 flex items-center justify-center gap-1">
                                {canEdit && (
                                  <button
                                    onClick={() => handleEditRoomSelect(room)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-all cursor-pointer"
                                    title="แก้ไขห้อง"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteRoom(room)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                    title="ลบห้อง"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                        {filteredRooms.length === 0 && (
                          <tr>
                            <td colSpan={(canEdit || canDelete) ? 4 : 3} className="p-8 text-center text-slate-400 italic">ไม่มีข้อมูลห้องตรงตามเงื่อนไข</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MODAL: ROOM CREATE / EDIT */}
                {isRoomModalOpen && (
                  <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50 select-none">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 flex items-center justify-center shadow-xs">
                            <Database className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-950 dark:text-white text-sm">
                              {isEditingRoom ? `แก้ไขห้องสตูดิโอ: ${roomOldName}` : 'เพิ่มห้องสตูดิโอใหม่'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {isEditingRoom ? 'ปรับปรุงรายละเอียดและสถานะของห้องไลฟ์' : 'กำหนดชื่อห้อง คำอธิบาย และสถานะเปิดใช้งาน'}
                            </p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => {
                            setIsRoomModalOpen(false);
                            resetRoomForm();
                          }}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="ปิดหน้าต่าง"
                        >
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveRoom} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ชื่อห้องสตูดิโอ (Studio Name)</label>
                          <input
                            type="text"
                            placeholder="เช่น Room 01"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                            required
                            autoFocus
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">คำอธิบายเพิ่มเติม (Description)</label>
                          <textarea
                            placeholder="เช่น รายละเอียดสเปค ขนาดห้อง หรือกล้องที่ใช้"
                            value={roomDesc}
                            onChange={(e) => setRoomDesc(e.target.value)}
                            rows={3}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">สถานะการใช้งาน (Status)</label>
                          <select
                            value={roomStatus}
                            onChange={(e) => setRoomStatus(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                          >
                            <option value="Active">เปิดใช้งาน (Active)</option>
                            <option value="Inactive">ปิดชั่วคราว (Inactive)</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              setIsRoomModalOpen(false);
                              resetRoomForm();
                            }}
                            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="py-2.5 px-5 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-[0.99] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* BRANDS SUBTAB */}
          {/* BRANDS SUBTAB */}
          {activeSubTab === 'brands' && (() => {
            const canCreate = hasPerm('brands-create');
            const canEdit = hasPerm('brands-edit');
            const canDelete = hasPerm('brands-delete');

            const isAllFilteredSelected = filteredBrands.length > 0 && filteredBrands.every(b => selectedBrandNames.includes(b.name));
            const isSomeFilteredSelected = filteredBrands.some(b => selectedBrandNames.includes(b.name)) && !isAllFilteredSelected;

            const toggleSelectAll = () => {
              if (isAllFilteredSelected) {
                const filteredNames = new Set(filteredBrands.map(b => b.name));
                setSelectedBrandNames(prev => prev.filter(name => !filteredNames.has(name)));
              } else {
                const namesToAdd = filteredBrands.map(b => b.name);
                setSelectedBrandNames(prev => Array.from(new Set([...prev, ...namesToAdd])));
              }
            };

            const toggleSelectRow = (name: string) => {
              if (selectedBrandNames.includes(name)) {
                setSelectedBrandNames(prev => prev.filter(n => n !== name));
              } else {
                setSelectedBrandNames(prev => [...prev, name]);
              }
            };

            const isFiltered = brandStatusFilter !== 'all' || brandCaregiverFilter.length > 0;

            const handleClearBrandFilters = () => {
              setBrandStatusFilter('all');
              setBrandCaregiverFilter([]);
              setAdminSearchQuery('');
            };

            return (
              <div className="w-full flex flex-col gap-5">
                {/* Full-width Table List card */}
                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                  {/* Header & Controls */}
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-xs border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                        <Tag className="w-5 h-5 text-brand-500" />
                        รายชื่อแบรนด์ลูกค้าทั้งหมด
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">จัดการแบรนด์สินค้า กำหนดผู้ดูแลแบรนด์ ตรวจสอบสถานะไลฟ์ และควบคุมสถานะเปิดรับจอง</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
                      {/* Search box */}
                      <div className="relative w-full sm:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none z-10" />
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อแบรนด์..."
                          value={adminSearchQuery}
                          onChange={(e) => setAdminSearchQuery(e.target.value)}
                          style={{ paddingLeft: '2.25rem' }}
                          className="w-full dropdown-search-input pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      {/* Status Filter */}
                      <div className="relative w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setIsBrandStatusFilterOpen(!isBrandStatusFilterOpen);
                            setIsCaregiverFilterOpen(false);
                          }}
                          className={`w-full sm:w-auto text-xs font-semibold border ${
                            brandStatusFilter !== 'all' ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-slate-200 dark:border-slate-800'
                          } bg-white dark:bg-slate-950 px-3 py-2 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer text-left`}
                        >
                          <span className="truncate text-slate-900 dark:text-white">
                            {brandStatusFilter === 'all'
                              ? 'สถานะทั้งหมด'
                              : brandStatusFilter === 'Active'
                              ? 'เปิดจอง (Active)'
                              : 'ระงับชั่วคราว (Inactive)'}
                          </span>
                          {isBrandStatusFilterOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        </button>

                        {isBrandStatusFilterOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsBrandStatusFilterOpen(false)} />
                            <div className="absolute top-full left-0 mt-1.5 w-48 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col p-1 z-30">
                              {[
                                { value: 'all', label: 'สถานะทั้งหมด (All)' },
                                { value: 'Active', label: 'เปิดจอง (Active)' },
                                { value: 'Inactive', label: 'ระงับชั่วคราว (Inactive)' }
                              ].map(opt => {
                                const isSelected = brandStatusFilter === opt.value;
                                return (
                                  <div
                                    key={opt.value}
                                    onClick={() => {
                                      setBrandStatusFilter(opt.value as any);
                                      setIsBrandStatusFilterOpen(false);
                                    }}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                                      isSelected
                                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                  >
                                    <span>{opt.label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Caregiver Multi-select Filter Dropdown */}
                      <div className="relative w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setIsCaregiverFilterOpen(!isCaregiverFilterOpen)}
                          className={`w-full sm:w-auto text-xs font-semibold border ${
                            brandCaregiverFilter.length > 0 ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-slate-200 dark:border-slate-800'
                          } bg-white dark:bg-slate-950 px-3 py-2 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer text-left`}
                        >
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">
                            {brandCaregiverFilter.length === 0
                              ? 'ผู้ดูแลทั้งหมด (All)'
                              : brandCaregiverFilter.length === 1
                              ? (brandCaregiverFilter[0] === '__unassigned__' ? 'ทุกคนเข้าถึงได้' : allUsersAdmin.find(u => u.email.toLowerCase() === brandCaregiverFilter[0]?.toLowerCase())?.name || '1 ท่าน')
                              : `ผู้ดูแล (${brandCaregiverFilter.length} ท่าน)`}
                          </span>
                          {isCaregiverFilterOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        </button>

                        {isCaregiverFilterOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsCaregiverFilterOpen(false)} />
                            <div className="absolute top-full left-0 sm:right-0 sm:left-auto mt-1.5 w-72 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col z-30" style={{ maxHeight: '280px' }}>
                              <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  <input
                                    type="text"
                                    placeholder="ค้นหาผู้ดูแล..."
                                    value={caregiverFilterSearch}
                                    onChange={(e) => setCaregiverFilterSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                                  />
                                </div>
                              </div>

                              <div className="p-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                <div
                                  onClick={() => {
                                    const allItems = ['__unassigned__', ...allUsersAdmin.map(u => u.email.toLowerCase())];
                                    const isAll = brandCaregiverFilter.length === allItems.length && allItems.length > 0;
                                    if (isAll) {
                                      setBrandCaregiverFilter([]);
                                    } else {
                                      setBrandCaregiverFilter(allItems);
                                    }
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                    brandCaregiverFilter.length === (allUsersAdmin.length + 1) && allUsersAdmin.length > 0
                                      ? 'bg-brand-500 border-brand-500'
                                      : 'border-slate-300 dark:border-slate-600'
                                  }`}>
                                    {brandCaregiverFilter.length === (allUsersAdmin.length + 1) && allUsersAdmin.length > 0 && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                                </div>
                              </div>

                              <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                                {/* Option for unassigned brands */}
                                <div
                                  onClick={() => {
                                    if (brandCaregiverFilter.includes('__unassigned__')) {
                                      setBrandCaregiverFilter(brandCaregiverFilter.filter(x => x !== '__unassigned__'));
                                    } else {
                                      setBrandCaregiverFilter([...brandCaregiverFilter, '__unassigned__']);
                                    }
                                  }}
                                  className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                      brandCaregiverFilter.includes('__unassigned__') ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'
                                    }`}>
                                      {brandCaregiverFilter.includes('__unassigned__') && (
                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className="text-xs text-slate-700 dark:text-slate-300 select-none truncate italic">ทุกคนเข้าถึงได้ (ไม่มีผู้ดูแลเฉพาะ)</span>
                                  </div>
                                </div>

                                {allUsersAdmin
                                  .filter(u => 
                                    (u.name || '').toLowerCase().includes(caregiverFilterSearch.toLowerCase().trim()) || 
                                    (u.email || '').toLowerCase().includes(caregiverFilterSearch.toLowerCase().trim())
                                  )
                                  .map(u => {
                                    const em = u.email.toLowerCase();
                                    const isChecked = brandCaregiverFilter.includes(em);
                                    return (
                                      <div
                                        key={u.email}
                                        onClick={() => {
                                          if (isChecked) {
                                            setBrandCaregiverFilter(brandCaregiverFilter.filter(x => x !== em));
                                          } else {
                                            setBrandCaregiverFilter([...brandCaregiverFilter, em]);
                                          }
                                        }}
                                        className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                            isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'
                                          }`}>
                                            {isChecked && (
                                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                            <span className="text-xs text-slate-700 dark:text-slate-300 select-none truncate font-medium">{u.name}</span>
                                            <span className="text-[10px] text-slate-400 font-normal select-none truncate">{u.email}</span>
                                          </div>
                                        </div>
                                        {u.role && (
                                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 ml-1">
                                            {u.role}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {canCreate && (
                        <button
                          onClick={() => {
                            resetBrandForm();
                            setIsEditingBrand(false);
                            setIsBrandModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>เพิ่มแบรนด์ลูกค้าใหม่</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Filters Tag Bar */}
                  {isFiltered && (
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                      <span className="text-[10px] font-black text-slate-400 mr-1 flex items-center gap-1">
                        <Filter className="w-3 h-3 text-brand-500" />
                        ตัวกรองที่ทำงาน:
                      </span>
                      {brandStatusFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700">
                          สถานะ: {brandStatusFilter === 'Active' ? 'เปิดจอง' : 'ระงับชั่วคราว'}
                          <button
                            type="button"
                            onClick={() => setBrandStatusFilter('all')}
                            className="hover:text-rose-500 cursor-pointer ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {brandCaregiverFilter.map(em => {
                        const label = em === '__unassigned__' ? 'ทุกคนเข้าถึงได้' : allUsersAdmin.find(u => u.email.toLowerCase() === em)?.name || em;
                        return (
                          <span
                            key={em}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 rounded-lg border border-brand-200 dark:border-brand-800/60"
                          >
                            ผู้ดูแล: {label}
                            <button
                              type="button"
                              onClick={() => setBrandCaregiverFilter(brandCaregiverFilter.filter(x => x !== em))}
                              className="hover:text-rose-500 cursor-pointer ml-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                      <button
                        type="button"
                        onClick={handleClearBrandFilters}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer ml-auto flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        ล้างตัวกรองทั้งหมด
                      </button>
                    </div>
                  )}

                  {/* Bulk Action Toolbar */}
                  {selectedBrandNames.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900 text-white dark:bg-slate-800 p-3 rounded-2xl shadow-md animate-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center gap-2 pl-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold">
                          เลือกแล้ว <strong className="text-emerald-400 font-extrabold">{selectedBrandNames.length}</strong> แบรนด์
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={handleBulkActivateBrands}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              เปิดใช้งาน (Active)
                            </button>

                            <button
                              type="button"
                              onClick={handleBulkInactivateBrands}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              ระงับชั่วคราว (Inactive)
                            </button>
                          </>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={handleBulkDeleteBrands}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            ลบที่เลือก
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedBrandNames([])}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Brands Table */}
                  <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider select-none">
                          <th className="px-3 py-3.5 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={isAllFilteredSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = isSomeFilteredSelected;
                              }}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 rounded text-brand-600 accent-brand-600 cursor-pointer"
                              title="เลือกทั้งหมด / ไม่เลือกทั้งหมด"
                            />
                          </th>
                          <th className="px-4 py-3.5 min-w-[160px]">ชื่อแบรนด์ลูกค้า</th>
                          <th className="px-4 py-3.5 min-w-[200px]">ผู้ดูแลแบรนด์</th>
                          <th className="px-4 py-3.5 min-w-[150px] text-center">สถานะไลฟ์ (Live Queue)</th>
                          <th className="px-4 py-3.5 min-w-[120px] text-center">สถานะเปิดรับจอง</th>
                          {(canEdit || canDelete) && <th className="px-4 py-3.5 text-center min-w-[120px]">จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal">
                        {filteredBrands.map(brand => {
                          const isChecked = selectedBrandNames.includes(brand.name);
                          const assignedList = brand.description && brand.description.startsWith('emails:')
                            ? brand.description.substring(7).split(',').filter(Boolean)
                            : [];
                          const stats = getBrandLiveStats(brand.name);

                          return (
                            <tr 
                              key={brand.id || brand.name} 
                              className={`hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors ${
                                isChecked ? 'bg-brand-50/30 dark:bg-brand-950/20' : ''
                              }`}
                            >
                              {/* Checkbox Column */}
                              <td className="px-3 py-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectRow(brand.name)}
                                  className="w-4 h-4 rounded text-brand-600 accent-brand-600 cursor-pointer"
                                />
                              </td>

                              {/* Brand Name Column */}
                              <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                                <span>{brand.name}</span>
                              </td>

                              {/* Brand Caregivers Column */}
                              <td className="px-4 py-3.5">
                                <div className="flex flex-wrap items-center gap-1">
                                  {assignedList
                                    .filter(email => allUsersAdmin.some(u => u.email === email))
                                    .map(email => {
                                      const matchedUser = allUsersAdmin.find(u => u.email === email);
                                      return (
                                        <span key={email} className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                                          {matchedUser ? matchedUser.name : email}
                                        </span>
                                      );
                                    })}
                                  {assignedList.filter(email => allUsersAdmin.some(u => u.email === email)).length === 0 && (
                                    <span className="text-[10px] text-slate-400 italic font-normal">ทุกคนสามารถเข้าถึงได้</span>
                                  )}
                                </div>
                              </td>

                              {/* Live Status Column (0 = none, > 0 = active/upcoming) */}
                              <td className="px-4 py-3.5 text-center">
                                {stats.totalCount === 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 select-none">
                                    0 คิว
                                  </span>
                                ) : stats.ongoingCount > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => setViewingBrandSessions({ brandName: brand.name, bookings: stats.allBlocking })}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse cursor-pointer hover:scale-105 transition-all shadow-xs"
                                    title="คลิกเพื่อดูรายละเอียดคิวที่กำลังไลฟ์และรอบที่จะถึง"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>กำลังไลฟ์ ({stats.ongoingCount}){stats.upcomingCount > 0 ? ` + คิวรอ (${stats.upcomingCount})` : ''}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setViewingBrandSessions({ brandName: brand.name, bookings: stats.allBlocking })}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer hover:scale-105 transition-all shadow-xs"
                                    title="คลิกเพื่อดูรายละเอียดรอบไลฟ์ที่กำลังจะเกิดขึ้น"
                                  >
                                    <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                    <span>มี {stats.upcomingCount} คิวที่จะถึง</span>
                                  </button>
                                )}
                              </td>

                              {/* Active / Inactive Status Toggle Column (with safety live check) */}
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  type="button"
                                  disabled={!canEdit}
                                  onClick={() => handleToggleBrandStatus(brand)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                    canEdit ? 'cursor-pointer hover:opacity-85 active:scale-95' : 'cursor-default'
                                  } ${
                                    brand.status === 'Active' 
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' 
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                                  }`}
                                  title={canEdit ? 'คลิกเพื่อเปลี่ยนสถานะ Active / Inactive (มีระบบป้องกันคิวไลฟ์อัตโนมัติ)' : undefined}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${brand.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  <span>{brand.status === 'Active' ? 'Active' : 'Inactive'}</span>
                                </button>
                              </td>

                              {/* Actions Column */}
                              {(canEdit || canDelete) && (
                                <td className="px-4 py-3.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {canEdit && (
                                      <>
                                        <button
                                          onClick={() => handleOpenQuickCaregiver(brand)}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer"
                                          title="กำหนดผู้ดูแลแบรนด์"
                                        >
                                          <UserCheck className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleEditBrandSelect(brand)}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-all cursor-pointer"
                                          title="แก้ไขแบรนด์"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                    {canDelete && (
                                      <button
                                        onClick={() => handleDeleteBrand(brand)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                        title="ลบแบรนด์ (ตรวจสอบคิวไลฟ์ก่อนลบ)"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        {filteredBrands.length === 0 && (
                          <tr>
                            <td colSpan={(canEdit || canDelete) ? 6 : 5} className="p-8 text-center text-slate-400 italic">ไม่มีข้อมูลแบรนด์ตรงตามเงื่อนไขที่เลือก</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MODAL: BRAND CREATE / EDIT */}
                {isBrandModalOpen && (
                  <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50 select-none">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 flex items-center justify-center shadow-xs">
                            <Tag className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-950 dark:text-white text-sm">
                              {isEditingBrand ? `แก้ไขแบรนด์ลูกค้า: ${brandOldName}` : 'เพิ่มแบรนด์ลูกค้าใหม่'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {isEditingBrand ? 'ปรับปรุงรายละเอียดและผู้ดูแลแบรนด์' : 'กำหนดชื่อแบรนด์ ผู้ดูแล และสถานะเปิดรับจอง'}
                            </p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => {
                            setIsBrandModalOpen(false);
                            resetBrandForm();
                          }}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="ปิดหน้าต่าง"
                        >
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveBrand} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ชื่อแบรนด์ลูกค้า (Brand Name)</label>
                          <input
                            type="text"
                            placeholder="เช่น Bau, 7.7, G-Shock"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                            required
                            autoFocus
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ผู้ดูแลแบรนด์ (Assigned Users)</label>
                          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/30 max-h-48 overflow-y-auto space-y-1.5">
                            {allUsersAdmin.map(u => {
                              const isAssigned = brandAssignedUsers.includes(u.email);
                              return (
                                <button
                                  key={u.email}
                                  type="button"
                                  onClick={() => {
                                    if (isAssigned) {
                                      setBrandAssignedUsers(prev => prev.filter(email => email !== u.email));
                                    } else {
                                      setBrandAssignedUsers(prev => [...prev, u.email]);
                                    }
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                                    isAssigned
                                      ? 'bg-brand-50/80 dark:bg-brand-950/30 border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300 shadow-xs'
                                      : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                                  }`}
                                >
                                  <span>{u.name} ({u.email})</span>
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    readOnly
                                    className="w-3.5 h-3.5 text-brand-600 rounded pointer-events-none"
                                  />
                                </button>
                              );
                            })}
                            {allUsersAdmin.length === 0 && (
                              <span className="text-[10px] text-slate-400 italic block p-1">ไม่มีข้อมูลผู้ดูแลในระบบ</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">สถานะเปิดรับจอง (Status)</label>
                          <select
                            value={brandStatus}
                            onChange={(e) => setBrandStatus(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                          >
                            <option value="Active">เปิดจองปกติ (Active)</option>
                            <option value="Inactive">ระงับชั่วคราว (Inactive)</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              setIsBrandModalOpen(false);
                              resetBrandForm();
                            }}
                            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="py-2.5 px-5 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-[0.99] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* USERS SUBTAB */}
          {activeSubTab === 'users' && (() => {
            const canCreate = hasPerm('users-create');
            const canEdit = hasPerm('users-edit');
            const canDelete = hasPerm('users-delete');
            return (
              <div className="w-full flex flex-col gap-6">
                {/* Full-width Table List card */}
                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                        <UserPlus className="w-4.5 h-4.5 text-brand-500" />
                        รายชื่อผู้ใช้งานทั้งหมดในระบบ
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">จัดการผู้ใช้งานระบบ กำหนดบทบาทสิทธิ์ และเปลี่ยนรหัสผ่าน</p>
                    </div>
                    
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                      <div className="relative w-48 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="search"
                          placeholder="ค้นหาชื่อ / อีเมล..."
                          value={adminSearchQuery}
                          onChange={(e) => setAdminSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                        />
                      </div>

                      {canCreate && (
                        <button
                          onClick={() => {
                            resetUserForm();
                            setIsEditingUser(false);
                            setIsUserModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>เพิ่มผู้ใช้งานใหม่</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider select-none">
                          <th className="px-4 py-3.5">บัญชีผู้ใช้ (Email)</th>
                          <th className="px-4 py-3.5">ชื่อ-นามสกุล</th>
                          <th className="px-4 py-3.5">ระดับสิทธิ์</th>
                          <th className="px-4 py-3.5">รหัสผ่าน</th>
                          <th className="px-4 py-3.5">สถานะ</th>
                          {(canEdit || canDelete) && <th className="px-4 py-3.5 text-center">จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal">
                        {filteredUsers.map(user => (
                          <tr key={user.email} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors text-slate-700 dark:text-slate-350">
                            <td className="px-4 py-3.5 font-normal text-slate-900 dark:text-white">{user.email}</td>
                            <td className="px-4 py-3.5 font-normal">{user.name}</td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/50">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-400 dark:text-slate-500 select-none tracking-widest text-[13px]">
                              ••••••••
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                user.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {user.status === 'Active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            {(canEdit || canDelete) && (
                              <td className="px-4 py-3.5 flex items-center justify-center gap-1">
                                {canEdit && (
                                  <button
                                    onClick={() => handleEditUserSelect(user)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-all cursor-pointer"
                                    title="แก้ไขผู้ใช้"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteUser(user)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                    title="ลบผู้ใช้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr>
                            <td colSpan={(canEdit || canDelete) ? 6 : 5} className="p-8 text-center text-slate-400 italic">ไม่มีข้อมูลผู้ใช้ตรงตามเงื่อนไข</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MODAL: USER CREATE / EDIT */}
                {isUserModalOpen && (
                  <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50 select-none">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 flex items-center justify-center shadow-xs">
                            <UserPlus className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-950 dark:text-white text-sm">
                              {isEditingUser ? `แก้ไขผู้ใช้งาน: ${userEmail}` : 'เพิ่มผู้ใช้งานระบบใหม่'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {isEditingUser ? 'ปรับปรุงข้อมูล ระดับสิทธิ์ และรหัสผ่าน' : 'กำหนดบัญชี อีเมล สิทธิ์การเข้าถึง และรหัสผ่าน'}
                            </p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => {
                            setIsUserModalOpen(false);
                            resetUserForm();
                          }}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="ปิดหน้าต่าง"
                        >
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">อีเมล / บัญชี (User Account Email)</label>
                          <input
                            type="text"
                            placeholder="เช่น admin, creator1@th.co.th"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            disabled={isEditingUser}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all disabled:opacity-50"
                            required
                            autoFocus={!isEditingUser}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ชื่อผู้ใช้ระบบ (Full Name)</label>
                          <input
                            type="text"
                            placeholder="เช่น สมชาย มีความสุข"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">สิทธิ์เข้าถึง (Role Name)</label>
                          <select
                            value={userRole}
                            onChange={(e) => setUserRole(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                          >
                            {roles.map(r => (
                              <option key={r.roleName} value={r.roleName}>{r.roleName}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                            {isEditingUser ? 'ตั้งรหัสผ่านใหม่ (Reset Password)' : 'รหัสผ่านบัญชี (Password)'}
                          </label>
                          <div className="relative">
                            <input
                              type={showUserPasswordInput ? 'text' : 'password'}
                              placeholder={isEditingUser ? 'กรอกรหัสผ่านใหม่ที่ต้องการเปลี่ยน...' : 'กำหนดรหัสผ่าน เช่น 123456'}
                              value={userPassword}
                              onChange={(e) => setUserPassword(e.target.value)}
                              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                              required={!isEditingUser}
                            />
                            <button
                              type="button"
                              onClick={() => setShowUserPasswordInput(!showUserPasswordInput)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 transition-colors"
                              title={showUserPasswordInput ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                            >
                              {showUserPasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {isEditingUser && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                              * พิมพ์รหัสผ่านใหม่เพื่อทำการเปลี่ยนรหัสผ่านทันที
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">สถานะการใช้งาน (Status)</label>
                          <select
                            value={userStatus}
                            onChange={(e) => setUserStatus(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                          >
                            <option value="Active">ใช้งานปกติ (Active)</option>
                            <option value="Inactive">บล็อกผู้ใช้ (Inactive)</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserModalOpen(false);
                              resetUserForm();
                            }}
                            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="py-2.5 px-5 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-[0.99] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ROLES SUBTAB */}
          {activeSubTab === 'roles' && (() => {
            const canCreate = hasPerm('roles-create');
            const canEdit = hasPerm('roles-edit');
            const canDelete = hasPerm('roles-delete');
            return (
              <div className="w-full flex flex-col gap-6">
                {/* Full-width Table List card */}
                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                        <Layers className="w-4.5 h-4.5 text-brand-500" />
                        สิทธิ์ทั้งหมดในฐานข้อมูล
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">จัดการบทบาท สิทธิ์เข้าถึงเมนู และสิทธิ์การจัดการข้อมูลของแต่ละกลุ่มผู้ใช้งาน</p>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                      {canCreate && (
                        <button
                          onClick={() => {
                            resetRoleForm();
                            setIsEditingRole(false);
                            setIsRoleModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>สร้างระดับสิทธิ์</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider select-none">
                          <th className="px-4 py-3.5">ระดับสิทธิ์</th>
                          <th className="px-4 py-3.5">สิทธิ์อนุญาตการใช้งาน</th>
                          <th className="px-4 py-3.5">การมองเห็นแถบ</th>
                          {(canEdit || canDelete) && <th className="px-4 py-3.5 text-center">จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                        {roles.map(role => (
                          <tr key={role.roleName} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors text-slate-700 dark:text-slate-350">
                            <td className="px-4 py-3.5 font-extrabold text-slate-900 dark:text-white">
                              {role.roleName}
                              <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{role.description}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1.5">
                                {role.canCreateBooking ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/60">
                                    + จองคิว
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-600 border border-slate-200/30">
                                    - จองคิว
                                  </span>
                                )}
                                {role.canEditBooking ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/60">
                                    ✎ แก้ไข
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-600 border border-slate-200/30">
                                    - แก้ไข
                                  </span>
                                )}
                                {role.canCancelBooking ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/60">
                                    🗙 ยกเลิก
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-600 border border-slate-200/30">
                                    - ยกเลิก
                                  </span>
                                )}
                                {role.isAdmin ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200/60">
                                    🛡️ Admin
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1 max-w-[280px]">
                                {role.allowedTabs.split(',').map(tabId => {
                                  const tabMap: Record<string, { label: string, color: string }> = {
                                    'campaign-schedule': { label: 'แคมเปญทั้งหมด', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300' },
                                    'calendar': { label: 'ปฏิทินห้องไลฟ์', color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-300' },
                                    'scheduler': { label: 'ตารางงานรายวัน', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300' },
                                    'my-bookings': { label: 'การจองของฉัน', color: 'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-300' },
                                    'analytics': { label: 'รายงานและสถิติ', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300' },
                                    'rooms': { label: 'ห้องสตูดิโอ', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300' },
                                    'brands': { label: 'แบรนด์ลูกค้า', color: 'bg-pink-50 text-pink-700 dark:bg-pink-950/20 dark:text-pink-300' },
                                    'mc-live': { label: 'การจัดการ MC', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300' },
                                    'change-requests': role.allowedTabs.includes('change-requests-edit')
                                      ? { label: 'จัดการคำขอแก้ไขคิว (อนุมัติ)', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300' }
                                      : { label: 'จัดการคำขอแก้ไขคิว (ยื่นคำขอ)', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300' },
                                    'users': { label: 'ผู้ใช้งานระบบ', color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-300' },
                                    'roles-mgmt': { label: 'ระดับสิทธิ์', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300' },
                                    'audit-log': { label: 'ประวัติระบบ', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350' },
                                    'settings': { label: 'ตั้งค่าแจ้งเตือน', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300' }
                                  };
                                  if (tabId.trim() === 'change-requests-edit') return null; // Avoid duplicate pill
                                  const matched = tabMap[tabId.trim()] || { label: tabId, color: 'bg-slate-50 text-slate-650' };
                                  return (
                                    <span key={tabId} className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border border-current/10 ${matched.color}`}>
                                      {matched.label}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            {(canEdit || canDelete) && (
                              <td className="px-4 py-3.5 flex items-center justify-center gap-1">
                                {canEdit && (
                                  <button
                                    onClick={() => handleEditRoleSelect(role)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-all cursor-pointer"
                                    title="แก้ไขสิทธิ์"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteRole(role)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                    title="ลบสิทธิ์"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── MODAL: CREATE & EDIT ROLE POPUP ──────────────────────────── */}
                {isRoleModalOpen && (
                  <div className="fixed inset-0 bg-slate-955/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                      {/* Modal Header */}
                      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50 select-none">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 flex items-center justify-center shadow-xs">
                            <Layers className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-950 dark:text-white text-sm">
                              {isEditingRole ? `แก้ไขระดับสิทธิ์: ${roleName}` : 'สร้างระดับสิทธิ์ใหม่'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {isEditingRole ? 'ปรับปรุงเงื่อนไขการเข้าถึงและสิทธิ์ของบทบาทนี้' : 'กำหนดสิทธิ์การจองคิวและการเข้าถึงเมนูต่าง ๆ'}
                            </p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => {
                            setIsRoleModalOpen(false);
                            resetRoleForm();
                          }}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="ปิดหน้าต่าง"
                        >
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>

                      {/* Modal Form Body */}
                      <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ชื่อบทบาทระดับสิทธิ์ (Role Name)</label>
                          <input
                            type="text"
                            placeholder="เช่น Graphic Designer"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            disabled={isEditingRole}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all disabled:opacity-50"
                            required
                            autoFocus={!isEditingRole}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">คำอธิบายสิทธิ์ (Description)</label>
                          <input
                            type="text"
                            placeholder="เช่น สิทธิ์สำหรับเข้ามาแปะลิงค์ของทีมดีไซเนอร์"
                            value={roleDesc}
                            onChange={(e) => setRoleDesc(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                          />
                        </div>

                        {/* Booking Operations — 3-col pill toggle */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">สิทธิ์คิวไลฟ์สด</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: 'จอง', state: canCreateBooking, set: setCanCreateBooking },
                              { label: 'แก้ไข', state: canEditBooking, set: setCanEditBooking },
                              { label: 'ยกเลิก', state: canCancelBooking, set: setCanCancelBooking },
                            ].map(({ label, state, set }) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => set(!state)}
                                className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-center ${
                                  state
                                    ? 'bg-brand-500 border-brand-500 text-white shadow-sm shadow-brand-500/25'
                                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Visible Tabs — styled checkbox buttons */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">เมนูที่มองเห็น</p>
                            <span className="text-[10px] text-brand-500 font-extrabold">
                              {roleAllowedTabs.filter(t => [
                                'scheduler','calendar','my-bookings','campaign-schedule','analytics',
                                'rooms','brands','users','roles-mgmt','audit-log','settings', 'mc-live', 'change-requests'
                              ].includes(t)).length} / 13
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'campaign-schedule',label: 'แคมเปญทั้งหมด' },
                              { id: 'calendar',         label: 'ปฏิทินห้องไลฟ์' },
                              { id: 'scheduler',        label: 'ตารางงานรายวัน' },
                              { id: 'my-bookings',      label: 'การจองของฉัน' },
                              { id: 'analytics',        label: 'รายงานและสถิติ' },
                            ].map(tab => {
                              const on = roleAllowedTabs.includes(tab.id);
                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => handleCheckboxTabToggle(tab.id)}
                                  className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer text-left truncate ${
                                    on
                                      ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={on}
                                    readOnly
                                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-brand-600 pointer-events-none"
                                  />
                                  <span className="truncate">{tab.label}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Settings Sub-menus Group */}
                          <div className="mt-3 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">เมนูตั้งค่าระบบ</span>
                              
                              {/* ALL Checkbox Toggle */}
                              <button
                                type="button"
                                onClick={() => {
                                  const settingsSubtabs = ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live', 'change-requests'];
                                  const allChecked = settingsSubtabs.every(id => roleAllowedTabs.includes(id));
                                  if (allChecked) {
                                    setRoleAllowedTabs(prev => prev.filter(t => !settingsSubtabs.includes(t)));
                                  } else {
                                    setRoleAllowedTabs(prev => {
                                      const base = prev.filter(t => !settingsSubtabs.includes(t));
                                      return [...base, ...settingsSubtabs];
                                    });
                                  }
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-extrabold text-brand-600 dark:text-brand-400 hover:opacity-80 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live', 'change-requests'].every(id => roleAllowedTabs.includes(id))}
                                  readOnly
                                  className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-brand-600 pointer-events-none"
                                />
                                เลือกทั้งหมด
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: 'rooms',            label: 'ห้องสตูดิโอ' },
                                { id: 'brands',           label: 'แบรนด์ลูกค้า' },
                                { id: 'mc-live',          label: 'การจัดการ MC' },
                                { id: 'change-requests',  label: 'จัดการคำขอแก้ไขคิว' },
                                { id: 'users',            label: 'ผู้ใช้งานระบบ' },
                                { id: 'roles-mgmt',       label: 'ระดับสิทธิ์' },
                                { id: 'audit-log',        label: 'ประวัติระบบ' },
                                { id: 'settings',         label: 'ตั้งค่าแจ้งเตือน' },
                              ].map(tab => {
                                const on = roleAllowedTabs.includes(tab.id);
                                return (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleCheckboxTabToggle(tab.id)}
                                    className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer text-left truncate ${
                                      on
                                        ? 'bg-brand-50/80 dark:bg-brand-950/30 border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300 shadow-xs'
                                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={on}
                                      readOnly
                                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-brand-600 pointer-events-none"
                                    />
                                    <span className="truncate">{tab.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Data Management — row per entity, 3 action pills */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">สิทธิ์จัดการข้อมูล</p>
                          <div className="space-y-2">
                            {[
                              { label: 'ห้องสตูดิโอ', base: 'rooms' },
                              { label: 'แบรนด์', base: 'brands' },
                              { label: 'การจัดการ MC', base: 'mc-live' },
                              { label: 'คำขอแก้ไขคิว', base: 'change-requests' },
                              { label: 'ผู้ใช้งาน', base: 'users' },
                              { label: 'ระดับสิทธิ์', base: 'roles' },
                            ].map(({ label, base }) => {
                              if (base === 'change-requests') {
                                const isApproverMode = roleAllowedTabs.includes('change-requests-edit');
                                const isRequesterMode = roleAllowedTabs.includes('change-requests') && !isApproverMode;

                                return (
                                  <div key={base} className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{label}</span>
                                      <span className="text-[10px] text-slate-400 font-medium">ระดับการมองเห็นและสิทธิ์อนุมัติ</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          let updated = [...roleAllowedTabs];
                                          if (isRequesterMode) {
                                            updated = updated.filter(t => t !== 'change-requests' && t !== 'change-requests-edit');
                                          } else {
                                            if (!updated.includes('change-requests')) updated.push('change-requests');
                                            updated = updated.filter(t => t !== 'change-requests-edit');
                                          }
                                          setRoleAllowedTabs(updated);
                                        }}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-[10px] font-bold transition-all cursor-pointer text-center ${
                                          isRequesterMode
                                            ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-300 shadow-2xs'
                                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                      >
                                        <Users className="w-3 h-3" />
                                        โหมดผู้ยื่นคำขอ (เฉพาะของตัวเอง)
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          let updated = [...roleAllowedTabs];
                                          if (isApproverMode) {
                                            updated = updated.filter(t => t !== 'change-requests' && t !== 'change-requests-edit');
                                          } else {
                                            if (!updated.includes('change-requests')) updated.push('change-requests');
                                            if (!updated.includes('change-requests-edit')) updated.push('change-requests-edit');
                                          }
                                          setRoleAllowedTabs(updated);
                                        }}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-[10px] font-bold transition-all cursor-pointer text-center ${
                                          isApproverMode
                                            ? 'bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-950/40 dark:border-purple-700 dark:text-purple-300 shadow-2xs'
                                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                      >
                                        <ShieldCheck className="w-3 h-3" />
                                        โหมดผู้อนุมัติ (ทุกคน + อนุมัติ/ปฏิเสธ)
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={base} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/60 dark:bg-slate-850/40 border border-slate-200 dark:border-slate-800">
                                  <span className="text-[11px] shrink-0 w-24 font-bold text-slate-600 dark:text-slate-300 truncate">{label}</span>
                                  <div className="flex gap-1.5 flex-1">
                                    {(['create','edit','delete'] as const).map(action => {
                                      const permId = `${base}-${action}`;
                                      const on = roleAllowedTabs.includes(permId);

                                      const colors: Record<string, string> = {
                                        create: on ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50',
                                        edit:   on ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300'   : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50',
                                        delete: on ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-700 dark:text-rose-300'       : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50',
                                      };
                                      const actionLabel: Record<string, string> = { create: 'สร้าง', edit: 'แก้ไข', delete: 'ลบ' };
                                      return (
                                        <button
                                          key={action}
                                          type="button"
                                          onClick={() => handleCheckboxTabToggle(permId)}
                                          className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer text-center ${colors[action]}`}
                                        >
                                          {actionLabel[action]}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              setIsRoleModalOpen(false);
                              resetRoleForm();
                            }}
                            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="py-2.5 px-5 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-[0.99] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลระดับสิทธิ์'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* AUDIT LOGS SUBTAB */}
          {activeSubTab === 'logs' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 text-xs">
                <h4 className="font-extrabold text-slate-850 dark:text-slate-200 text-xs">ประวัติกิจกรรมการทำรายการในระบบ (Audit Log Trail)</h4>
                
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="search"
                    placeholder="ค้นหาชื่อผู้ใช้ / คำค้น..."
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl max-h-[500px] overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider select-none sticky top-0 z-10">
                      <th className="px-4 py-3.5">วัน-เวลา</th>
                      <th className="px-4 py-3.5">ผู้ดำเนินการ</th>
                      <th className="px-4 py-3.5">กิจกรรม</th>
                      <th className="px-4 py-3.5">เป้าหมาย (Target)</th>
                      <th className="px-4 py-3.5">รายละเอียด (Details)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                    {logsLoading ? (
                      <tr>
                        <td colSpan={5} className="p-16 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-6 h-6 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">กำลังโหลดประวัติกิจกรรม...</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log, index) => (
                        <tr key={index} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors text-slate-700 dark:text-slate-350">
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                            {new Date(log.timestamp).toLocaleString('th-TH')}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                            {log.userName}
                            <span className="block text-[10px] font-normal text-slate-400">{log.userEmail}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-200">{log.target}</td>
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 leading-normal" title={log.details}>
                            {log.details}
                          </td>
                        </tr>
                      ))
                    )}
                    {!logsLoading && filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 italic">ไม่มีข้อมูลประวัติกิจกรรมตรงตามเงื่อนไข</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SETTINGS SUBTAB */}
          {activeSubTab === 'settings' && (
            <div className="flex flex-col gap-6 w-full max-w-4xl">
              {/* Card 1: One-Click Full System Backup & Safety */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col gap-5">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                        <HardDrive className="w-4.5 h-4.5" />
                      </div>
                      สำรองข้อมูลระบบ (One-Click Full Backup)
                    </h3>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 px-3 py-1 rounded-full self-start sm:self-auto flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> ระบบพร้อมสำรองข้อมูล 100%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    ดาวน์โหลดและจัดเก็บข้อมูลทุกตารางในระบบ (คิวจอง, แบรนด์, ห้อง, ผู้ใช้, สิทธิ์, MC ฯลฯ) เก็บไว้ในเครื่องคอมพิวเตอร์แบบคลิกเดียว
                  </p>
                </div>

                {/* Quick Data Count Badges */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                    สรุปปริมาณข้อมูลปัจจุบันในระบบ (Data Summary):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-2xl flex flex-col">
                      <span className="text-[10px] text-slate-400 font-medium">คิวจองทั้งหมด</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">{calendarBookings.length} คิว</span>
                    </div>
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-2xl flex flex-col">
                      <span className="text-[10px] text-slate-400 font-medium">แบรนด์ลูกค้า</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">{brands.length} แบรนด์</span>
                    </div>
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-2xl flex flex-col">
                      <span className="text-[10px] text-slate-400 font-medium">ห้องสตูดิโอ</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">{rooms.length} ห้อง</span>
                    </div>
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-2xl flex flex-col">
                      <span className="text-[10px] text-slate-400 font-medium">MC ทั้งหมด</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">{mcList?.length || 0} ท่าน</span>
                    </div>
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-2xl flex flex-col">
                      <span className="text-[10px] text-slate-400 font-medium">ผู้ใช้งาน</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">{allUsersAdmin?.length || 0} คน</span>
                    </div>
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-2xl flex flex-col">
                      <span className="text-[10px] text-slate-400 font-medium">ระดับสิทธิ์</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">{roles?.length || 0} สิทธิ์</span>
                    </div>
                  </div>
                </div>

                {/* Download Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* JSON Backup Button Card */}
                  <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-extrabold text-xs text-emerald-900 dark:text-emerald-300">
                        <FileJson className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ไฟล์สำรองข้อมูล JSON (Full Database Dump)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        ดึงข้อมูลดิบทุกตารางครบ 100% สำหรับเก็บเป็น Snapshot ของฐานข้อมูล หรือใช้อ้างอิงทางเทคนิค
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isBackingUp}
                      onClick={() => handleDownloadBackup('json')}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBackingUp ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังประมวลผลข้อมูล...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" /> ดาวน์โหลดไฟล์ JSON (.json)
                        </>
                      )}
                    </button>
                  </div>

                  {/* Excel Multi-Sheet Backup Button Card */}
                  <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-extrabold text-xs text-blue-900 dark:text-blue-300">
                        <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ไฟล์สำรองข้อมูล Excel (All-in-One Multi-Sheet)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        รวมทุกตารางแยกแท็บ Sheet ในไฟล์เดียว (Bookings, Brands, Rooms, MCs, Users, Roles ฯลฯ)
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isBackingUp}
                      onClick={() => handleDownloadBackup('xlsx')}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBackingUp ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังสร้างไฟล์ Excel...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" /> ดาวน์โหลดไฟล์ Excel (.xlsx)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {backupSuccessMsg && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{backupSuccessMsg}</span>
                  </div>
                )}

                {/* Info Note */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 rounded-2xl flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300 font-bold block mb-0.5">การสำรองข้อมูลอัตโนมัติบน Cloud (Supabase Daily Backup)</strong>
                    ระบบฐานข้อมูล Supabase PostgreSQL มีการสำรองข้อมูลอัตโนมัติทุกวันบน Cloud Server อยู่แล้ว เพื่อความปลอดภัยสูงสุด แนะนำให้ผู้ดูแลดาวน์โหลดไฟล์สำรองข้อมูล (JSON หรือ Excel) เก็บไว้ในเครื่องคอมพิวเตอร์อย่างน้อยเดือนละ 1 ครั้ง หรือก่อนการอัปเดตข้อมูลขนาดใหญ่
                  </div>
                </div>
              </div>

              {/* Card 2: Notifications & General Settings */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex items-center gap-2">
                  <Bell className="w-4.5 h-4.5 text-slate-900 dark:text-white" />
                  การแจ้งเตือนและการเชื่อมต่อ API
                </h3>
                
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  {/* Notification Enabled toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">เปิดใช้งาน Line Notification</span>
                      <span className="text-[11px] text-slate-400 font-medium">ส่งการแจ้งเตือนไปยังกลุ่มไลน์เมื่อมีการจอง แก้ไข หรือยกเลิกคิวไลฟ์สด</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsLineEnabled}
                      onChange={(e) => setSettingsLineEnabled(e.target.checked)}
                      className="w-4.5 h-4.5 text-slate-900 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Line Messaging Channel Access Token</label>
                    <input
                      type="password"
                      placeholder="กรอก Messaging API channel access token ของไลน์บอท"
                      value={settingsLineToken}
                      onChange={(e) => setSettingsLineToken(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Line Target Destination ID (GroupID / UserID)</label>
                    <input
                      type="text"
                      placeholder="เช่น C1234567890abcdef... ของกลุ่มไลน์แชทเป้าหมาย"
                      value={settingsLineDestId}
                      onChange={(e) => setSettingsLineDestId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Frontend URL (ใช้สร้างลิงค์แนบไลน์)</label>
                    <input
                      type="url"
                      placeholder="เช่น https://th-booking.vercel.app"
                      value={settingsUrl}
                      onChange={(e) => setSettingsUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ช่องทางการไลฟ์สด (Live Channels)</label>
                    <input
                      type="text"
                      placeholder="เช่น Facebook,TikTok,Shopee,Lazada (คั่นด้วยเครื่องหมายจุลภาค ,)"
                      value={settingsLiveChannels}
                      onChange={(e) => setSettingsLiveChannels(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                    />
                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">ระบุรายการช่องทางการไลฟ์โดยคั่นด้วยเครื่องหมายจุลภาค เพื่อให้ผู้ใช้สามารถเลือกได้ขณะทำรายการจองห้องไลฟ์</span>
                  </div>

                  <div className="p-4 bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      🔒 กำหนดจำนวนวันล็อกการแก้ไขคิวจอง (Change Request Lock Days Threshold)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        max={365}
                        placeholder="14"
                        value={settingsChangeRequestLockDays}
                        onChange={(e) => setSettingsChangeRequestLockDays(parseInt(e.target.value, 10) || 0)}
                        className="w-28 px-3.5 py-2 text-xs font-extrabold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">วันก่อนเริ่มไลฟ์สด (ค่าเริ่มต้น: 14 วัน)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block leading-relaxed">
                      หากคิวจองมีระยะเวลาคงเหลือน้อยกว่าจำนวนวันนี้ ผู้ใช้งานทั่วไปจะไม่สามารถแก้ไข/ยกเลิกโดยตรงได้ และระบบจะให้ส่งเป็นคำร้องขอแก้ไขแทนเพื่อให้ผู้ดูแลอนุมัติ
                    </span>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-[0.99] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {submitting ? 'กำลังบันทึกการตั้งค่า...' : 'บันทึกการตั้งค่าระบบ'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MC LIVE SUBTAB */}
          {activeSubTab === 'mc-live' && (
            <div className="flex flex-col gap-6 w-full">
              {/* Inner Tab Header */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 shrink-0">
                <button
                  onClick={() => setMcSubTab('list')}
                  className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    mcSubTab === 'list'
                      ? 'border-slate-900 dark:border-white text-slate-950 dark:text-white font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
                  }`}
                >
                  รายชื่อ MC (MC List)
                </button>
                <button
                  onClick={() => setMcSubTab('tiers')}
                  className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    mcSubTab === 'tiers'
                      ? 'border-slate-900 dark:border-white text-slate-950 dark:text-white font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
                  }`}
                >
                  จัดการ Tier (Tier Management)
                </button>
              </div>

              {/* TAB 1: MC LIST */}
              {mcSubTab === 'list' && (
                <div className="flex flex-col gap-4">
                  {/* Filters & Actions bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search */}
                      <div className="relative w-48 sm:w-56">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อ MC..."
                          value={mcSearch}
                          onChange={(e) => setMcSearch(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-all"
                        />
                      </div>

                      {/* 1. Custom Multi-select Filter by Tier */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMcTierFilterOpen(!isMcTierFilterOpen);
                            setIsMcStatusFilterOpen(false);
                            setIsMcSortOpen(false);
                          }}
                          className={`text-xs font-semibold border ${
                            mcFilterTiers.length > 0 ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-slate-200 dark:border-slate-800'
                          } bg-white dark:bg-slate-950 px-3.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer text-left`}
                        >
                          <span className="truncate max-w-[130px] text-slate-900 dark:text-white">
                            {mcFilterTiers.length === 0
                              ? 'ทุกระดับ Tier'
                              : mcFilterTiers.length === 1
                              ? mcTiers.find(t => t.id === mcFilterTiers[0])?.name || '1 ระดับ'
                              : `Tier (${mcFilterTiers.length} ระดับ)`}
                          </span>
                          {isMcTierFilterOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        </button>

                        {isMcTierFilterOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsMcTierFilterOpen(false)} />
                            <div className="absolute top-full left-0 mt-1.5 w-60 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col z-30" style={{ maxHeight: '280px' }}>
                              {mcTiers.length > 5 && (
                                <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                  <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                      type="text"
                                      placeholder="ค้นหา Tier..."
                                      value={mcTierFilterSearch}
                                      onChange={(e) => setMcTierFilterSearch(e.target.value)}
                                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Select All */}
                              <div className="p-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                <div
                                  onClick={() => {
                                    const isAll = mcFilterTiers.length === mcTiers.length && mcTiers.length > 0;
                                    if (isAll) {
                                      setMcFilterTiers([]);
                                    } else {
                                      setMcFilterTiers(mcTiers.map(t => t.id));
                                    }
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                    mcFilterTiers.length === mcTiers.length && mcTiers.length > 0
                                      ? 'bg-brand-500 border-brand-500'
                                      : 'border-slate-300 dark:border-slate-600'
                                  }`}>
                                    {mcFilterTiers.length === mcTiers.length && mcTiers.length > 0 && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                                </div>
                              </div>

                              {/* Tier List */}
                              <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                                {mcTiers
                                  .filter(t => t.name.toLowerCase().includes(mcTierFilterSearch.toLowerCase().trim()))
                                  .map(t => {
                                    const isChecked = mcFilterTiers.includes(t.id);
                                    return (
                                      <div
                                        key={t.id}
                                        onClick={() => {
                                          if (isChecked) {
                                            setMcFilterTiers(mcFilterTiers.filter(id => id !== t.id));
                                          } else {
                                            setMcFilterTiers([...mcFilterTiers, t.id]);
                                          }
                                        }}
                                        className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                            isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'
                                          }`}>
                                            {isChecked && (
                                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </div>
                                          <span className="text-xs text-slate-700 dark:text-slate-300 select-none truncate font-medium">{t.name}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          #{t.sortOrder}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* 2. Custom Select Filter by Status */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMcStatusFilterOpen(!isMcStatusFilterOpen);
                            setIsMcTierFilterOpen(false);
                            setIsMcSortOpen(false);
                          }}
                          className={`text-xs font-semibold border ${
                            mcFilterStatus !== 'all' ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-slate-200 dark:border-slate-800'
                          } bg-white dark:bg-slate-950 px-3.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer text-left`}
                        >
                          <span className="truncate text-slate-900 dark:text-white">
                            {mcFilterStatus === 'all' ? 'ทุกสถานะ' : mcFilterStatus}
                          </span>
                          {isMcStatusFilterOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        </button>

                        {isMcStatusFilterOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsMcStatusFilterOpen(false)} />
                            <div className="absolute top-full left-0 mt-1.5 w-36 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col p-1 z-30">
                              {[
                                { value: 'all', label: 'ทุกสถานะ' },
                                { value: 'Active', label: 'Active' },
                                { value: 'Inactive', label: 'Inactive' }
                              ].map(opt => {
                                const isSelected = mcFilterStatus === opt.value;
                                return (
                                  <div
                                    key={opt.value}
                                    onClick={() => {
                                      setMcFilterStatus(opt.value as any);
                                      setIsMcStatusFilterOpen(false);
                                    }}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                                      isSelected
                                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                  >
                                    <span>{opt.label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      {/* 3. Custom Select Sort Options */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMcSortOpen(!isMcSortOpen);
                            setIsMcTierFilterOpen(false);
                            setIsMcStatusFilterOpen(false);
                          }}
                          className="text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer text-left"
                        >
                          <span className="truncate text-slate-900 dark:text-white">
                            {mcSort === 'name-asc' ? 'ชื่อ MC (ก-ฮ)' : mcSort === 'name-desc' ? 'ชื่อ MC (ฮ-ก)' : 'Tier (สูง-ต่ำ)'}
                          </span>
                          {isMcSortOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        </button>

                        {isMcSortOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsMcSortOpen(false)} />
                            <div className="absolute top-full left-0 mt-1.5 w-44 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col p-1 z-30">
                              {[
                                { value: 'name-asc', label: 'ชื่อ MC (ก-ฮ)' },
                                { value: 'name-desc', label: 'ชื่อ MC (ฮ-ก)' },
                                { value: 'tier-asc', label: 'Tier (สูง-ต่ำ)' }
                              ].map(opt => {
                                const isSelected = mcSort === opt.value;
                                return (
                                  <div
                                    key={opt.value}
                                    onClick={() => {
                                      setMcSort(opt.value as any);
                                      setIsMcSortOpen(false);
                                    }}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                                      isSelected
                                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                  >
                                    <span>{opt.label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        resetMcForm();
                        setIsMcModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่ม MC ใหม่
                    </button>
                  </div>

                  {/* MC List Table */}
                  <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider select-none">
                          <th className="px-4 py-3.5">ชื่อ MC</th>
                          <th className="px-4 py-3.5">ระดับ Tier</th>
                          <th className="px-4 py-3.5">จำนวนคิวไลฟ์สด</th>
                          <th className="px-4 py-3.5">สถานะ</th>
                          <th className="px-4 py-3.5 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal">
                        {(() => {
                          let filtered = [...mcList];

                          if (mcSearch.trim()) {
                            const query = mcSearch.toLowerCase();
                            filtered = filtered.filter(mc => mc.name.toLowerCase().includes(query));
                          }

                          if (mcFilterTiers.length > 0) {
                            filtered = filtered.filter(mc => mcFilterTiers.includes(mc.tierId));
                          }

                          if (mcFilterStatus !== 'all') {
                            filtered = filtered.filter(mc => mc.status === mcFilterStatus);
                          }

                          filtered.sort((a, b) => {
                            if (mcSort === 'name-asc') return a.name.localeCompare(b.name, 'th');
                            if (mcSort === 'name-desc') return b.name.localeCompare(a.name, 'th');
                            if (mcSort === 'tier-asc') {
                              const tA = mcTiers.find(t => t.id === a.tierId)?.sortOrder || 999;
                              const tB = mcTiers.find(t => t.id === b.tierId)?.sortOrder || 999;
                              return tA - tB;
                            }
                            return 0;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500 font-normal">
                                  ไม่พบข้อมูลผู้ดำเนินรายการ (MC) ตามเงื่อนไขการค้นหา
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map(mc => {
                            const tier = mcTiers.find(t => t.id === mc.tierId);
                            const count = calendarBookings.filter(b => b.mcId === mc.id && b.status !== 'Cancelled').length;

                            return (
                              <tr key={mc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors">
                                <td className="px-4 py-3.5 font-normal text-slate-900 dark:text-white">{mc.name}</td>
                                <td className="px-4 py-3.5">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/50">
                                    {tier ? tier.name : 'ไม่ระบุ'}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">{count} คิว</td>
                                <td className="px-4 py-3.5">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    mc.status === 'Active'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${mc.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    {mc.status === 'Active' ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingMc(mc);
                                      setMcName(mc.name);
                                      setMcTierId(mc.tierId);
                                      setMcStatus(mc.status);
                                      setIsMcModalOpen(true);
                                    }}
                                    title="แก้ไขข้อมูล MC"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-all cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMc(mc)}
                                    title="ลบ MC"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: TIER MANAGEMENT */}
              {mcSubTab === 'tiers' && (
                <div className="flex flex-col gap-4 max-w-2xl">
                  {/* Action row */}
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">ระดับ Tier (กลุ่มประเภท MC) สำหรับจัดกลุ่มคิวจองไลฟ์สด</span>
                    <button
                      onClick={() => {
                        resetTierForm();
                        setIsTierModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-[0.99] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่ม Tier ใหม่
                    </button>
                  </div>

                  {/* Tier lists */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {mcTiers.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium text-xs">
                          ยังไม่มีข้อมูลระดับ Tier ในระบบ
                        </div>
                      ) : (
                        [...mcTiers]
                          .sort((a, b) => {
                            const sA = typeof a.sortOrder === 'number' ? a.sortOrder : 999;
                            const sB = typeof b.sortOrder === 'number' ? b.sortOrder : 999;
                            if (sA !== sB) return sA - sB;
                            return a.name.localeCompare(b.name);
                          })
                          .map((tier) => {
                            const mcsUsing = mcList.filter(mc => mc.tierId === tier.id).length;
                            const isHighest = tier.sortOrder === 0;
                          return (
                            <div key={tier.id} className="flex items-center justify-between p-4 hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors">
                              <div className="flex items-center gap-3.5">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs shrink-0 shadow-xs ${
                                  isHighest 
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/30' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {tier.sortOrder ?? 0}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-900 dark:text-white text-xs">{tier.name}</span>
                                    {isHighest ? (
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-200/60 dark:border-emerald-800/60">
                                        ★ สำคัญสูงสุด (ลำดับ 0)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                                        ลำดับความสำคัญ: {tier.sortOrder}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                    มี MC ในระบบ {mcsUsing} คน
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingTier(tier);
                                    setTierName(tier.name);
                                    setTierSortOrder(tier.sortOrder ?? 0);
                                    setIsTierModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-all cursor-pointer"
                                  title="แก้ไข Tier"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTier(tier)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                  title="ลบ Tier"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHANGE REQUESTS SUBTAB */}
          {activeSubTab === 'change-requests' && (() => {
            const isApprover = hasPerm('change-requests-edit') || currentUser?.role === 'Admin' || currentUser?.role === 'Master Admin' || currentUser?.permissions?.isAdmin;
            const myEmail = (currentUser?.email || '').toLowerCase();
            const scopedRequests = (changeRequests || []).filter(r => {
              if (isApprover) return true;
              return (r.requesterEmail || '').toLowerCase() === myEmail;
            });

            const filteredList = scopedRequests.filter(r => {
              if (reqFilterStatus !== 'ALL' && r.status !== reqFilterStatus) return false;
              if (adminSearchQuery.trim()) {
                const q = adminSearchQuery.toLowerCase();
                return (r.bookingCustomId || '').toLowerCase().includes(q) ||
                       (r.requesterEmail || '').toLowerCase().includes(q) ||
                       (r.requesterName || '').toLowerCase().includes(q) ||
                       (r.requestDetails || '').toLowerCase().includes(q);
              }
              return true;
            });

            return (
              <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
                {/* Top KPI Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div 
                    onClick={() => setReqFilterStatus('ALL')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      reqFilterStatus === 'ALL'
                        ? 'bg-brand-50/90 dark:bg-brand-950/40 border-brand-300 dark:border-brand-800 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">คำขอทั้งหมด</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">{scopedRequests.length}</span>
                  </div>
                  <div 
                    onClick={() => setReqFilterStatus('Pending')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      reqFilterStatus === 'Pending'
                        ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" /> รอพิจารณา
                    </span>
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                      {scopedRequests.filter(r => r.status === 'Pending').length}
                    </span>
                  </div>
                  <div 
                    onClick={() => setReqFilterStatus('Approved')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      reqFilterStatus === 'Approved'
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">อนุมัติแล้ว</span>
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                      {scopedRequests.filter(r => r.status === 'Approved').length}
                    </span>
                  </div>
                  <div 
                    onClick={() => setReqFilterStatus('Rejected')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      reqFilterStatus === 'Rejected'
                        ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">ปฏิเสธคำขอ</span>
                    <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
                      {scopedRequests.filter(r => r.status === 'Rejected').length}
                    </span>
                  </div>
                </div>

                {/* Filters & Actions bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative w-72">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ค้นหา ID คิว, ผู้ส่ง, รายละเอียด..."
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                      />
                    </div>

                    {/* Filter Status Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
                      {[
                        { id: 'ALL', label: 'ทั้งหมด' },
                        { id: 'Pending', label: 'รอพิจารณา' },
                        { id: 'Approved', label: 'อนุมัติแล้ว' },
                        { id: 'Rejected', label: 'ปฏิเสธ' }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setReqFilterStatus(f.id as any)}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            reqFilterStatus === f.id
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Mode scope badge */}
                    {isApprover ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        โหมดผู้อนุมัติ (แสดงคำขอของทุกคนในระบบ)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs">
                        <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        โหมดผู้ยื่นคำขอ (แสดงเฉพาะคำขอของคุณ)
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                    แสดง {filteredList.length} รายการ
                  </div>
                </div>

                {/* Table of Requests */}
                <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[12px] min-w-[1000px]">
                      <thead>
                        <tr className="border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">
                          <th className="py-3 px-4">ID คิวจอง</th>
                          <th className="py-3 px-4">วันที่ & ห้องไลฟ์</th>
                          <th className="py-3 px-4">ผู้ส่งคำร้อง</th>
                          <th className="py-3 px-4">ประเภทคำขอ</th>
                          <th className="py-3 px-4">รายละเอียดที่ขอแก้ไข</th>
                          <th className="py-3 px-4">สถานะ</th>
                          <th className="py-3 px-4">ผู้ดำเนินการ & วันที่</th>
                          <th className="py-3 px-4 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                        {(() => {
                          const list = filteredList;

                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500 font-bold text-[12px]">
                                  {isApprover ? 'ไม่พบรายการคำขอแก้ไขคิวไลฟ์' : 'คุณยังไม่มีรายการคำขอแก้ไขคิวในระบบ (สามารถยื่นคำขอแก้ไขได้จากหน้า "การจองของฉัน")'}
                                </td>
                              </tr>
                            );
                          }

                        return list.map(req => {
                          const matchedB = calendarBookings.find(b => b.id === req.bookingId);
                          const isPending = req.status === 'Pending';
                          const isApproved = req.status === 'Approved';
                          const isRejected = req.status === 'Rejected';
                          const isCreateSlot = req.requestType === 'create_slot';

                          let draftData: any = null;
                          let parsedReason = '';
                          if (isCreateSlot) {
                            try {
                              const p = JSON.parse(req.requestDetails);
                              draftData = p.bookingDraft || p;
                              parsedReason = p.reason || req.requestDetails;
                            } catch (e) {
                              parsedReason = req.requestDetails;
                            }
                          }

                          return (
                            <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                              {/* Booking ID */}
                              <td className="py-3 px-4 font-mono font-bold text-[12px] whitespace-nowrap">
                                {isCreateSlot ? (
                                  req.bookingCustomId ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">{req.bookingCustomId}</span>
                                  ) : (
                                    <span className="text-blue-600 dark:text-blue-400">[ขอ Slot ใหม่]</span>
                                  )
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    {req.bookingCustomId || (matchedB ? generateBookingCustomId(matchedB, calendarBookings) : req.bookingId.substring(0, 8))}
                                  </span>
                                )}
                              </td>

                              {/* Date & Room */}
                              <td className="py-3 px-4 min-w-[180px]">
                                {matchedB ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-normal text-[12px] text-slate-900 dark:text-white leading-tight">
                                      {formatThaiDate(matchedB.date)}
                                    </span>
                                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-normal">
                                      {matchedB.roomName}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                      เวลา: {matchedB.startTime} - {matchedB.endTime} น.
                                    </span>
                                    <span className="text-[11px] text-brand-600 dark:text-brand-400 font-normal">
                                      แบรนด์: {matchedB.brandName}
                                    </span>
                                  </div>
                                ) : draftData ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-normal text-[12px] text-slate-900 dark:text-white leading-tight">
                                      {formatThaiDate(draftData.date)}
                                    </span>
                                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-normal">
                                      {draftData.roomName}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                      เวลา: {draftData.startTime} - {draftData.endTime} น.
                                    </span>
                                    <span className="text-[11px] text-brand-600 dark:text-brand-400 font-normal">
                                      แบรนด์: {draftData.brandName}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">คิวจองถูกลบหรือยกเลิกแล้ว</span>
                                )}
                              </td>

                              {/* Requester */}
                              <td className="py-3 px-4 min-w-[140px] whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-normal text-[12px] text-slate-900 dark:text-slate-100">{req.requesterName}</span>
                                  <span className="text-[11px] text-slate-400">{req.requesterEmail}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {safeDateLocaleString(req.createdAt)}
                                  </span>
                                </div>
                              </td>

                              {/* Type */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                  req.requestType === 'create_slot'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/80'
                                    : req.requestType === 'cancel'
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/80'
                                      : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/80'
                                }`}>
                                  {req.requestType === 'create_slot'
                                    ? 'ขอ Slot เพิ่ม'
                                    : req.requestType === 'cancel'
                                      ? 'ขอยกเลิกคิว'
                                      : 'ขอแก้ไขข้อมูล'}
                                </span>
                              </td>

                              {/* Details */}
                              <td className="py-3 px-4 min-w-[200px] max-w-xs">
                                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11.5px] text-slate-700 dark:text-slate-300 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-line break-words">
                                  {parsedReason || req.requestDetails || '-'}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                {isPending && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                    รอพิจารณา
                                  </span>
                                )}
                                {isApproved && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    อนุมัติแล้ว
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                    ปฏิเสธ
                                  </span>
                                )}
                              </td>

                              {/* Handled By & Date */}
                              <td className="py-3 px-4 min-w-[140px] whitespace-nowrap">
                                {req.handledAt ? (
                                  <div className="flex flex-col gap-0.5 text-[12px]">
                                    <span className="font-normal text-slate-800 dark:text-slate-200">
                                      {req.handlerName || req.handlerEmail || 'ผู้ดูแล'}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      {safeDateLocaleString(req.handledAt)}
                                    </span>
                                    {req.handlerNote && (
                                      <span className="text-[11px] text-slate-500 italic mt-0.5">
                                        หมายเหตุ: {req.handlerNote}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">- ยังไม่ดำเนินการ -</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                {(() => {
                                  const canApprove = hasPerm('change-requests-edit');
                                  return (
                                    <button
                                      onClick={() => handleOpenReview(req)}
                                      title={isPending ? (canApprove ? 'พิจารณาคำขอแก้ไข' : 'ดูรายละเอียดคำขอ') : 'ดูรายละเอียดคำขอ'}
                                      className={`w-8 h-8 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center mx-auto hover:scale-105 active:scale-95 ${
                                        isPending && canApprove
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                      }`}
                                    >
                                      {isPending && canApprove ? (
                                        <FileEdit className="w-3.5 h-3.5" />
                                      ) : (
                                        <Eye className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  );
                                })()}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* Review & Action Modal */}
      {isReviewModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsReviewModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl z-10 animate-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {selectedReq.requestType === 'create_slot'
                    ? 'พิจารณาคำขอเปิด Slot ใหม่'
                    : (hasPerm('change-requests-edit') && selectedReq.status === 'Pending' ? 'พิจารณาคำขอ' : 'รายละเอียดคำขอ')
                  }: {selectedReq.bookingCustomId || (selectedReq.requestType === 'create_slot' ? 'ขอ Slot ใหม่' : selectedReq.bookingId.substring(0, 8))}
                </h3>
              </div>
              <button onClick={() => setIsReviewModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1">
              {/* Permission notice if user lacks edit permission */}
              {!hasPerm('change-requests-edit') && selectedReq.status === 'Pending' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>คุณไม่มีสิทธิ์ในการอนุมัติหรือปฏิเสธคำขอนี้ (สามารถดูรายละเอียดได้เท่านั้น)</span>
                </div>
              )}

              {/* Requester Info Box */}
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-indigo-900 dark:text-indigo-300">
                    ผู้ยื่นคำขอ: {selectedReq.requesterName} ({selectedReq.requesterEmail})
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {safeDateLocaleString(selectedReq.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {selectedReq.requestType === 'create_slot' ? 'เหตุผลและความจำเป็นในการขอเปิด Slot:' : 'รายละเอียด / สิ่งที่ขอแก้ไข:'}
                  </span>
                  <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 whitespace-pre-line">
                    {(() => {
                      if (selectedReq.requestType === 'create_slot') {
                        try {
                          const p = JSON.parse(selectedReq.requestDetails);
                          return p.reason || selectedReq.requestDetails || 'ไม่ได้ระบุ';
                        } catch (e) {}
                      }
                      return selectedReq.requestDetails || 'ไม่ได้ระบุ';
                    })()}
                  </p>
                </div>
              </div>

              {/* If Edit Mode or Create Slot Mode -> Editable Booking Fields */}
              {(selectedReq.requestType === 'edit' || selectedReq.requestType === 'create_slot') && (
                <div className="p-4 bg-slate-50/50 dark:bg-slate-850/30 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs block">
                      {selectedReq.requestType === 'create_slot'
                        ? 'ข้อมูล Slot ที่ขอเปิดเพิ่ม (ปรับปรุงก่อนกดอนุมัติ):'
                        : 'ปรับปรุงข้อมูลคิวจองจริง (จะถูกบันทึกทันทีเมื่อกดอนุมัติ):'}
                    </span>

                    {/* Room Availability Indicator */}
                    {reviewSlotConflict ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> ห้องไม่ว่าง (มีคิวชน)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> ห้องว่างพร้อมเปิดคิว
                      </span>
                    )}
                  </div>

                  {reviewSlotConflict && (
                    <div className="p-2.5 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{reviewSlotConflict}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">วันที่ไลฟ์</label>
                      <input
                        type="date"
                        disabled={!hasPerm('change-requests-edit') || selectedReq.status !== 'Pending'}
                        value={revDate}
                        onChange={(e) => setRevDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">ห้องสตูดิโอ</label>
                      <select
                        disabled={!hasPerm('change-requests-edit') || selectedReq.status !== 'Pending'}
                        value={revRoom}
                        onChange={(e) => setRevRoom(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {(allRoomsAdmin && allRoomsAdmin.length > 0 ? allRoomsAdmin : (rooms || [])).map(r => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">เวลาเริ่ม</label>
                      <select
                        disabled={!hasPerm('change-requests-edit') || selectedReq.status !== 'Pending'}
                        value={revStartTime}
                        onChange={(e) => setRevStartTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold font-mono text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {revStartTime && !reviewTimeSlotOptions.includes(revStartTime) && (
                          <option value={revStartTime}>{revStartTime} น.</option>
                        )}
                        {reviewTimeSlotOptions.map(slot => (
                          <option key={`rev-start-${slot}`} value={slot}>
                            {slot} น.
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">เวลาจบ</label>
                      <select
                        disabled={!hasPerm('change-requests-edit') || selectedReq.status !== 'Pending'}
                        value={revEndTime}
                        onChange={(e) => setRevEndTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold font-mono text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {revEndTime && !reviewTimeSlotOptions.includes(revEndTime) && (
                          <option value={revEndTime}>{revEndTime} น.</option>
                        )}
                        {reviewTimeSlotOptions.map(slot => (
                          <option key={`rev-end-${slot}`} value={slot}>
                            {slot} น.
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">แบรนด์สินค้า</label>
                      <select
                        disabled={!hasPerm('change-requests-edit') || selectedReq.status !== 'Pending'}
                        value={revBrand}
                        onChange={(e) => setRevBrand(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {(allBrandsAdmin && allBrandsAdmin.length > 0 ? allBrandsAdmin : (brands || [])).map(b => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">ชื่อแคมเปญ</label>
                      <input
                        type="text"
                        disabled={!hasPerm('change-requests-edit') || selectedReq.status !== 'Pending'}
                        value={revCampaign}
                        onChange={(e) => setRevCampaign(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">MC ประจำไลฟ์ (เลือกหลายท่านได้)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950">
                      {(mcList || []).map(m => {
                        const checked = revSelectedMcIds.includes(m.id);
                        return (
                          <label key={m.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!hasPerm('change-requests-edit') || selectedReq.status !== 'Pending'}
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRevSelectedMcIds([...revSelectedMcIds, m.id]);
                                } else {
                                  setRevSelectedMcIds(revSelectedMcIds.filter(id => id !== m.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-brand-600 disabled:opacity-60"
                            />
                            <span className="truncate">{m.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">บรีฟงาน (Brief / Script)</label>
                    <textarea
                      disabled={!hasPerm('change-requests-edit') || selectedReq.status !== 'Pending'}
                      value={revBriefText}
                      onChange={(e) => setRevBriefText(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {/* If Cancel Mode -> Alert */}
              {selectedReq.requestType === 'cancel' && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <span className="font-extrabold text-rose-900 dark:text-rose-300 block text-xs">คำขอนี้ต้องการยกเลิกคิวจอง</span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-400 block mt-0.5">
                      เมื่อกดอนุมัติ ระบบจะเปลี่ยนสถานะคิวจองเป็น "Cancelled" และคืนช่วงเวลาให้สตูดิโอว่าง
                    </span>
                  </div>
                </div>
              )}

              {/* Handler Note */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                  หมายเหตุจากผู้รับคำร้อง / ข้อความตอบกลับผู้ส่ง:
                </label>
                <input
                  type="text"
                  disabled={!hasPerm('change-requests-edit') || selectedReq.status !== 'Pending'}
                  placeholder="เช่น อัปเดตเวลาให้เรียบร้อยแล้ว หรือ ติดปัญหาเวลาชนกับแบรนด์อื่น"
                  value={reviewHandlerNote}
                  onChange={(e) => setReviewHandlerNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ปิด
              </button>

              {hasPerm('change-requests-edit') && selectedReq.status === 'Pending' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={revSubmitting}
                    onClick={handleOpenRejectModal}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 dark:text-rose-400 rounded-xl text-xs font-bold transition-all border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> ปฏิเสธคำขอ
                  </button>

                  <button
                    type="button"
                    disabled={revSubmitting || (selectedReq.requestType !== 'cancel' && !!reviewSlotConflict)}
                    onClick={() => handleResolveRequest('APPROVE')}
                    title={reviewSlotConflict ? `ไม่สามารถอนุมัติได้: ${reviewSlotConflict}` : ''}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {revSubmitting ? 'กำลังบันทึก...' : (selectedReq.requestType === 'create_slot' ? 'อนุมัติและสร้างคิวไลฟ์' : 'อัปเดตข้อมูล & อนุมัติคำขอ')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal Dialog */}
      {isRejectModalOpen && selectedReq && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setIsRejectModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200 flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    ระบุเหตุผลการปฏิเสธคำขอ
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    คิว: {selectedReq.bookingCustomId || selectedReq.bookingId.substring(0, 8)} ({selectedReq.requesterName})
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsRejectModalOpen(false)} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                  เลือกเหตุผลด่วน (Quick Choices):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'เวลาชนกับแบรนด์อื่น',
                    'ห้องสตูดิโอไม่ว่าง',
                    'ข้อมูลหรือเอกสารแนบไม่ครบถ้วน',
                    'เลยกำหนดเวลายกเลิกตามระเบียบ',
                    'ผู้ยื่นขอยกเลิกคำร้องเอง'
                  ].map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setRejectReason(reason)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-normal border transition-all cursor-pointer ${
                        rejectReason === reason
                          ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-medium'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                  ข้อความ / เหตุผลการปฏิเสธ:
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="พิมพ์เหตุผลหรือคำอธิบายเพื่อแจ้งให้ผู้ยื่นคำขอทราบ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all resize-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-all cursor-pointer"
              >
                ย้อนกลับ
              </button>

              <button
                type="button"
                disabled={revSubmitting}
                onClick={() => handleResolveRequest('REJECT', rejectReason)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                {revSubmitting ? 'กำลังบันทึก...' : 'ยืนยันปฏิเสธคำขอ'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MC Add/Edit Modal */}
      {isMcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsMcModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-5">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4.5 h-4.5 text-brand-500" />
                {editingMc ? 'แก้ไขข้อมูล MC' : 'เพิ่ม MC ใหม่'}
              </h3>
              <button onClick={() => setIsMcModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMc} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ชื่อ MC (MC Name)</label>
                <input
                  type="text"
                  placeholder="กรอกชื่อสำหรับแสดงผล"
                  value={mcName}
                  onChange={(e) => setMcName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ระดับ Tier (MC Tier)</label>
                <select
                  value={mcTierId}
                  onChange={(e) => setMcTierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                  required
                >
                  <option value="">-- เลือก Tier --</option>
                  {mcTiers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">สถานะการใช้งาน (Status)</label>
                <select
                  value={mcStatus}
                  onChange={(e) => setMcStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                >
                  <option value="Active">เปิดใช้งาน (Active)</option>
                  <option value="Inactive">ปิดใช้งาน (Inactive)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMcModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-[0.99] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tier Add/Edit Modal */}
      {isTierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsTierModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl z-10 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-5">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-slate-900 dark:text-white" />
                {editingTier ? 'แก้ไขระดับ Tier' : 'เพิ่ม Tier ใหม่'}
              </h3>
              <button onClick={() => setIsTierModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const sortOrderNum = parseInt(String(tierSortOrder).trim(), 10);
              const duplicateTier = !isNaN(sortOrderNum)
                ? mcTiers.find(t => t.id !== editingTier?.id && t.sortOrder === sortOrderNum)
                : undefined;
              const isDuplicate = Boolean(duplicateTier);

              return (
                <form onSubmit={handleSaveTier} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ชื่อ Tier</label>
                    <input
                      type="text"
                      placeholder="เช่น Tier S, Tier VIP"
                      value={tierName}
                      onChange={(e) => setTierName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ลำดับความสำคัญ (Priority)</label>
                        <div className="relative group cursor-help">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" />
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-2.5 bg-slate-900 text-white text-[11px] leading-relaxed rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-30">
                            <p className="font-bold text-amber-300 mb-0.5">💡 กฎลำดับความสำคัญ:</p>
                            <p>• <b>0</b> คือสำคัญที่สุด (จะแสดงเป็นอันดับแรกสุด)</p>
                            <p>• ลำดับถัดไปคือ 1, 2, 3...</p>
                            <p>• ลำดับ<b>ห้ามซ้ำกัน</b> เช่น 0, 1, 2, 3</p>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/50">
                        0 = สำคัญสุด
                      </span>
                    </div>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={tierSortOrder}
                      onChange={(e) => setTierSortOrder(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border ${
                        isDuplicate 
                          ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' 
                          : 'border-slate-200 dark:border-slate-800 focus:border-slate-900'
                      } bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all`}
                      required
                    />

                    {isDuplicate ? (
                      <p className="text-[11px] font-bold text-rose-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        ลำดับนี้ถูกใช้ไปแล้วโดย Tier "{duplicateTier?.name}" (ลำดับห้ามซ้ำกัน)
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 leading-normal">
                        * กำหนดตัวเลข 0, 1, 2... (0 คือสำคัญที่สุดและแสดงบนสุด ลำดับห้ามซ้ำกัน)
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsTierModalOpen(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || isDuplicate}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* Delete Blocked Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsBlockModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl z-10 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-4">
              <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-450 flex items-center gap-2">
                ⚠️ ไม่สามารถลบข้อมูล MC ท่านนี้ได้
              </h3>
              <button onClick={() => setIsBlockModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
                เนื่องจาก MC <strong className="text-slate-900 dark:text-white font-bold">"{blockedMcName}"</strong> มีคิวไลฟ์สดที่ยังไม่ได้ยกเลิกหรือกำลังจะเกิดขึ้นในระบบ จำนวน <strong className="text-rose-650 font-bold">{blockedBookings.length} คิว</strong>:
              </p>

              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-150 dark:divide-slate-800 text-[11px]">
                {blockedBookings.map((b) => (
                  <div key={b.id} className="p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-800 dark:text-slate-250">แบรนด์: {b.brandName}</span>
                      <span className="text-slate-450 dark:text-slate-450">
                        วันที่: {formatThaiDate(b.date)} | เวลา: {b.startTime} - {b.endTime} น.
                      </span>
                      <span className="text-[10px] text-slate-400">ห้องสตูดิโอ: {b.roomName}</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsBlockModalOpen(false);
                        setSelectedDate(b.date);
                        setHighlightedBookingId(b.id);
                        setCurrentTab('scheduler');
                      }}
                      className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-lg font-bold transition-all text-[10px] shrink-0 cursor-pointer"
                    >
                      ดูคิวไลฟ์
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Brand Action Blocked Modal (Live Lock Safety Check) */}
      {isBrandBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsBrandBlockModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl z-10 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-4">
              <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                {blockedBrandAction === 'delete' ? 'ไม่สามารถลบแบรนด์นี้ได้' : 'ไม่สามารถปิดการใช้งาน (Inactive) แบรนด์นี้ได้'}
              </h3>
              <button onClick={() => setIsBrandBlockModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
                เนื่องจากแบรนด์ <strong className="text-slate-900 dark:text-white font-bold">"{blockedBrandName}"</strong> กำลังมีการจัดรายการสด หรือมีคิวไลฟ์ที่จะถึงในระบบ จำนวน <strong className="text-rose-600 font-bold">{blockedBrandBookings.length} คิว</strong>:
              </p>

              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-150 dark:divide-slate-800 text-[11px]">
                {blockedBrandBookings.map((b) => {
                  const assignedMcName = b.mcId ? (mcList.find(m => m.id === b.mcId)?.name || '') : '';
                  return (
                    <div key={b.id} className="p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <span>{b.campaignName || 'ไลฟ์ประจำวัน'}</span>
                          <span className="text-[10px] font-normal text-slate-400">({b.id.substring(0, 8)})</span>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400">
                          วันที่: {formatThaiDate(b.date)} | เวลา: {b.startTime} - {b.endTime} น.
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ห้อง: {b.roomName} {assignedMcName ? `| MC: ${assignedMcName}` : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setIsBrandBlockModalOpen(false);
                          setSelectedDate(b.date);
                          setHighlightedBookingId(b.id);
                          setCurrentTab('scheduler');
                        }}
                        className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-lg font-bold transition-all text-[10px] shrink-0 cursor-pointer"
                      >
                        ดูคิวไลฟ์
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsBrandBlockModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  รับทราบ / ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Caregiver Assignment Modal */}
      {isQuickCaregiverModalOpen && quickCaregiverBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsQuickCaregiverModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    กำหนดผู้ดูแลแบรนด์
                  </h3>
                  <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
                    {quickCaregiverBrand.name}
                  </span>
                </div>
              </div>
              <button onClick={() => setIsQuickCaregiverModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Search */}
            <div className="mb-3 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ หรือ อีเมลผู้ใช้งาน..."
                  value={caregiverFilterSearch}
                  onChange={(e) => setCaregiverFilterSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* User List with Checkboxes */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-72 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-2 bg-slate-50/40 dark:bg-slate-950/30">
              {(allUsersAdmin || [])
                .filter(u => {
                  const q = caregiverFilterSearch.toLowerCase();
                  return !q || (u.name && u.name.toLowerCase().includes(q)) || u.email.toLowerCase().includes(q);
                })
                .map(u => {
                  const isChecked = quickCaregiverUsers.includes(u.email);
                  return (
                    <label
                      key={u.email}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-800 text-brand-950 dark:text-brand-200'
                          : 'hover:bg-white dark:hover:bg-slate-900 border border-transparent text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setQuickCaregiverUsers([...quickCaregiverUsers, u.email]);
                            } else {
                              setQuickCaregiverUsers(quickCaregiverUsers.filter(em => em !== u.email));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 cursor-pointer"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-xs font-bold text-slate-900 dark:text-white">{u.name || u.email.split('@')[0]}</span>
                          <span className="truncate text-[10px] text-slate-400 font-normal">{u.email}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {u.role}
                      </span>
                    </label>
                  );
                })}
              {(allUsersAdmin || []).filter(u => {
                const q = caregiverFilterSearch.toLowerCase();
                return !q || (u.name && u.name.toLowerCase().includes(q)) || u.email.toLowerCase().includes(q);
              }).length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">ไม่พบรายชื่อผู้ใช้งาน</div>
              )}
            </div>

            {/* Selected summary */}
            <div className="flex items-center justify-between mt-3 text-[11px] font-bold text-slate-500 shrink-0">
              <span>เลือก {quickCaregiverUsers.length} คน</span>
              {quickCaregiverUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuickCaregiverUsers([])}
                  className="text-rose-500 hover:text-rose-600 text-[10px] underline cursor-pointer"
                >
                  ล้างที่เลือกทั้งหมด
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0 mt-2">
              <button
                type="button"
                onClick={() => setIsQuickCaregiverModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveQuickCaregiver}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-600/20 cursor-pointer flex items-center gap-1.5"
              >
                {submitting ? 'กำลังบันทึก...' : 'บันทึกผู้ดูแล'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand Live Sessions Modal (When clicking Live status badge) */}
      {viewingBrandSessions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setViewingBrandSessions(null)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl z-10 animate-in zoom-in duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    รายการไลฟ์ของแบรนด์
                  </h3>
                  <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
                    {viewingBrandSessions.brandName} ({viewingBrandSessions.bookings.length} รายการ)
                  </span>
                </div>
              </div>
              <button onClick={() => setViewingBrandSessions(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bookings List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800/80">
              {viewingBrandSessions.bookings.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  ไม่มีคิวไลฟ์สดที่กำลังจัดหรือกำลังจะถึง
                </div>
              ) : (
                viewingBrandSessions.bookings.map(b => {
                  const assignedMcName = b.mcId ? (mcList.find(m => m.id === b.mcId)?.name || '') : '';
                  return (
                    <div key={b.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {b.campaignName || 'ไลฟ์สด'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {b.id.substring(0, 8)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>📅 {formatThaiDate(b.date)}</span>
                          <span>⏰ {b.startTime} - {b.endTime} น.</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          📍 ห้อง {b.roomName} {assignedMcName ? `| 🎙️ MC: ${assignedMcName}` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setViewingBrandSessions(null);
                          setSelectedDate(b.date);
                          setHighlightedBookingId(b.id);
                          setCurrentTab('scheduler');
                        }}
                        className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/30 dark:hover:bg-brand-900/50 text-brand-600 dark:text-brand-400 rounded-xl font-bold transition-all text-xs shrink-0 cursor-pointer"
                      >
                        ดูคิวไลฟ์
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0 mt-3">
              <button
                type="button"
                onClick={() => setViewingBrandSessions(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
