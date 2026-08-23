'use client';

import React, { useState, useMemo } from 'react';
import { useApp, Room, Brand, User, Role, AuditLog, BookingChangeRequest, Booking } from '@/context/AppContext';
import { formatThaiDate, getAutoStatus, generateBookingCustomId, parseTimeToMinutes } from '@/utils/time';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  Database, 
  Building, 
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
  Save
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

  // Fine-grained permission checker with backward compatibility fallbacks
  const hasPerm = (perm: string) => {
    if (currentUser?.permissions?.isAdmin || currentUser?.role === 'Master Admin') return true;
    if (allowedTabs.includes(perm)) return true;
    
    const prefix = perm.split('-')[0];
    const hasAnySubPerms = allowedTabs.some(t => t.startsWith(prefix + '-'));
    if (allowedTabs.includes(prefix) && !hasAnySubPerms) return true;
    
    return false;
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

  // Form states - BRANDS
  const [brandOldName, setBrandOldName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandStatus, setBrandStatus] = useState<'Active' | 'Inactive'>('Active');
  const [brandAssignedUsers, setBrandAssignedUsers] = useState<string[]>([]);
  const [isEditingBrand, setIsEditingBrand] = useState(false);

  // Form states - USERS
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('Viewer');
  const [userStatus, setUserStatus] = useState<'Active' | 'Inactive'>('Active');
  const [userPassword, setUserPassword] = useState('');
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Form states - ROLES
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleAllowedTabs, setRoleAllowedTabs] = useState<string[]>(['my-bookings', 'calendar', 'scheduler', 'campaign-schedule', 'analytics']);
  const [canCreateBooking, setCanCreateBooking] = useState(false);
  const [canEditBooking, setCanEditBooking] = useState(false);
  const [canCancelBooking, setCanCancelBooking] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);

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
  const [mcFilterTier, setMcFilterTier] = useState('');
  const [mcFilterStatus, setMcFilterStatus] = useState('');
  const [mcSort, setMcSort] = useState<'name-asc' | 'name-desc' | 'tier-asc' | 'tier-desc'>('name-asc');

  const [isMcModalOpen, setIsMcModalOpen] = useState(false);
  const [editingMc, setEditingMc] = useState<any | null>(null);
  const [mcName, setMcName] = useState('');
  const [mcTierId, setMcTierId] = useState('');
  const [mcStatus, setMcStatus] = useState<'Active' | 'Inactive'>('Active');

  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<any | null>(null);
  const [tierName, setTierName] = useState('');

  const [blockedBookings, setBlockedBookings] = useState<any[]>([]);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockedMcName, setBlockedMcName] = useState('');

  const resetMcForm = () => {
    setMcName('');
    setMcTierId(mcTiers[0]?.id || '');
    setMcStatus('Active');
    setEditingMc(null);
  };

  const resetTierForm = () => {
    setTierName('');
    setEditingTier(null);
  };

  // Reset all forms
  const resetRoomForm = () => {
    setRoomOldName('');
    setRoomName('');
    setRoomDesc('');
    setRoomStatus('Active');
    setIsEditingRoom(false);
  };

  const resetBrandForm = () => {
    setBrandOldName('');
    setBrandName('');
    setBrandStatus('Active');
    setBrandAssignedUsers([]);
    setIsEditingBrand(false);
  };

  const resetUserForm = () => {
    setUserEmail('');
    setUserName('');
    setUserRole('Viewer');
    setUserStatus('Active');
    setUserPassword('');
    setIsEditingUser(false);
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
  const [selectedReq, setSelectedReq] = useState<BookingChangeRequest | null>(null);
  const [reviewMatchedBooking, setReviewMatchedBooking] = useState<Booking | null>(null);
  const [reviewHandlerNote, setReviewHandlerNote] = useState('');
  
  // Review form fields for updating the booking
  const [revDate, setRevDate] = useState('');
  const [revStartTime, setRevStartTime] = useState('');
  const [revEndTime, setRevEndTime] = useState('');
  const [revRoom, setRevRoom] = useState('');
  const [revBrand, setRevBrand] = useState('');
  const [revCampaign, setRevCampaign] = useState('');
  const [revSelectedMcIds, setRevSelectedMcIds] = useState<string[]>([]);
  const [revBriefText, setRevBriefText] = useState('');
  const [revBriefLink, setRevBriefLink] = useState('');
  const [revRemark, setRevRemark] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);

  const handleOpenReview = (req: BookingChangeRequest) => {
    setSelectedReq(req);
    setReviewHandlerNote(req.handlerNote || '');
    
    // Find matched booking from calendarBookings
    const matched = calendarBookings.find(b => b.id === req.bookingId) || null;
    setReviewMatchedBooking(matched);
    
    if (matched) {
      setRevDate(matched.date);
      setRevStartTime(matched.startTime);
      setRevEndTime(matched.endTime);
      setRevRoom(matched.roomName);
      setRevBrand(matched.brandName);
      setRevCampaign(matched.campaignName);
      setRevSelectedMcIds(matched.mcId ? matched.mcId.split(',').map(x => x.trim()).filter(Boolean) : []);
      setRevBriefText(matched.briefText || '');
      setRevBriefLink(matched.briefLink || '');
      setRevRemark(matched.remark || '');
    }
    setIsReviewModalOpen(true);
  };

  const handleResolveRequest = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedReq) return;
    setRevSubmitting(true);
    
    let updatedBookingData: any = null;
    if (decision === 'APPROVE' && selectedReq.requestType === 'edit' && reviewMatchedBooking) {
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

    await apiCall('resolveChangeRequest', {
      requestId: selectedReq.id,
      decision,
      handlerNote: reviewHandlerNote,
      updatedBookingData
    }, (err, res) => {
      setRevSubmitting(false);
      if (err) {
        showToast(err, 'error');
      } else {
        showToast(decision === 'APPROVE' ? 'อนุมัติและอัปเดตข้อมูลคิวจองเรียบร้อยแล้ว' : 'ปฏิเสธคำขอเรียบร้อยแล้ว', 'success');
        setIsReviewModalOpen(false);
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

  // CRUD Handles - BRANDS
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingBrand ? !hasPerm('brands-edit') : !hasPerm('brands-create')) {
      return showToast(isEditingBrand
        ? "คุณไม่มีสิทธิ์แก้ไขแบรนด์ลูกค้า กรุณาขอสิทธิ์จาก Master Admin"
        : "คุณไม่มีสิทธิ์เพิ่มแบรนด์ลูกค้า กรุณาขอสิทธิ์จาก Master Admin", "error");
    }
    if (!brandName.trim()) return showToast("กรุณากรอกชื่อแบรนด์ก่อน", "warning");

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
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!hasPerm('brands-delete')) return showToast("คุณไม่มีสิทธิ์ลบแบรนด์ลูกค้า กรุณาขอสิทธิ์จาก Master Admin", "error");
    if (!window.confirm(`ปิดใช้งานแบรนด์ "${brand.name}" ใช่หรือไม่?\n\nระบบจะเปลี่ยนสถานะเป็น Inactive แทนการลบ เพื่อรักษาประวัติการจองในอดีตไว้`)) return;

    await apiCall('manageBrands', {
      subAction: 'UPDATE',
      payload: {
        oldName: brand.name,
        name: brand.name,
        description: brand.description || '',
        status: 'Inactive'
      }
    }, (err) => {
      if (err) showToast(`ปิดใช้งานแบรนด์ "${brand.name}" ไม่สำเร็จ: ${err}`, "error");
      else {
        showToast(`ปิดใช้งานแบรนด์ "${brand.name}" แล้ว — ประวัติคิวเดิมยังคงอยู่`, "success");
        refreshActiveTabData();
      }
    });
  };

  // CRUD Handles - MC LIVE MANAGEMENT
  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierName.trim()) return showToast("กรุณากรอกชื่อ Tier", "warning");

    setSubmitting(true);
    const subAction = editingTier ? 'UPDATE' : 'CREATE';
    const payload = editingTier 
      ? { id: editingTier.id, name: tierName.trim() }
      : { name: tierName.trim() };

    await apiCall('manageMcTiers', { subAction, payload }, (err) => {
      setSubmitting(false);
      if (err) {
        showToast(err, "error");
      } else {
        showToast(`${editingTier ? 'แก้ไข' : 'เพิ่ม'} Tier สำเร็จ`, "success");
        setTierName('');
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
    return allBrandsAdmin.filter(b => 
      b.name.toLowerCase().includes(adminSearchQuery.toLowerCase())
    );
  }, [allBrandsAdmin, adminSearchQuery]);

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
    { id: 'brands', name: 'แบรนด์ลูกค้า', icon: Building },
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
    <div className="flex-1 p-6 overflow-y-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
          {currentTab === 'change-requests' ? (
            <>
              <FileEdit className="w-5 h-5 text-indigo-500" />
              จัดการคำขอแก้ไขและยกเลิกคิวไลฟ์ (Booking Change Requests)
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 text-brand-500" />
              ระบบผู้ดูแลระบบ (Admin Management Dashboard)
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
            const showForm = canCreate || (isEditingRoom && canEdit);
            return (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Form card */}
                {showForm && (
                  <div className="xl:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
                      <Database className="w-4.5 h-4.5 text-brand-500" />
                      {isEditingRoom ? 'แก้ไขห้องสตูดิโอ' : 'เพิ่มห้องสตูดิโอใหม่'}
                    </h3>
                    
                    <form onSubmit={handleSaveRoom} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ชื่อห้องสตูดิโอ (Studio Name)</label>
                        <input
                          type="text"
                          placeholder="เช่น Room 01"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                          required
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

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 py-2.5 px-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                        {isEditingRoom && (
                          <button
                            type="button"
                            onClick={resetRoomForm}
                            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}

                {/* Table List card */}
                <div className={`${showForm ? 'xl:col-span-2' : 'xl:col-span-3'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-4`}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">รายชื่อห้องสตูดิโอทั้งหมด</h4>
                    
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
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                        {filteredRooms.map(room => (
                          <tr key={room.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors">
                            <td className="px-4 py-3.5 font-extrabold text-slate-900 dark:text-white">{room.name}</td>
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
              </div>
            );
          })()}

          {/* BRANDS SUBTAB */}
          {activeSubTab === 'brands' && (() => {
            const canCreate = hasPerm('brands-create');
            const canEdit = hasPerm('brands-edit');
            const canDelete = hasPerm('brands-delete');
            const showForm = canCreate || (isEditingBrand && canEdit);
            return (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Form card */}
                {showForm && (
                  <div className="xl:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
                      <Building className="w-4.5 h-4.5 text-brand-500" />
                      {isEditingBrand ? 'แก้ไขแบรนด์ลูกค้า' : 'เพิ่มแบรนด์ลูกค้าใหม่'}
                    </h3>
                    
                    <form onSubmit={handleSaveBrand} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ชื่อแบรนด์ลูกค้า (Brand Name)</label>
                        <input
                          type="text"
                          placeholder="เช่น Bau, 7.7, G-Shock"
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ผู้ดูแลแบรนด์ (Assigned Users)</label>
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/30 max-h-40 overflow-y-auto space-y-1.5">
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

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 py-2.5 px-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                        {isEditingBrand && (
                          <button
                            type="button"
                            onClick={resetBrandForm}
                            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}

                {/* Table List card */}
                <div className={`${showForm ? 'xl:col-span-2' : 'xl:col-span-3'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-4`}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">รายชื่อแบรนด์ลูกค้าทั้งหมด</h4>
                    
                    <div className="relative w-48 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="search"
                        placeholder="ค้นหาแบรนด์..."
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider select-none">
                          <th className="px-4 py-3.5 w-1/3">ชื่อแบรนด์ลูกค้า</th>
                          <th className="px-4 py-3.5 w-1/3">ผู้ดูแลแบรนด์</th>
                          <th className="px-4 py-3.5">สถานะคิวจอง</th>
                          {(canEdit || canDelete) && <th className="px-4 py-3.5 text-center">จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                        {filteredBrands.map(brand => {
                          const assignedList = brand.description && brand.description.startsWith('emails:')
                            ? brand.description.substring(7).split(',').filter(Boolean)
                            : [];
                          return (
                            <tr key={brand.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors">
                              <td className="px-4 py-3.5 font-extrabold text-slate-900 dark:text-white">{brand.name}</td>
                              <td className="px-4 py-3.5">
                                <div className="flex flex-wrap gap-1">
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
                              <td className="px-4 py-3.5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  brand.status === 'Active' 
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' 
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${brand.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  {brand.status === 'Active' ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              {(canEdit || canDelete) && (
                                <td className="px-4 py-3.5 flex items-center justify-center gap-1">
                                  {canEdit && (
                                    <button
                                      onClick={() => handleEditBrandSelect(brand)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-all cursor-pointer"
                                      title="แก้ไขแบรนด์"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteBrand(brand)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                      title="ลบแบรนด์"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        {filteredBrands.length === 0 && (
                          <tr>
                            <td colSpan={(canEdit || canDelete) ? 4 : 3} className="p-8 text-center text-slate-400 italic">ไม่มีข้อมูลแบรนด์ตรงตามเงื่อนไข</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* USERS SUBTAB */}
          {activeSubTab === 'users' && (() => {
            const canCreate = hasPerm('users-create');
            const canEdit = hasPerm('users-edit');
            const canDelete = hasPerm('users-delete');
            const showForm = canCreate || (isEditingUser && canEdit);
            return (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Form card */}
                {showForm && (
                  <div className="xl:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
                      <UserPlus className="w-4.5 h-4.5 text-brand-500" />
                      {isEditingUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานระบบใหม่'}
                    </h3>
                    
                    <form onSubmit={handleSaveUser} className="space-y-4">
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
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">รหัสผ่านบัญชี (Password)</label>
                        <input
                          type="text"
                          placeholder={isEditingUser ? 'กรอกเมื่อต้องการเปลี่ยนรหัสผ่านใหม่' : 'เช่น 123456'}
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                          required={!isEditingUser}
                        />
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

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 py-2.5 px-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                        {isEditingUser && (
                          <button
                            type="button"
                            onClick={resetUserForm}
                            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}

                {/* Table List card */}
                <div className={`${showForm ? 'xl:col-span-2' : 'xl:col-span-3'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-4`}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">รายชื่อผู้ใช้งานทั้งหมดในระบบ</h4>
                    
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
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                        {filteredUsers.map(user => (
                          <tr key={user.email} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors text-slate-700 dark:text-slate-350">
                            <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">{user.email}</td>
                            <td className="px-4 py-3.5 font-semibold">{user.name}</td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/50">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-500">{user.password || '******'}</td>
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
              </div>
            );
          })()}

          {/* ROLES SUBTAB */}
          {activeSubTab === 'roles' && (() => {
            const canCreate = hasPerm('roles-create');
            const canEdit = hasPerm('roles-edit');
            const canDelete = hasPerm('roles-delete');
            const showForm = canCreate || (isEditingRole && canEdit);
            return (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Form card */}
                {showForm && (
                  <div className="xl:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
                      <Layers className="w-4.5 h-4.5 text-brand-500" />
                      {isEditingRole ? 'แก้ไขระดับสิทธิ์' : 'เพิ่มระดับสิทธิ์ใหม่'}
                    </h3>
                    
                    <form onSubmit={handleSaveRole} className="space-y-4">
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
                            { label: '➕ จอง', state: canCreateBooking, set: setCanCreateBooking },
                            { label: '✎ แก้ไข', state: canEditBooking, set: setCanEditBooking },
                            { label: '✕ ยกเลิก', state: canCancelBooking, set: setCanCancelBooking },
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
                            { id: 'scheduler',        label: '📅 ตารางงาน' },
                            { id: 'calendar',         label: '🗓️ ปฏิทิน' },
                            { id: 'my-bookings',      label: '👤 คิวของฉัน' },
                            { id: 'campaign-schedule',label: '📁 แคมเปญ' },
                            { id: 'analytics',        label: '📊 สถิติ' },
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
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">⚙️ เมนูตั้งค่าระบบ</span>
                            
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
                              { id: 'rooms',            label: '🚪 ห้องสตูดิโอ' },
                              { id: 'brands',           label: '🏢 แบรนด์ลูกค้า' },
                              { id: 'mc-live',          label: '🎙️ การจัดการ MC' },
                              { id: 'change-requests',  label: '📋 คำขอแก้ไขคิว' },
                              { id: 'users',            label: '👥 ผู้ใช้งานระบบ' },
                              { id: 'roles-mgmt',       label: '🔑 ระดับสิทธิ์' },
                              { id: 'audit-log',        label: '📝 ประวัติกิจกรรม' },
                              { id: 'settings',         label: '⚙️ ตั้งค่าแจ้งเตือน' },
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
                            { icon: '🚪', label: 'ห้องสตูดิโอ', base: 'rooms' },
                            { icon: '🏢', label: 'แบรนด์', base: 'brands' },
                            { icon: '👥', label: 'ผู้ใช้งาน', base: 'users' },
                            { icon: '🔑', label: 'ระดับสิทธิ์', base: 'roles' },
                          ].map(({ icon, label, base }) => (
                            <div key={base} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/60 dark:bg-slate-850/40 border border-slate-200 dark:border-slate-800">
                              <span className="text-[11px] shrink-0 w-20 font-bold text-slate-600 dark:text-slate-300 truncate">{icon} {label}</span>
                              <div className="flex gap-1.5 flex-1">
                                {(['create','edit','delete'] as const).map(action => {
                                  const permId = `${base}-${action}`;
                                  const on = roleAllowedTabs.includes(permId);
                                  const colors: Record<string, string> = {
                                    create: on ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50',
                                    edit:   on ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300'   : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50',
                                    delete: on ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-700 dark:text-rose-300'       : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50',
                                  };
                                  const actionLabel: Record<string, string> = { create: '➕ สร้าง', edit: '✎ แก้ไข', delete: '🗑 ลบ' };
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
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 py-2.5 px-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                        {isEditingRole && (
                          <button
                            type="button"
                            onClick={resetRoleForm}
                            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}

                {/* Table List card */}
                <div className={`${showForm ? 'xl:col-span-2' : 'xl:col-span-3'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-4`}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">สิทธิ์ทั้งหมดในฐานข้อมูล</h4>
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
                                    'scheduler': { label: 'ตารางงาน', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300' },
                                    'calendar': { label: 'ปฏิทิน', color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-300' },
                                    'my-bookings': { label: 'คิวของฉัน', color: 'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-300' },
                                    'campaign-schedule': { label: 'แคมเปญ', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300' },
                                    'analytics': { label: 'สถิติ', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300' },
                                    'rooms': { label: 'ห้องไลฟ์', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300' },
                                    'brands': { label: 'แบรนด์', color: 'bg-pink-50 text-pink-700 dark:bg-pink-950/20 dark:text-pink-300' },
                                    'users': { label: 'ผู้ใช้งาน', color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-300' },
                                    'roles-mgmt': { label: 'จัดการสิทธิ์', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300' },
                                    'audit-log': { label: 'ประวัติระบบ', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350' },
                                    'settings': { label: 'ตั้งค่าระบบ', color: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/20 dark:text-fuchsia-350' },
                                    'mc-live': { label: 'MC ไลฟ์สด', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300' },
                                    'change-requests': { label: 'คำขอแก้ไข', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300' }
                                  };
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
                          <td className="px-4 py-3.5 font-bold text-brand-600 dark:text-brand-400">{log.target}</td>
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-sm max-w-2xl">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-brand-500" />
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
                    className="w-4.5 h-4.5 text-brand-600 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Line Messaging Channel Access Token</label>
                  <input
                    type="password"
                    placeholder="กรอก Messaging API channel access token ของไลน์บอท"
                    value={settingsLineToken}
                    onChange={(e) => setSettingsLineToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Line Target Destination ID (GroupID / UserID)</label>
                  <input
                    type="text"
                    placeholder="เช่น C1234567890abcdef... ของกลุ่มไลน์แชทเป้าหมาย"
                    value={settingsLineDestId}
                    onChange={(e) => setSettingsLineDestId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Frontend URL (ใช้สร้างลิงค์แนบไลน์)</label>
                  <input
                    type="url"
                    placeholder="เช่น https://th-booking.vercel.app"
                    value={settingsUrl}
                    onChange={(e) => setSettingsUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ช่องทางการไลฟ์สด (Live Channels)</label>
                  <input
                    type="text"
                    placeholder="เช่น Facebook,TikTok,Shopee,Lazada (คั่นด้วยเครื่องหมายจุลภาค ,)"
                    value={settingsLiveChannels}
                    onChange={(e) => setSettingsLiveChannels(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
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
                      className="w-28 px-3.5 py-2 text-xs font-extrabold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-brand-600 dark:text-brand-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
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
                    className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {submitting ? 'กำลังบันทึกการตั้งค่า...' : 'บันทึกการตั้งค่าระบบ'}
                  </button>
                </div>
              </form>
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
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
                  }`}
                >
                  รายชื่อ MC (MC List)
                </button>
                <button
                  onClick={() => setMcSubTab('tiers')}
                  className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    mcSubTab === 'tiers'
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-extrabold'
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
                          className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                        />
                      </div>

                      {/* Filter by Tier */}
                      <select
                        value={mcFilterTier}
                        onChange={(e) => setMcFilterTier(e.target.value)}
                        className="py-2 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                      >
                        <option value="">ทุกระดับ Tier</option>
                        {mcTiers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>

                      {/* Filter by Status */}
                      <select
                        value={mcFilterStatus}
                        onChange={(e) => setMcFilterStatus(e.target.value)}
                        className="py-2 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                      >
                        <option value="">ทุกสถานะ</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>

                      {/* Sort Options */}
                      <select
                        value={mcSort}
                        onChange={(e) => setMcSort(e.target.value as any)}
                        className="py-2 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                      >
                        <option value="name-asc">ชื่อ MC (ก-ฮ)</option>
                        <option value="name-desc">ชื่อ MC (ฮ-ก)</option>
                        <option value="tier-asc">Tier (สูง-ต่ำ)</option>
                      </select>
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
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                        {(() => {
                          let filtered = [...mcList];

                          if (mcSearch.trim()) {
                            const query = mcSearch.toLowerCase();
                            filtered = filtered.filter(mc => mc.name.toLowerCase().includes(query));
                          }

                          if (mcFilterTier) {
                            filtered = filtered.filter(mc => mc.tierId === mcFilterTier);
                          }

                          if (mcFilterStatus) {
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
                                <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
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
                                <td className="px-4 py-3.5 font-extrabold text-slate-900 dark:text-white">{mc.name}</td>
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
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer"
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
                            const order = ['S', 'A', 'B', 'C', 'D', 'E'];
                            const getLetter = (name: string) => {
                              const match = name.match(/Tier\s+([S A-Z]+)/i) || name.match(/([S A-Z]+)/i);
                              return match ? match[1].trim().toUpperCase() : name.toUpperCase();
                            };
                            const letA = getLetter(a.name);
                            const letB = getLetter(b.name);
                            const idxA = order.indexOf(letA);
                            const idxB = order.indexOf(letB);
                            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                            if (idxA !== -1) return -1;
                            if (idxB !== -1) return 1;
                            return a.name.localeCompare(b.name);
                          })
                          .map((tier) => {
                            const mcsUsing = mcList.filter(mc => mc.tierId === tier.id).length;
                          return (
                            <div key={tier.id} className="flex items-center justify-between p-4 hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-brand-500 shadow-sm shadow-brand-500/50" />
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-slate-800 dark:text-white text-xs">{tier.name}</span>
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
          {activeSubTab === 'change-requests' && (
            <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
              {/* Top KPI Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div 
                  onClick={() => setReqFilterStatus('ALL')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    reqFilterStatus === 'ALL'
                      ? 'bg-brand-50/80 dark:bg-brand-950/30 border-brand-300 dark:border-brand-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block">คำขอทั้งหมด</span>
                  <span className="text-xl font-black text-slate-800 dark:text-white">{(changeRequests || []).length}</span>
                </div>
                <div 
                  onClick={() => setReqFilterStatus('Pending')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    reqFilterStatus === 'Pending'
                      ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" /> รอพิจารณา
                  </span>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {(changeRequests || []).filter(r => r.status === 'Pending').length}
                  </span>
                </div>
                <div 
                  onClick={() => setReqFilterStatus('Approved')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    reqFilterStatus === 'Approved'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">อนุมัติแล้ว</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {(changeRequests || []).filter(r => r.status === 'Approved').length}
                  </span>
                </div>
                <div 
                  onClick={() => setReqFilterStatus('Rejected')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    reqFilterStatus === 'Rejected'
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">ปฏิเสธคำขอ</span>
                  <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                    {(changeRequests || []).filter(r => r.status === 'Rejected').length}
                  </span>
                </div>
              </div>

              {/* Filters & Actions bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหา ID คิว, ผู้ส่ง, รายละเอียด..."
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
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
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          reqFilterStatus === f.id
                            ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-slate-450 dark:text-slate-400 font-semibold">
                  แสดง {
                    (changeRequests || []).filter(r => {
                      if (reqFilterStatus !== 'ALL' && r.status !== reqFilterStatus) return false;
                      if (adminSearchQuery.trim()) {
                        const q = adminSearchQuery.toLowerCase();
                        return (r.bookingCustomId || '').toLowerCase().includes(q) ||
                               (r.requesterEmail || '').toLowerCase().includes(q) ||
                               (r.requesterName || '').toLowerCase().includes(q) ||
                               (r.requestDetails || '').toLowerCase().includes(q);
                      }
                      return true;
                    }).length
                  } รายการ
                </div>
              </div>

              {/* Table of Requests */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-[10px] uppercase font-bold text-slate-450 dark:text-slate-400 tracking-wider select-none">
                        <th className="py-3.5 px-4">ID คิวจอง (Booking ID)</th>
                        <th className="py-3.5 px-4">วันที่ & ห้องไลฟ์</th>
                        <th className="py-3.5 px-4">ผู้ส่งคำร้อง</th>
                        <th className="py-3.5 px-4">ประเภทคำขอ</th>
                        <th className="py-3.5 px-4">รายละเอียดที่ขอแก้ไข</th>
                        <th className="py-3.5 px-4">สถานะ</th>
                        <th className="py-3.5 px-4">ผู้ดำเนินการ & วันที่แก้ไข</th>
                        <th className="py-3.5 px-4 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                      {(() => {
                        const list = (changeRequests || []).filter(r => {
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

                        if (list.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500 font-semibold">
                                ไม่พบรายการคำขอแก้ไขคิวไลฟ์
                              </td>
                            </tr>
                          );
                        }

                        return list.map(req => {
                          const matchedB = calendarBookings.find(b => b.id === req.bookingId);
                          const isPending = req.status === 'Pending';
                          const isApproved = req.status === 'Approved';
                          const isRejected = req.status === 'Rejected';

                          return (
                            <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors">
                              {/* Booking ID */}
                              <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                                {req.bookingCustomId || (matchedB ? generateBookingCustomId(matchedB, calendarBookings) : req.bookingId.substring(0, 8))}
                              </td>

                              {/* Date & Room */}
                              <td className="py-3.5 px-4">
                                {matchedB ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      {formatThaiDate(matchedB.date)}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {matchedB.roomName} ({matchedB.startTime} - {matchedB.endTime} น.)
                                    </span>
                                    <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                                      แบรนด์: {matchedB.brandName}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">คิวจองถูกลบหรือยกเลิกแล้ว</span>
                                )}
                              </td>

                              {/* Requester */}
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{req.requesterName}</span>
                                  <span className="text-[10px] text-slate-400">{req.requesterEmail}</span>
                                  <span className="text-[9px] text-slate-450 dark:text-slate-500">
                                    {safeDateLocaleString(req.createdAt)}
                                  </span>
                                </div>
                              </td>

                              {/* Type */}
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  req.requestType === 'cancel'
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/60'
                                    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/60'
                                }`}>
                                  {req.requestType === 'cancel' ? '🗑️ ขอยกเลิกคิว' : '✏️ ขอแก้ไขข้อมูล'}
                                </span>
                              </td>

                              {/* Details */}
                              <td className="py-3.5 px-4 max-w-xs">
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 line-clamp-3">
                                  {req.requestDetails || '-'}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4">
                                {isPending && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                    รอพิจารณา
                                  </span>
                                )}
                                {isApproved && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    อนุมัติแล้ว
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                    <XCircle className="w-3 h-3 text-rose-500" />
                                    ปฏิเสธ
                                  </span>
                                )}
                              </td>

                              {/* Handled By & Date */}
                              <td className="py-3.5 px-4 text-[11px]">
                                {req.handledAt ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      {req.handlerName || req.handlerEmail || 'ผู้ดูแล'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {safeDateLocaleString(req.handledAt)}
                                    </span>
                                    {req.handlerNote && (
                                      <span className="text-[10px] text-slate-500 italic">
                                        หมายเหตุ: {req.handlerNote}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">- ยังไม่ดำเนินการ -</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => handleOpenReview(req)}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto ${
                                    isPending
                                      ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  {isPending ? 'พิจารณา' : 'ดูรายละเอียด'}
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
            </div>
          )}

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
                  พิจารณาคำขอ: {selectedReq.bookingCustomId || selectedReq.bookingId.substring(0, 8)}
                </h3>
              </div>
              <button onClick={() => setIsReviewModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1">
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">รายละเอียด / สิ่งที่ขอแก้ไข:</span>
                  <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                    {selectedReq.requestDetails || 'ไม่ได้ระบุ'}
                  </p>
                </div>
              </div>

              {/* If Edit Mode -> Editable Booking Fields */}
              {selectedReq.requestType === 'edit' && reviewMatchedBooking && (
                <div className="p-4 bg-slate-50/50 dark:bg-slate-850/30 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs block">
                    ✏️ ปรับปรุงข้อมูลคิวจองจริง (จะถูกบันทึกทันทีเมื่อกดอนุมัติ):
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">วันที่ไลฟ์</label>
                      <input
                        type="date"
                        value={revDate}
                        onChange={(e) => setRevDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">ห้องสตูดิโอ</label>
                      <select
                        value={revRoom}
                        onChange={(e) => setRevRoom(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
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
                      <input
                        type="text"
                        value={revStartTime}
                        onChange={(e) => setRevStartTime(e.target.value)}
                        placeholder="09:00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">เวลาจบ</label>
                      <input
                        type="text"
                        value={revEndTime}
                        onChange={(e) => setRevEndTime(e.target.value)}
                        placeholder="11:00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">แบรนด์สินค้า</label>
                      <select
                        value={revBrand}
                        onChange={(e) => setRevBrand(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
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
                        value={revCampaign}
                        onChange={(e) => setRevCampaign(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
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
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRevSelectedMcIds([...revSelectedMcIds, m.id]);
                                } else {
                                  setRevSelectedMcIds(revSelectedMcIds.filter(id => id !== m.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-brand-600"
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
                      value={revBriefText}
                      onChange={(e) => setRevBriefText(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
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
                  placeholder="เช่น อัปเดตเวลาให้เรียบร้อยแล้ว หรือ ติดปัญหาเวลาชนกับแบรนด์อื่น"
                  value={reviewHandlerNote}
                  onChange={(e) => setReviewHandlerNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={revSubmitting}
                  onClick={() => handleResolveRequest('REJECT')}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 dark:text-rose-400 rounded-xl text-xs font-bold transition-all border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> ปฏิเสธคำขอ
                </button>

                <button
                  type="button"
                  disabled={revSubmitting}
                  onClick={() => handleResolveRequest('APPROVE')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {revSubmitting ? 'กำลังบันทึก...' : 'อัปเดตข้อมูล & อนุมัติคำขอ'}
                </button>
              </div>
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
                  className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
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
                <Layers className="w-4.5 h-4.5 text-brand-500" />
                {editingTier ? 'แก้ไขระดับ Tier' : 'เพิ่ม Tier ใหม่'}
              </h3>
              <button onClick={() => setIsTierModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">ชื่อ Tier</label>
                <input
                  type="text"
                  placeholder="เช่น Tier S, Tier VIP"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                  required
                />
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
                  disabled={submitting}
                  className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
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
    </div>
  );
}
