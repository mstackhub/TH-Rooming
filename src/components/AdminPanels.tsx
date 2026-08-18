'use client';

import React, { useState, useMemo } from 'react';
import { useApp, Room, Brand, User, Role, AuditLog } from '@/context/AppContext';
import { formatThaiDate, getAutoStatus } from '@/utils/time';
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
  Clock
} from 'lucide-react';

type SubTab = 'rooms' | 'brands' | 'users' | 'roles' | 'logs' | 'settings' | 'mc-live';

export default function AdminPanels() {
  const {
    allRoomsAdmin,
    allBrandsAdmin,
    allUsersAdmin,
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
    if (currentTab === 'users') return 'users';
    if (currentTab === 'roles-mgmt') return 'roles';
    if (currentTab === 'audit-log') return 'logs';
    if (currentTab === 'settings') return 'settings';
    
    // Fallback based on permissions
    if (allowedTabs.includes('rooms')) return 'rooms';
    if (allowedTabs.includes('brands')) return 'brands';
    if (allowedTabs.includes('mc-live')) return 'mc-live';
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
        frontendUrl: settingsUrl
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
          <Shield className="w-5 h-5 text-brand-500" />
          ระบบผู้ดูแลระบบ (Admin Management Dashboard)
        </h2>
        <p className="text-xs text-slate-400 mt-1">ตั้งค่าสตูดิโอ แบรนด์ผู้ใช้ สิทธิ์เข้าถึง ตรวจสอบประวัติกิจกรรม และเชื่อมการแจ้งเตือน</p>
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
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
                      <Database className="w-4.5 h-4.5 text-brand-500" />
                      {isEditingRoom ? 'แก้ไขห้องสตูดิโอ' : 'เพิ่มห้องสตูดิโอใหม่'}
                    </h3>
                    
                    <form onSubmit={handleSaveRoom} className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ชื่อห้องสตูดิโอ (Studio Name)</label>
                        <input
                          type="text"
                          placeholder="เช่น Room 01"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          className="w-full text-xs font-semibold"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">คำอธิบายเพิ่มเติม (Description)</label>
                        <textarea
                          placeholder="เช่น รายละเอียดสเปค ขนาดห้อง หรือกล้องที่ใช้"
                          value={roomDesc}
                          onChange={(e) => setRoomDesc(e.target.value)}
                          className="w-full text-xs"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">สถานะการใช้งาน (Status)</label>
                        <select
                          value={roomStatus}
                          onChange={(e) => setRoomStatus(e.target.value as any)}
                          className="w-full text-xs font-semibold"
                        >
                          <option value="Active">เปิดใช้งาน (Active)</option>
                          <option value="Inactive">ปิดชั่วคราว (Inactive)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer"
                        >
                          {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                        {isEditingRoom && (
                          <button
                            type="button"
                            onClick={resetRoomForm}
                            className="py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
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
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200">รายชื่อห้องสตูดิโอทั้งหมด</h4>
                    
                    <div className="relative w-48 sm:w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="search"
                        placeholder="ค้นหาห้อง..."
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-850 rounded-xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-850 text-slate-400 font-bold">
                          <th className="p-3">ชื่อสตูดิโอ</th>
                          <th className="p-3">คำอธิบายรายละเอียด</th>
                          <th className="p-3">สถานะ</th>
                          {(canEdit || canDelete) && <th className="p-3 text-center">จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {filteredRooms.map(room => (
                          <tr key={room.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                            <td className="p-3 font-extrabold text-slate-900 dark:text-white">{room.name}</td>
                            <td className="p-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={room.description}>
                              {room.description || '-'}
                            </td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold border ${
                                room.status === 'Active' 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-350 border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-350 border-rose-200'
                              }`}>
                                {room.status}
                              </span>
                            </td>
                            {(canEdit || canDelete) && (
                              <td className="p-3 flex items-center justify-center gap-1.5">
                                {canEdit && (
                                  <button
                                    onClick={() => handleEditRoomSelect(room)}
                                    className="p-1.5 bg-slate-50 hover:bg-slate-150 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded transition-all cursor-pointer"
                                    title="แก้ไขห้อง"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteRoom(room)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition-all cursor-pointer"
                                    title="ลบห้อง"
                                  >
                                    <Trash2 className="w-3 h-3" />
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
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
                      <Building className="w-4.5 h-4.5 text-brand-500" />
                      {isEditingBrand ? 'แก้ไขแบรนด์ลูกค้า' : 'เพิ่มแบรนด์ลูกค้าใหม่'}
                    </h3>
                    
                    <form onSubmit={handleSaveBrand} className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ชื่อแบรนด์ลูกค้า (Brand Name)</label>
                        <input
                          type="text"
                          placeholder="เช่น Bau, 7.7, G-Shock"
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          className="w-full text-xs font-semibold"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ผู้ดูแลแบรนด์ (Assigned Users)</label>
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/30 max-h-36 overflow-y-auto space-y-1">
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
                                className={`w-full flex items-center justify-between p-1.5 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer ${
                                  isAssigned
                                    ? 'bg-brand-50 dark:bg-brand-950/20 border-brand-300 text-brand-700 dark:text-brand-300'
                                    : 'bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                <span>{u.name} ({u.email})</span>
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  readOnly
                                  className="w-3 h-3 text-brand-600 rounded pointer-events-none"
                                />
                              </button>
                            );
                          })}
                          {allUsersAdmin.length === 0 && (
                            <span className="text-[10px] text-slate-400 italic block p-1">ไม่มีข้อมูลผู้ดูแลในระบบ</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">สถานะเปิดรับจอง (Status)</label>
                        <select
                          value={brandStatus}
                          onChange={(e) => setBrandStatus(e.target.value as any)}
                          className="w-full text-xs font-semibold"
                        >
                          <option value="Active">เปิดจองปกติ (Active)</option>
                          <option value="Inactive">ระงับชั่วคราว (Inactive)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer"
                        >
                          {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                        {isEditingBrand && (
                          <button
                            type="button"
                            onClick={resetBrandForm}
                            className="py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
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
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200">รายชื่อแบรนด์ลูกค้าทั้งหมด</h4>
                    
                    <div className="relative w-48 sm:w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="search"
                        placeholder="ค้นหาแบรนด์..."
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-850 rounded-xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-850 text-slate-400 font-bold">
                          <th className="p-3 w-1/3">ชื่อแบรนด์ลูกค้า</th>
                          <th className="p-3 w-1/3">ผู้ดูแลแบรนด์</th>
                          <th className="p-3">สถานะคิวจอง</th>
                          {(canEdit || canDelete) && <th className="p-3 text-center">จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {filteredBrands.map(brand => {
                          const assignedList = brand.description && brand.description.startsWith('emails:')
                            ? brand.description.substring(7).split(',').filter(Boolean)
                            : [];
                          return (
                            <tr key={brand.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              <td className="p-3 font-extrabold text-slate-900 dark:text-white">{brand.name}</td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {assignedList
                                    .filter(email => allUsersAdmin.some(u => u.email === email))
                                    .map(email => {
                                      const matchedUser = allUsersAdmin.find(u => u.email === email);
                                      return (
                                        <span key={email} className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 text-[9px] border border-slate-200 dark:border-slate-700">
                                          {matchedUser ? matchedUser.name : email}
                                        </span>
                                      );
                                    })}
                                  {assignedList.filter(email => allUsersAdmin.some(u => u.email === email)).length === 0 && (
                                    <span className="text-[10px] text-slate-400 italic font-normal">ทุกคนสามารถเข้าถึงได้</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold border ${
                                  brand.status === 'Active' 
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-350 border-emerald-200' 
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-350 border-rose-200'
                                }`}>
                                  {brand.status}
                                </span>
                              </td>
                              {(canEdit || canDelete) && (
                                <td className="p-3 flex items-center justify-center gap-1.5">
                                  {canEdit && (
                                    <button
                                      onClick={() => handleEditBrandSelect(brand)}
                                      className="p-1.5 bg-slate-50 hover:bg-slate-150 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded transition-all cursor-pointer"
                                      title="แก้ไขแบรนด์"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteBrand(brand)}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition-all cursor-pointer"
                                      title="ลบแบรนด์"
                                    >
                                      <Trash2 className="w-3 h-3" />
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
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
                      <UserPlus className="w-4.5 h-4.5 text-brand-500" />
                      {isEditingUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานระบบใหม่'}
                    </h3>
                    
                    <form onSubmit={handleSaveUser} className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">อีเมล / บัญชี (User Account Email)</label>
                        <input
                          type="text"
                          placeholder="เช่น admin, creator1@th.co.th"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          disabled={isEditingUser}
                          className="w-full text-xs font-semibold disabled:opacity-50"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ชื่อผู้ใช้ระบบ (Full Name)</label>
                        <input
                          type="text"
                          placeholder="เช่น สมชาย มีความสุข"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="w-full text-xs font-semibold"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">สิทธิ์เข้าถึง (Role Name)</label>
                        <select
                          value={userRole}
                          onChange={(e) => setUserRole(e.target.value)}
                          className="w-full text-xs font-semibold"
                        >
                          {roles.map(r => (
                            <option key={r.roleName} value={r.roleName}>{r.roleName}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">รหัสผ่านบัญชี (Password)</label>
                        <input
                          type="text"
                          placeholder={isEditingUser ? 'กรอกเมื่อต้องการเปลี่ยนรหัสผ่านใหม่' : 'เช่น 123456'}
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          className="w-full text-xs font-semibold"
                          required={!isEditingUser}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">สถานะการใช้งาน (Status)</label>
                        <select
                          value={userStatus}
                          onChange={(e) => setUserStatus(e.target.value as any)}
                          className="w-full text-xs font-semibold"
                        >
                          <option value="Active">ใช้งานปกติ (Active)</option>
                          <option value="Inactive">บล็อกผู้ใช้ (Inactive)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer"
                        >
                          {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                        {isEditingUser && (
                          <button
                            type="button"
                            onClick={resetUserForm}
                            className="py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
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
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200">รายชื่อผู้ใช้งานทั้งหมดในระบบ</h4>
                    
                    <div className="relative w-48 sm:w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="search"
                        placeholder="ค้นหาชื่อ / อีเมล..."
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-850 rounded-xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-850 text-slate-400 font-bold">
                          <th className="p-3">บัญชีผู้ใช้ (Email)</th>
                          <th className="p-3">ชื่อ-นามสกุล</th>
                          <th className="p-3">ระดับสิทธิ์</th>
                          <th className="p-3">รหัสผ่าน</th>
                          <th className="p-3">สถานะ</th>
                          {(canEdit || canDelete) && <th className="p-3 text-center">จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {filteredUsers.map(user => (
                          <tr key={user.email} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-slate-700 dark:text-slate-350">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{user.email}</td>
                            <td className="p-3 font-semibold">{user.name}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/50">
                                {user.role}
                              </span>
                            </td>
                            <td className="p-3 font-mono">{user.password || '******'}</td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold border ${
                                user.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-350 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-350 border-rose-200'
                              }`}>
                                {user.status}
                              </span>
                            </td>
                            {(canEdit || canDelete) && (
                              <td className="p-3 flex items-center justify-center gap-1.5">
                                {canEdit && (
                                  <button
                                    onClick={() => handleEditUserSelect(user)}
                                    className="p-1.5 bg-slate-50 hover:bg-slate-150 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded transition-all cursor-pointer"
                                    title="แก้ไขผู้ใช้"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteUser(user)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition-all cursor-pointer"
                                    title="ลบผู้ใช้"
                                  >
                                    <Trash2 className="w-3 h-3" />
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
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
                      <Layers className="w-4.5 h-4.5 text-brand-500" />
                      {isEditingRole ? 'แก้ไขระดับสิทธิ์' : 'เพิ่มระดับสิทธิ์ใหม่'}
                    </h3>
                    
                    <form onSubmit={handleSaveRole} className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ชื่อบทบาทระดับสิทธิ์ (Role Name)</label>
                        <input
                          type="text"
                          placeholder="เช่น Graphic Designer"
                          value={roleName}
                          onChange={(e) => setRoleName(e.target.value)}
                          disabled={isEditingRole}
                          className="w-full text-xs font-semibold disabled:opacity-50"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">คำอธิบายสิทธิ์ (Description)</label>
                        <input
                          type="text"
                          placeholder="เช่น สิทธิ์สำหรับเข้ามาแปะลิงค์ของทีมดีไซเนอร์"
                          value={roleDesc}
                          onChange={(e) => setRoleDesc(e.target.value)}
                          className="w-full text-xs font-semibold"
                        />
                      </div>

                      {/* Booking Operations — 3-col pill toggle */}
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">สิทธิ์คิวไลฟ์สด</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { label: '➕ จอง', state: canCreateBooking, set: setCanCreateBooking },
                            { label: '✎ แก้ไข', state: canEditBooking, set: setCanEditBooking },
                            { label: '✕ ยกเลิก', state: canCancelBooking, set: setCanCancelBooking },
                          ].map(({ label, state, set }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => set(!state)}
                              className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer text-center ${
                                state
                                  ? 'bg-brand-500 border-brand-500 text-white shadow-sm shadow-brand-500/30'
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
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
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">เมนูที่มองเห็น</p>
                          <span className="text-[9px] text-brand-500 font-bold">
                            {roleAllowedTabs.filter(t => [
                              'scheduler','calendar','my-bookings','campaign-schedule','analytics',
                              'rooms','brands','users','roles-mgmt','audit-log','settings'
                            ].includes(t)).length} / 11
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
                                className={`flex items-center gap-2 p-1.5 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer text-left truncate ${
                                  on
                                    ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={on}
                                  readOnly
                                  className="w-3.5 h-3.5 rounded border-slate-350 dark:border-slate-700 text-brand-650 pointer-events-none"
                                />
                                <span className="truncate">{tab.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Settings Sub-menus Group */}
                        <div className="mt-3 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-1.5">
                            <span className="text-[10px] font-bold text-slate-550 dark:text-slate-400">⚙️ เมนูตั้งค่าระบบ</span>
                            
                            {/* ALL Checkbox Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                const settingsSubtabs = ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings'];
                                const allChecked = settingsSubtabs.every(id => roleAllowedTabs.includes(id));
                                if (allChecked) {
                                  // remove all settings subtabs
                                  setRoleAllowedTabs(prev => prev.filter(t => !settingsSubtabs.includes(t)));
                                } else {
                                  // add missing settings subtabs
                                  setRoleAllowedTabs(prev => {
                                    const base = prev.filter(t => !settingsSubtabs.includes(t));
                                    return [...base, ...settingsSubtabs];
                                  });
                                }
                              }}
                              className="flex items-center gap-1 text-[9px] font-extrabold text-brand-600 dark:text-brand-400 hover:opacity-80 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings'].every(id => roleAllowedTabs.includes(id))}
                                readOnly
                                className="w-3 h-3 rounded border-slate-350 dark:border-slate-700 text-brand-650 pointer-events-none"
                              />
                              ตั้งค่า (All)
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'rooms',            label: '🚪 ห้องสตูดิโอ' },
                              { id: 'brands',           label: '🏢 แบรนด์ลูกค้า' },
                              { id: 'users',            label: '👥 ผู้ใช้งานระบบ' },
                              { id: 'roles-mgmt',       label: '🔑 ระดับสิทธิ์การจอง' },
                              { id: 'audit-log',        label: '📝 ประวัติกิจกรรม' },
                              { id: 'settings',         label: '⚙️ ตั้งค่าการแจ้งเตือน' },
                            ].map(tab => {
                              const on = roleAllowedTabs.includes(tab.id);
                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => handleCheckboxTabToggle(tab.id)}
                                  className={`flex items-center gap-2 p-1.5 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer text-left truncate ${
                                    on
                                      ? 'bg-brand-50/40 dark:bg-brand-950/20 border-brand-300 dark:border-brand-850 text-brand-700 dark:text-brand-300'
                                      : 'bg-white dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-550'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={on}
                                    readOnly
                                    className="w-3.5 h-3.5 rounded border-slate-350 dark:border-slate-700 text-brand-650 pointer-events-none"
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
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">สิทธิ์จัดการข้อมูล</p>
                        <div className="space-y-1.5">
                          {[
                            { icon: '🚪', label: 'ห้องสตูดิโอ', base: 'rooms' },
                            { icon: '🏢', label: 'แบรนด์', base: 'brands' },
                            { icon: '👥', label: 'ผู้ใช้งาน', base: 'users' },
                            { icon: '🔑', label: 'ระดับสิทธิ์', base: 'roles' },
                          ].map(({ icon, label, base }) => (
                            <div key={base} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/60 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800">
                              <span className="text-[11px] shrink-0 w-20 font-semibold text-slate-600 dark:text-slate-300 truncate">{icon} {label}</span>
                              <div className="flex gap-1 flex-1">
                                {(['create','edit','delete'] as const).map(action => {
                                  const permId = `${base}-${action}`;
                                  const on = roleAllowedTabs.includes(permId);
                                  const colors: Record<string, string> = {
                                    create: on ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-300' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400',
                                    edit:   on ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-300'   : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400',
                                    delete: on ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/30 dark:border-rose-700 dark:text-rose-300'       : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400',
                                  };
                                  const actionLabel: Record<string, string> = { create: '➕ สร้าง', edit: '✎ แก้ไข', delete: '🗑 ลบ' };
                                  return (
                                    <button
                                      key={action}
                                      type="button"
                                      onClick={() => handleCheckboxTabToggle(permId)}
                                      className={`flex-1 py-1 rounded-md border text-[9px] font-bold transition-all cursor-pointer text-center ${colors[action]}`}
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
                          className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer"
                        >
                          {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                        {isEditingRole && (
                          <button
                            type="button"
                            onClick={resetRoleForm}
                            className="py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
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
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200">สิทธิ์ทั้งหมดในฐานข้อมูล</h4>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-850 rounded-xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-850 text-slate-400 font-bold">
                          <th className="p-3">ระดับสิทธิ์</th>
                          <th className="p-3">สิทธิ์อนุญาตการใช้งาน</th>
                          <th className="p-3">การมองเห็นแถบ</th>
                          {(canEdit || canDelete) && <th className="p-3 text-center">จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {roles.map(role => (
                          <tr key={role.roleName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-slate-700 dark:text-slate-350">
                            <td className="p-3 font-extrabold text-slate-900 dark:text-white">
                              {role.roleName}
                              <span className="block text-[9px] font-normal text-slate-400 mt-0.5">{role.description}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {role.canCreateBooking ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-250/20">
                                    + จองคิว
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-600 border border-slate-200/30">
                                    - จองคิว
                                  </span>
                                )}
                                {role.canEditBooking ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-250/20">
                                    ✎ แก้ไข
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-600 border border-slate-200/30">
                                    - แก้ไข
                                  </span>
                                )}
                                {role.canCancelBooking ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450 border border-rose-250/20">
                                    🗙 ยกเลิก
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-600 border border-slate-200/30">
                                    - ยกเลิก
                                  </span>
                                )}
                                {role.isAdmin ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-250/20">
                                    🛡️ Admin
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-3">
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
                                    'settings': { label: 'ตั้งค่าระบบ', color: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/20 dark:text-fuchsia-350' }
                                  };
                                  const matched = tabMap[tabId.trim()] || { label: tabId, color: 'bg-slate-50 text-slate-650' };
                                  return (
                                    <span key={tabId} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold border border-current/10 ${matched.color}`}>
                                      {matched.label}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            {(canEdit || canDelete) && (
                              <td className="p-3 flex items-center justify-center gap-1.5">
                                {canEdit && (
                                  <button
                                    onClick={() => handleEditRoleSelect(role)}
                                    className="p-1.5 bg-slate-50 hover:bg-slate-150 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded transition-all cursor-pointer"
                                    title="แก้ไขสิทธิ์"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteRole(role)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition-all cursor-pointer"
                                    title="ลบสิทธิ์"
                                  >
                                    <Trash2 className="w-3 h-3" />
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 text-xs">
                <h4 className="font-extrabold text-slate-850 dark:text-slate-200">ประวัติกิจกรรมการทำรายการในระบบ (Audit Log Trail)</h4>
                
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="search"
                    placeholder="ค้นหาชื่อผู้ใช้ / คำค้น..."
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-transparent"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-850 rounded-xl max-h-[500px]">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-850 text-slate-400 font-bold select-none sticky top-0 z-10">
                      <th className="p-3">วัน-เวลา</th>
                      <th className="p-3">ผู้ดำเนินการ</th>
                      <th className="p-3">กิจกรรม</th>
                      <th className="p-3">เป้าหมาย (Target)</th>
                      <th className="p-3">รายละเอียด (Details)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
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
                        <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-slate-700 dark:text-slate-350">
                          <td className="p-3 whitespace-nowrap text-slate-550 dark:text-slate-400">
                            {new Date(log.timestamp).toLocaleString('th-TH')}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {log.userName}
                            <span className="block text-[9px] font-normal text-slate-400">{log.userEmail}</span>
                          </td>
                          <td className="p-3">
                            <span className="px-1.5 py-0.5 rounded font-extrabold text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-brand-600 dark:text-brand-400">{log.target}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400 leading-normal" title={log.details}>
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm max-w-2xl">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex items-center gap-1.5">
                <Bell className="w-4.5 h-4.5 text-brand-500" />
                การแจ้งเตือนและการเชื่อมต่อ API
              </h3>
              
              <form onSubmit={handleSaveSettings} className="space-y-5">
                {/* Notification Enabled toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-250">เปิดใช้งาน Line Notification</span>
                    <span className="text-[10px] text-slate-400">ส่งการแจ้งเตือนไปยังกลุ่มไลน์เมื่อมีการจอง แก้ไข หรือยกเลิกคิวไลฟ์สด</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsLineEnabled}
                    onChange={(e) => setSettingsLineEnabled(e.target.checked)}
                    className="w-5 h-5 text-brand-600 rounded border-slate-350 dark:border-slate-700 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wide">Line Messaging Channel Access Token</label>
                  <input
                    type="password"
                    placeholder="กรอก Messaging API channel access token ของไลน์บอท"
                    value={settingsLineToken}
                    onChange={(e) => setSettingsLineToken(e.target.value)}
                    className="w-full text-xs font-semibold font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wide">Line Target Destination ID (GroupID / UserID)</label>
                  <input
                    type="text"
                    placeholder="เช่น C1234567890abcdef... ของกลุ่มไลน์แชทเป้าหมาย"
                    value={settingsLineDestId}
                    onChange={(e) => setSettingsLineDestId(e.target.value)}
                    className="w-full text-xs font-semibold font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-460 dark:text-slate-400 uppercase tracking-wide">Frontend URL (ใช้สร้างลิงค์แนบไลน์)</label>
                  <input
                    type="url"
                    placeholder="เช่น https://th-booking.vercel.app"
                    value={settingsUrl}
                    onChange={(e) => setSettingsUrl(e.target.value)}
                    className="w-full text-xs font-semibold"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer"
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
                  className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
                    mcSubTab === 'list'
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
                  }`}
                >
                  รายชื่อ MC (MC List)
                </button>
                <button
                  onClick={() => setMcSubTab('tiers')}
                  className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
                    mcSubTab === 'tiers'
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
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
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-250/60 dark:border-slate-800/80 rounded-2xl">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อ MC..."
                          value={mcSearch}
                          onChange={(e) => setMcSearch(e.target.value)}
                          className="w-48 pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900"
                        />
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>

                      {/* Filter by Tier */}
                      <select
                        value={mcFilterTier}
                        onChange={(e) => setMcFilterTier(e.target.value)}
                        className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900"
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
                        className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900"
                      >
                        <option value="">ทุกสถานะ</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>

                      {/* Sort Options */}
                      <select
                        value={mcSort}
                        onChange={(e) => setMcSort(e.target.value as any)}
                        className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900"
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
                      className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/25 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่ม MC ใหม่
                    </button>
                  </div>

                  {/* MC List Table */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                          <th className="p-4 font-bold">ชื่อ MC</th>
                          <th className="p-4 font-bold">ระดับ Tier</th>
                          <th className="p-4 font-bold">จำนวนคิวไลฟ์สด</th>
                          <th className="p-4 font-bold">สถานะ</th>
                          <th className="p-4 font-bold text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
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
                              <tr key={mc.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/10">
                                <td className="p-4 font-bold text-slate-900 dark:text-white">{mc.name}</td>
                                <td className="p-4">
                                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold text-[10px] text-slate-700 dark:text-slate-350">
                                    {tier ? tier.name : 'ไม่ระบุ'}
                                  </span>
                                </td>
                                <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{count} คิว</td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    mc.status === 'Active'
                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                                  }`}>
                                    {mc.status === 'Active' ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditingMc(mc);
                                        setMcName(mc.name);
                                        setMcTierId(mc.tierId);
                                        setMcStatus(mc.status);
                                        setIsMcModalOpen(true);
                                      }}
                                      title="แก้ไขข้อมูล MC"
                                      className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-lg transition-all cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMc(mc)}
                                      title="ลบ MC"
                                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
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
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-250/60 dark:border-slate-800/80 rounded-2xl">
                    <span className="text-xs font-semibold text-slate-500">ลำดับของ Tiers จะส่งผลต่อการเรียงลำดับ MC ในตัวเลือกหน้าฟอร์ม</span>
                    <button
                      onClick={() => {
                        resetTierForm();
                        setIsTierModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/25 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่ม Tier ใหม่
                    </button>
                  </div>

                  {/* Tier lists */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {mcTiers.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium text-xs">
                          ยังไม่มีข้อมูลระดับ Tier ในระบบ
                        </div>
                      ) : (
                        mcTiers.map((tier, idx) => {
                          const mcsUsing = mcList.filter(mc => mc.tierId === tier.id).length;
                          return (
                            <div key={tier.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                              <div className="flex items-center gap-3">
                                {/* Up / Down Order buttons */}
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    disabled={idx === 0}
                                    onClick={() => handleMoveTier(tier.id, 'up')}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-450 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    disabled={idx === mcTiers.length - 1}
                                    onClick={() => handleMoveTier(tier.id, 'down')}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-450 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                  >
                                    ▼
                                  </button>
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800 dark:text-white text-xs">{tier.name}</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                    มี MC ในระบบ {mcsUsing} คน
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingTier(tier);
                                    setTierName(tier.name);
                                    setIsTierModalOpen(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-lg transition-all cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTier(tier)}
                                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
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

      </div>

      {/* MC Add/Edit Modal */}
      {isMcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsMcModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-5">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {editingMc ? 'แก้ไขข้อมูล MC' : 'เพิ่ม MC ใหม่'}
              </h3>
              <button onClick={() => setIsMcModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMc} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">ชื่อ MC (MC Name)</label>
                <input
                  type="text"
                  placeholder="กรอกชื่อสำหรับแสดงผล"
                  value={mcName}
                  onChange={(e) => setMcName(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">ระดับ Tier (MC Tier)</label>
                <select
                  value={mcTierId}
                  onChange={(e) => setMcTierId(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                  required
                >
                  <option value="">-- เลือก Tier --</option>
                  {mcTiers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">สถานะการใช้งาน (Status)</label>
                <select
                  value={mcStatus}
                  onChange={(e) => setMcStatus(e.target.value as any)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                >
                  <option value="Active">Active (เปิดใช้งาน)</option>
                  <option value="Inactive">Inactive (ปิดใช้งาน)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMcModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/25"
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
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {editingTier ? 'แก้ไขระดับ Tier' : 'เพิ่ม Tier ใหม่'}
              </h3>
              <button onClick={() => setIsTierModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">ชื่อ Tier</label>
                <input
                  type="text"
                  placeholder="เช่น Tier S, Tier VIP"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTierModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/25"
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
              <button onClick={() => setIsBlockModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
                เนื่องจาก MC <strong className="text-slate-900 dark:text-white font-bold">"{blockedMcName}"</strong> มีคิวไลฟ์สดที่ยังไม่ได้ยกเลิกหรือกำลังจะเกิดขึ้นในระบบ จำนวน <strong className="text-rose-650 font-bold">{blockedBookings.length} คิว</strong>:
              </p>

              <div className="max-h-60 overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-2xl divide-y divide-slate-150 dark:divide-slate-800 text-[11px]">
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
                      className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-lg font-bold transition-all text-[10px] shrink-0"
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
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
