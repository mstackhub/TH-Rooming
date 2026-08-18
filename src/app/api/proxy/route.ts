import { NextResponse } from 'next/server';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const TOKEN_SALT = "secure_salt_1234_TH_Booking";

// ── HELPERS FOR SUPABASE REST API ────────────────────────────────────────────
async function requestSupabase(method: string, path: string, data: any = null, headers: any = {}) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY in environment variables.");
  }

  const url = `${supabaseUrl}/rest/v1/${path}`;
  const reqHeaders: any = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    ...headers
  };

  const options: RequestInit = {
    method: method,
    headers: reqHeaders,
    cache: 'no-store' // Avoid caching database queries
  };

  if (data) {
    reqHeaders['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ── DATA MAPPING HELPERS ─────────────────────────────────────────────────────
function mapBookingToFrontend(b: any) {
  if (!b) return null;
  return {
    id: b.id,
    roomName: b.room_name,
    date: b.date,
    startTime: b.start_time,
    endTime: b.end_time,
    brandName: b.brand_name,
    campaignName: b.campaign_name,
    briefText: b.brief_text,
    briefLink: b.brief_link,
    lsArtworkLayout: b.ls_artwork_layout,
    ownerEmail: b.owner_email,
    ownerName: b.owner_name,
    status: b.status,
    remark: b.remark,
    createdAt: b.created_at,
    mcId: b.mc_id || null
  };
}

function mapBookingToDb(b: any) {
  if (!b) return null;
  return {
    room_name: b.roomName,
    date: b.date,
    start_time: b.startTime,
    end_time: b.endTime,
    brand_name: b.brandName,
    campaign_name: b.campaignName || '',
    brief_text: b.briefText || '',
    brief_link: b.briefLink || '',
    ls_artwork_layout: b.lsArtworkLayout || '',
    owner_email: b.ownerEmail,
    owner_name: b.ownerName,
    status: b.status || 'Confirmed',
    remark: b.remark || '',
    mc_id: b.mcId || null
  };
}

// ── SECURITY & SESSION HELPERS ───────────────────────────────────────────────
function generateToken(email: string) {
  const hash = crypto.createHash('sha256').update(email.toLowerCase() + TOKEN_SALT).digest('hex');
  return Buffer.from(email.toLowerCase() + ":" + hash).toString('base64');
}

async function verifyToken(token: string) {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 2) return null;
    const hash = parts[parts.length - 1];
    const email = parts.slice(0, parts.length - 1).join(":");
    
    const expectedHash = crypto.createHash('sha256').update(email + TOKEN_SALT).digest('hex');
    if (hash !== expectedHash) return null;

    const users = await requestSupabase('GET', `users?email=eq.${encodeURIComponent(email)}&select=*,roles(*)`);
    if (users && users.length > 0 && users[0].status === 'Active') {
      return users[0];
    }
  } catch (e) {
    console.error("Token verification failed:", e);
  }
  return null;
}

function parseUserAgent(ua: string): string {
  if (!ua || ua === '-') return 'ไม่ทราบอุปกรณ์';
  
  let os = 'Unknown OS';
  let deviceType = 'PC/Laptop';
  let browser = 'Unknown Browser';

  // Detect OS
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) os = 'Mac OS';
  else if (ua.includes('iPhone')) {
    os = 'iOS';
    deviceType = 'Apple iPhone';
  } else if (ua.includes('iPad')) {
    os = 'iOS';
    deviceType = 'Apple iPad';
  } else if (ua.includes('Android')) {
    os = 'Android';
    deviceType = 'Android Mobile';
    if (ua.includes('Samsung') || ua.includes('SAMSUNG')) deviceType = 'Samsung Galaxy';
    else if (ua.includes('Huawei') || ua.includes('HUAWEI')) deviceType = 'Huawei';
    else if (ua.includes('Oppo') || ua.includes('OPPO')) deviceType = 'Oppo';
    else if (ua.includes('Vivo') || ua.includes('VIVO')) deviceType = 'Vivo';
    else if (ua.includes('Xiaomi') || ua.includes('Miui') || ua.includes('XIAOMI')) deviceType = 'Xiaomi';
  } else if (ua.includes('Linux')) os = 'Linux';

  // Detect Browser
  if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) browser = 'Google Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
  else if (ua.includes('Edg')) browser = 'Microsoft Edge';
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';

  return `${deviceType} (${os}) - Browser: ${browser}`;
}

async function logActivity(user: any, action: string, target: string, details: string, ip = "-", device = "-") {
  try {
    const formattedDevice = parseUserAgent(device);
    await requestSupabase('POST', 'audit_logs', {
      user_email: user ? user.email : "system",
      user_name: user ? user.name : "System",
      action: action,
      target: target,
      details: details,
      ip: ip,
      device: formattedDevice
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

// ── CORS & ROUTE OPTIONS HANDLER ─────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Extract IP & User Agent from request headers
  const reqHeaders = request.headers;
  const ipHeader = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '127.0.0.1';
  const clientIp = ipHeader.split(',')[0].trim();
  const userAgent = reqHeaders.get('user-agent') || 'Unknown Device';

  let params: any = {};
  try {
    params = await request.json();
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  const action = params.action;
  if (!action) {
    return NextResponse.json({ success: false, message: 'Action parameter is required' }, { status: 400, headers: corsHeaders });
  }

  try {
    // 1. Handle Anonymous Actions (Login)
    if (action === 'login') {
      const email = String(params.email || '').trim().toLowerCase();
      const password = String(params.password || '').trim();

      // Bypassed/Disabled system lock checks for now
      const users = await requestSupabase('GET', `users?email=eq.${encodeURIComponent(email)}&select=*,roles(*)`);
      if (!users || users.length === 0) {
        return NextResponse.json({ success: false, message: 'ไม่พบผู้ใช้งานในระบบ' }, { headers: corsHeaders });
      }
      const user = users[0];
      if (user.status !== 'Active') {
        return NextResponse.json({ success: false, message: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งานชั่วคราว' }, { headers: corsHeaders });
      }
      if (user.password !== password) {
        return NextResponse.json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' }, { headers: corsHeaders });
      }

      const token = generateToken(user.email);
      await logActivity(user, "LOGIN", user.email, "เข้าสู่ระบบสำเร็จ", clientIp, userAgent);

      const rolePerms = user.roles || {
        allowed_tabs: 'my-bookings,calendar,scheduler,campaign-schedule,analytics',
        can_create_booking: false,
        can_edit_booking: false,
        can_cancel_booking: false,
        is_admin: false
      };

      return NextResponse.json({
        success: true,
        token: token,
        user: {
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          permissions: {
            roleName: user.role,
            allowedTabs: rolePerms.allowed_tabs,
            canCreateBooking: rolePerms.can_create_booking,
            canEditBooking: rolePerms.can_edit_booking,
            canCancelBooking: rolePerms.can_cancel_booking,
            isAdmin: rolePerms.is_admin
          }
        }
      }, { headers: corsHeaders });
    }

    if (action === 'getGlobalLockdown') {
      const settings = await requestSupabase('GET', 'settings');
      const dict: any = {};
      if (Array.isArray(settings)) {
        settings.forEach((s: any) => dict[s.key] = s.value);
      }

      let isLocked = dict['system_lockdown'] === 'true';
      let lockUntil = dict['system_lockdown_until'] || '';
      let schedEnabled = dict['scheduled_lock_enabled'] === 'true';
      const schedTime = dict['scheduled_lock_time'] || '';

      // If current date time is past scheduled lock time, trigger shutdown globally
      if (schedEnabled && schedTime && new Date() >= new Date(schedTime)) {
        isLocked = true;
        schedEnabled = false;
        lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default 24 hours lock

        const updatePayload = [
          { key: 'system_lockdown', value: 'true' },
          { key: 'system_lockdown_until', value: lockUntil },
          { key: 'scheduled_lock_enabled', value: 'false' }
        ];
        await requestSupabase('POST', 'settings', updatePayload, { 'Prefer': 'resolution=merge-duplicates' });
        await logActivity(null, "SCHEDULED_LOCKDOWN_TRIGGERED", "System", "Scheduled lockdown time reached. System locked globally.", clientIp, userAgent);
      }

      return NextResponse.json({
        systemLockdown: isLocked,
        systemLockdownUntil: lockUntil,
        scheduledLockEnabled: schedEnabled,
        scheduledLockTime: schedTime
      }, { headers: corsHeaders });
    }

    if (action === 'saveGlobalLockdown' && params.silent) {
      const payloads = [
        { key: 'system_lockdown', value: String(!!params.systemLockdown) },
        { key: 'system_lockdown_until', value: params.systemLockdownUntil || '' },
        { key: 'scheduled_lock_enabled', value: String(!!params.scheduledLockEnabled) },
        { key: 'scheduled_lock_time', value: params.scheduledLockTime || '' }
      ];
      await requestSupabase('POST', 'settings', payloads, { 'Prefer': 'resolution=merge-duplicates' });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // 2. Authenticate all other actions
    const user = await verifyToken(params.token);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid authentication token or session expired.' }, { status: 401, headers: corsHeaders });
    }

    const rolePerms = user.roles || {};
    const isAdmin = !!rolePerms.is_admin;

    // 3. Routing Actions
    switch (action) {
      case 'getInitData': {
        const rooms = await requestSupabase('GET', 'rooms?order=name.asc');
        const dbBrands = await requestSupabase('GET', 'brands?status=eq.Active&order=name.asc');
        const dbBookings = await requestSupabase('GET', 'bookings?order=date.asc,start_time.asc');
        const mcTiers = await requestSupabase('GET', 'mc_tiers?order=sort_order.asc');
        const mcList = await requestSupabase('GET', 'mc_list?order=name.asc');
        
        // Filter brands that the user is assigned to (or all if user is admin)
        const userEmailLower = user.email.toLowerCase();
        const filteredBrands = dbBrands.filter((b: any) => {
          if (isAdmin) return true;
          if (b.description && b.description.startsWith('emails:')) {
            const allowedEmails = b.description.substring(7).toLowerCase().split(',');
            return allowedEmails.includes(userEmailLower);
          }
          // If no email assignment set, it is open to everyone
          return true;
        });

        const mappedBookings = dbBookings.map(mapBookingToFrontend);
        const mappedMcTiers = (mcTiers || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          sortOrder: t.sort_order
        }));
        const mappedMcList = (mcList || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          tierId: m.tier_id,
          status: m.status
        }));

        let allRoomsAdmin: any[] = [];
        let allBrandsAdmin: any[] = [];
        let allUsersAdmin: any[] = [];
        let roles: any[] = [];

        const tabs = (rolePerms.allowed_tabs || '').split(',');
        if (isAdmin || tabs.includes('rooms')) {
          allRoomsAdmin = await requestSupabase('GET', 'rooms?order=name.asc');
        }
        if (isAdmin || tabs.includes('brands')) {
          allBrandsAdmin = await requestSupabase('GET', 'brands?order=name.asc');
        }
        if (isAdmin || tabs.includes('users')) {
          allUsersAdmin = await requestSupabase('GET', 'users?select=*,roles(*)&order=email.asc');
        }
        if (isAdmin || tabs.includes('roles-mgmt')) {
          roles = await requestSupabase('GET', 'roles?order=role_name.asc');
        }

        const mappedUser = {
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          permissions: {
            roleName: user.role,
            allowedTabs: rolePerms.allowed_tabs,
            canCreateBooking: rolePerms.can_create_booking,
            canEditBooking: rolePerms.can_edit_booking,
            canCancelBooking: rolePerms.can_cancel_booking,
            isAdmin: rolePerms.is_admin
          }
        };

        const mappedUsersAdmin = allUsersAdmin.map(u => ({
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
          password: u.password // plain text password as matches user mgmt
        }));

        const mappedRolesAdmin = roles.map(r => ({
          roleName: r.role_name,
          description: r.description,
          allowedTabs: r.allowed_tabs,
          canCreateBooking: r.can_create_booking,
          canEditBooking: r.can_edit_booking,
          canCancelBooking: r.can_cancel_booking,
          isAdmin: r.is_admin
        }));

        return NextResponse.json({
          user: mappedUser,
          rooms,
          brands: filteredBrands,
          allBookings: mappedBookings,
          allRoomsAdmin,
          allBrandsAdmin,
          allUsersAdmin: mappedUsersAdmin,
          roles: mappedRolesAdmin,
          mcTiers: mappedMcTiers,
          mcList: mappedMcList
        }, { headers: corsHeaders });
      }

      case 'getBookings': {
        const date = params.date;
        const dbBookings = await requestSupabase('GET', `bookings?date=eq.${date}&order=start_time.asc`);
        return NextResponse.json({ bookings: dbBookings.map(mapBookingToFrontend) }, { headers: corsHeaders });
      }

      case 'getMyBookings': {
        const dbBookings = await requestSupabase('GET', `bookings?owner_email=eq.${encodeURIComponent(user.email)}&order=date.asc,start_time.asc`);
        return NextResponse.json({ bookings: dbBookings.map(mapBookingToFrontend) }, { headers: corsHeaders });
      }

      case 'getAllBookings': {
        const dbBookings = await requestSupabase('GET', `bookings?order=date.asc,start_time.asc`);
        return NextResponse.json({ bookings: dbBookings.map(mapBookingToFrontend) }, { headers: corsHeaders });
      }

      case 'createBooking': {
        if (!rolePerms.can_create_booking && !isAdmin) {
          return NextResponse.json({ success: false, message: 'ท่านไม่มีสิทธิ์ในการสร้างรายการจองห้องไลฟ์สด' }, { headers: corsHeaders });
        }
        const bData = params.bookingData;

        // Brand access validation
        if (!isAdmin) {
          const brandCheck = await requestSupabase('GET', `brands?name=eq.${encodeURIComponent(bData.brandName)}`);
          if (brandCheck && brandCheck.length > 0 && brandCheck[0].description && brandCheck[0].description.startsWith('emails:')) {
            const allowedEmails = brandCheck[0].description.substring(7).toLowerCase().split(',');
            if (!allowedEmails.includes(user.email.toLowerCase())) {
              return NextResponse.json({ success: false, message: `ท่านไม่มีสิทธิ์ดูแลแบรนด์ "${bData.brandName}" จึงไม่สามารถสร้างคิวจองนี้ได้` }, { headers: corsHeaders });
            }
          }
        }

        const dbPayload = mapBookingToDb(bData);
        if (dbPayload) {
          dbPayload.owner_email = user.email;
          dbPayload.owner_name = user.name;
        }

        const newBookings = await requestSupabase('POST', 'bookings', dbPayload, { 'Prefer': 'return=representation' });
        const inserted = Array.isArray(newBookings) ? newBookings[0] : newBookings;
        const bookingId = inserted ? inserted.id : null;

        if (dbPayload) {
          await logActivity(user, "CREATE_BOOKING", dbPayload.room_name, `Room ${dbPayload.room_name}, Date ${dbPayload.date}, ${dbPayload.start_time}-${dbPayload.end_time}`, clientIp, userAgent);
        }
        
        return NextResponse.json({ success: true, bookingId: bookingId }, { headers: corsHeaders });
      }

      case 'createBookingsBulk': {
        if (!rolePerms.can_create_booking && !isAdmin) {
          return NextResponse.json({ success: false, message: 'ท่านไม่มีสิทธิ์ในการสร้างรายการจองห้องไลฟ์สด' }, { headers: corsHeaders });
        }
        const list = params.bookingsList; // List of booking objects

        // Brand access validation for bulk
        if (!isAdmin && list.length > 0) {
          const uniqueBrandsInList = Array.from(new Set(list.map((b: any) => b.brandName)));
          for (const bName of uniqueBrandsInList) {
            const brandCheck = await requestSupabase('GET', `brands?name=eq.${encodeURIComponent(bName as string)}`);
            if (brandCheck && brandCheck.length > 0 && brandCheck[0].description && brandCheck[0].description.startsWith('emails:')) {
              const allowedEmails = brandCheck[0].description.substring(7).toLowerCase().split(',');
              if (!allowedEmails.includes(user.email.toLowerCase())) {
                return NextResponse.json({ success: false, message: `ท่านไม่มีสิทธิ์ดูแลแบรนด์ "${bName}" จึงไม่สามารถนำเข้าข้อมูลคิวจองชุดนี้ได้` }, { headers: corsHeaders });
              }
            }
          }
        }

        const dbPayloads = list.map((b: any) => {
          const dbObj = mapBookingToDb(b);
          if (dbObj) {
            dbObj.owner_email = user.email;
            dbObj.owner_name = user.name;
          }
          return dbObj;
        });

        await requestSupabase('POST', 'bookings', dbPayloads, { 'Prefer': 'return=representation' });
        await logActivity(user, "CREATE_BOOKINGS_BULK", `${list.length} slots`, `Bulk booking of ${list.length} slots started on ${list[0]?.date}`, clientIp, userAgent);

        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      case 'updateBooking': {
        if (!rolePerms.can_edit_booking && !isAdmin) {
          return NextResponse.json({ success: false, message: 'ท่านไม่มีสิทธิ์ในการแก้ไขข้อมูลรายการจองห้องไลฟ์สด' }, { headers: corsHeaders });
        }
        const id = params.bookingId;
        const bData = params.bookingData;

        // Verify existing booking ownership & brand access
        const existing = await requestSupabase('GET', `bookings?id=eq.${id}`);
        if (!existing || existing.length === 0) {
          return NextResponse.json({ success: false, message: 'ไม่พบรายการจองนี้ในระบบ' }, { headers: corsHeaders });
        }
        
        if (!isAdmin) {
          // Ownership verification
          if (existing[0].owner_email.toLowerCase() !== user.email.toLowerCase()) {
            return NextResponse.json({ success: false, message: 'ท่านสามารถแก้ไขได้เฉพาะรายการจองที่ตัวท่านเองเป็นผู้สร้างเท่านั้น' }, { headers: corsHeaders });
          }

          // Brand access verification (for the updated brand target)
          const brandCheck = await requestSupabase('GET', `brands?name=eq.${encodeURIComponent(bData.brandName)}`);
          if (brandCheck && brandCheck.length > 0 && brandCheck[0].description && brandCheck[0].description.startsWith('emails:')) {
            const allowedEmails = brandCheck[0].description.substring(7).toLowerCase().split(',');
            if (!allowedEmails.includes(user.email.toLowerCase())) {
              return NextResponse.json({ success: false, message: `ท่านไม่มีสิทธิ์ดูแลแบรนด์ "${bData.brandName}" จึงไม่สามารถแก้ไขคิวไปใช้แบรนด์นี้ได้` }, { headers: corsHeaders });
            }
          }
        }

        const dbPayload = mapBookingToDb(bData);
        
        await requestSupabase('PATCH', `bookings?id=eq.${id}`, dbPayload);
        if (dbPayload) {
          await logActivity(user, "UPDATE_BOOKING", id, `Updated Room ${dbPayload.room_name}, Date ${dbPayload.date}, ${dbPayload.start_time}-${dbPayload.end_time}`, clientIp, userAgent);
        }
        
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      case 'cancelBooking': {
        if (!rolePerms.can_cancel_booking && !isAdmin) {
          return NextResponse.json({ success: false, message: 'ท่านไม่มีสิทธิ์ในการยกเลิกรายการจองห้องไลฟ์สด' }, { headers: corsHeaders });
        }
        const id = params.bookingId;

        // Verify existing booking ownership for cancel
        const existing = await requestSupabase('GET', `bookings?id=eq.${id}`);
        if (!existing || existing.length === 0) {
          return NextResponse.json({ success: false, message: 'ไม่พบรายการจองนี้ในระบบ' }, { headers: corsHeaders });
        }

        if (!isAdmin) {
          if (existing[0].owner_email.toLowerCase() !== user.email.toLowerCase()) {
            return NextResponse.json({ success: false, message: 'ท่านสามารถยกเลิกได้เฉพาะรายการจองที่ตัวท่านเองเป็นผู้สร้างเท่านั้น' }, { headers: corsHeaders });
          }
        }

        await requestSupabase('PATCH', `bookings?id=eq.${id}`, { status: 'Cancelled' });
        await logActivity(user, "CANCEL_BOOKING", id, `Cancelled booking ID: ${id}`, clientIp, userAgent);
        
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      case 'updateArtworkLinks': {
        const id = params.bookingId;
        const links = params.artworkLinks;

        // Verify brand assignment or ownership for artwork upload
        const existing = await requestSupabase('GET', `bookings?id=eq.${id}`);
        if (!existing || existing.length === 0) {
          return NextResponse.json({ success: false, message: 'ไม่พบรายการจองนี้ในระบบ' }, { headers: corsHeaders });
        }

        if (!isAdmin) {
          // Can upload artwork if they are either booking creator or they manage that brand
          const isCreator = existing[0].owner_email.toLowerCase() === user.email.toLowerCase();
          
          let managesBrand = true;
          const brandCheck = await requestSupabase('GET', `brands?name=eq.${encodeURIComponent(existing[0].brand_name)}`);
          if (brandCheck && brandCheck.length > 0 && brandCheck[0].description && brandCheck[0].description.startsWith('emails:')) {
            const allowedEmails = brandCheck[0].description.substring(7).toLowerCase().split(',');
            managesBrand = allowedEmails.includes(user.email.toLowerCase());
          }

          if (!isCreator && !managesBrand) {
            return NextResponse.json({ success: false, message: 'ท่านไม่มีสิทธิ์อัปโหลดอาร์ตเวิร์กให้กับแคมเปญของแบรนด์นี้' }, { headers: corsHeaders });
          }
        }
        
        await requestSupabase('PATCH', `bookings?id=eq.${id}`, { ls_artwork_layout: links });
        await logActivity(user, "UPDATE_ARTWORK_LINKS", id, `Updated artwork links for booking ID: ${id}`, clientIp, userAgent);
        
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      case 'clearAllBookings': {
        await requestSupabase('DELETE', 'bookings?id=not.is.null');
        await logActivity(user, "CLEAR_ALL_BOOKINGS", "", "Cleared all bookings in the database", clientIp, userAgent);
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      case 'verifyMasterPassword': {
        const settingsList = await requestSupabase('GET', 'settings?key=eq.master_password');
        const storedPwd = settingsList && settingsList.length > 0 ? settingsList[0].value : 'Admin@1234';
        const success = (params.password === storedPwd);
        return NextResponse.json({ success }, { headers: corsHeaders });
      }

      case 'getActivityLogs': {
        const isMaster = user.email.toLowerCase() === 'masteradmin' || user.role === 'Master Admin';
        if (!isAdmin && !isMaster) {
          return NextResponse.json({ success: false, message: 'คุณไม่มีสิทธิ์ดูประวัติกิจกรรมระบบ กรุณาติดต่อ Master Admin' }, { status: 403, headers: corsHeaders });
        }
        const dbLogs = await requestSupabase('GET', 'audit_logs?order=created_at.desc&limit=150');
        const mappedLogs = dbLogs.map((l: any) => ({
          timestamp: l.created_at,
          userEmail: l.user_email,
          userName: l.user_name,
          action: l.action,
          target: l.target,
          details: l.details,
          ip: l.ip,
          device: l.device
        }));
        return NextResponse.json({ logs: mappedLogs }, { headers: corsHeaders });
      }

      // --- ADMIN API ENDPOINTS ---
      case 'manageRooms': {
        if (!isAdmin) return NextResponse.json({ success: false, message: 'คุณไม่มีสิทธิ์จัดการห้องสตูดิโอ กรุณาติดต่อ Master Admin เพื่อขอเพิ่มสิทธิ์' }, { status: 403, headers: corsHeaders });
        const subAction = params.subAction;
        const p = params.payload;

        // Get local Thailand date and time
        const thDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        const localDateStr = thDate.getFullYear() + '-' + String(thDate.getMonth() + 1).padStart(2, '0') + '-' + String(thDate.getDate()).padStart(2, '0');
        const localTimeStr = String(thDate.getHours()).padStart(2, '0') + ':' + String(thDate.getMinutes()).padStart(2, '0');

        if (subAction === 'CREATE') {
          await requestSupabase('POST', 'rooms', { name: p.name, description: p.description, status: p.status });
          await logActivity(user, "CREATE_ROOM", p.name, `Created room: ${p.name}`, clientIp, userAgent);
        } else if (subAction === 'UPDATE') {
          if (p.status === 'Inactive') {
            // Check if there are upcoming active bookings for this room (in the future)
            const bookings = await requestSupabase('GET', `bookings?room_name=eq.${encodeURIComponent(p.oldName)}&status=neq.Cancelled&date=gte.${localDateStr}`);
            const upcomingBookings = (bookings || []).filter((b: any) => {
              if (b.date > localDateStr) return true;
              if (b.date === localDateStr && b.end_time > localTimeStr) return true;
              return false;
            });
            if (upcomingBookings.length > 0) {
              return NextResponse.json({ success: false, message: 'ไม่สามารถปิดการใช้งานห้องสตูดิโอนี้ได้ เนื่องจากยังมีคิวจองที่กำลังจะเกิดขึ้น' }, { headers: corsHeaders });
            }
          }
          await requestSupabase('PATCH', `rooms?name=eq.${encodeURIComponent(p.oldName)}`, { name: p.name, description: p.description, status: p.status });
          await logActivity(user, "UPDATE_ROOM", p.name, `Updated room from ${p.oldName} to ${p.name}`, clientIp, userAgent);
        } else if (subAction === 'DELETE') {
          const bookings = await requestSupabase('GET', `bookings?room_name=eq.${encodeURIComponent(p.name)}&status=neq.Cancelled&date=gte.${localDateStr}`);
          const upcomingBookings = (bookings || []).filter((b: any) => {
            if (b.date > localDateStr) return true;
            if (b.date === localDateStr && b.end_time > localTimeStr) return true;
            return false;
          });
          if (upcomingBookings.length > 0) {
            return NextResponse.json({ success: false, message: 'ไม่สามารถลบห้องสตูดิโอนี้ได้ เนื่องจากยังมีคิวจองที่เกี่ยวข้องในระบบ' }, { headers: corsHeaders });
          }
          await requestSupabase('DELETE', `rooms?name=eq.${encodeURIComponent(p.name)}`);
          await logActivity(user, "DELETE_ROOM", p.name, `Deleted room: ${p.name}`, clientIp, userAgent);
        }
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      case 'manageBrands': {
        if (!isAdmin) return NextResponse.json({ success: false, message: 'คุณไม่มีสิทธิ์จัดการแบรนด์ลูกค้า กรุณาติดต่อ Master Admin เพื่อขอเพิ่มสิทธิ์' }, { status: 403, headers: corsHeaders });
        const subAction = params.subAction;
        const p = params.payload;

        // Get local Thailand date and time
        const thDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        const localDateStr = thDate.getFullYear() + '-' + String(thDate.getMonth() + 1).padStart(2, '0') + '-' + String(thDate.getDate()).padStart(2, '0');
        const localTimeStr = String(thDate.getHours()).padStart(2, '0') + ':' + String(thDate.getMinutes()).padStart(2, '0');

        if (subAction === 'CREATE') {
          await requestSupabase('POST', 'brands', { name: p.name, description: p.description, status: p.status });
          await logActivity(user, "CREATE_BRAND", p.name, `Created brand: ${p.name}`, clientIp, userAgent);
        } else if (subAction === 'UPDATE') {
          if (p.status === 'Inactive') {
            // Check if there are upcoming active bookings for this brand
            const bookings = await requestSupabase('GET', `bookings?brand_name=eq.${encodeURIComponent(p.oldName)}&status=neq.Cancelled&date=gte.${localDateStr}`);
            const upcomingBookings = (bookings || []).filter((b: any) => {
              if (b.date > localDateStr) return true;
              if (b.date === localDateStr && b.end_time > localTimeStr) return true;
              return false;
            });
            if (upcomingBookings.length > 0) {
              return NextResponse.json({ success: false, message: 'ไม่สามารถปิดการใช้งานแบรนด์นี้ได้ เนื่องจากยังมีคิวจองที่กำลังจะเกิดขึ้น' }, { headers: corsHeaders });
            }
          }
          await requestSupabase('PATCH', `brands?name=eq.${encodeURIComponent(p.oldName)}`, { name: p.name, description: p.description, status: p.status });
          await logActivity(user, "UPDATE_BRAND", p.name, `Updated brand from ${p.oldName} to ${p.name}`, clientIp, userAgent);
        } else if (subAction === 'DELETE') {
          const bookings = await requestSupabase('GET', `bookings?brand_name=eq.${encodeURIComponent(p.name)}&status=neq.Cancelled&date=gte.${localDateStr}`);
          const upcomingBookings = (bookings || []).filter((b: any) => {
            if (b.date > localDateStr) return true;
            if (b.date === localDateStr && b.end_time > localTimeStr) return true;
            return false;
          });
          if (upcomingBookings.length > 0) {
            return NextResponse.json({ success: false, message: 'ไม่สามารถลบแบรนด์นี้ได้ เนื่องจากยังมีคิวจองที่เกี่ยวข้องในระบบ' }, { headers: corsHeaders });
          }
          await requestSupabase('DELETE', `brands?name=eq.${encodeURIComponent(p.name)}`);
          await logActivity(user, "DELETE_BRAND", p.name, `Deleted brand: ${p.name}`, clientIp, userAgent);
        }
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      case 'manageUsers': {
        if (!isAdmin) return NextResponse.json({ success: false, message: 'คุณไม่มีสิทธิ์จัดการผู้ใช้งานระบบ กรุณาติดต่อ Master Admin เพื่อขอเพิ่มสิทธิ์' }, { status: 403, headers: corsHeaders });
        const subAction = params.subAction;
        const p = params.payload;

        if (subAction === 'CREATE') {
          await requestSupabase('POST', 'users', { email: p.email, name: p.name, role: p.role, status: p.status, password: p.password });
          await logActivity(user, "CREATE_USER", p.email, `Created user: ${p.email} (${p.role})`, clientIp, userAgent);
        } else if (subAction === 'UPDATE') {
          await requestSupabase('PATCH', `users?email=eq.${encodeURIComponent(p.email)}`, { name: p.name, role: p.role, status: p.status, password: p.password });
          await logActivity(user, "UPDATE_USER", p.email, `Updated user details for: ${p.email}`, clientIp, userAgent);
        } else if (subAction === 'DELETE') {
          await requestSupabase('DELETE', `users?email=eq.${encodeURIComponent(p.email)}`);
          await logActivity(user, "DELETE_USER", p.email, `Deleted user: ${p.email}`, clientIp, userAgent);
        }
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      case 'manageRoles': {
        if (!isAdmin) return NextResponse.json({ success: false, message: 'คุณไม่มีสิทธิ์จัดการระดับสิทธิ์ กรุณาติดต่อ Master Admin เพื่อขอเพิ่มสิทธิ์' }, { status: 403, headers: corsHeaders });
        const subAction = params.subAction;
        const p = params.payload;

        const dbRoleObj = {
          role_name: p.roleName,
          description: p.description || '',
          allowed_tabs: p.allowedTabs,
          can_create_booking: !!p.canCreateBooking,
          can_edit_booking: !!p.canEditBooking,
          can_cancel_booking: !!p.canCancelBooking,
          is_admin: !!p.isAdmin
        };

        if (subAction === 'CREATE') {
          await requestSupabase('POST', 'roles', dbRoleObj);
          await logActivity(user, "CREATE_ROLE", p.roleName, `Created role: ${p.roleName}`, clientIp, userAgent);
        } else if (subAction === 'UPDATE') {
          await requestSupabase('PATCH', `roles?role_name=eq.${encodeURIComponent(p.roleName)}`, dbRoleObj);
          await logActivity(user, "UPDATE_ROLE", p.roleName, `Updated role: ${p.roleName}`, clientIp, userAgent);
        } else if (subAction === 'DELETE') {
          await requestSupabase('DELETE', `roles?role_name=eq.${encodeURIComponent(p.roleName)}`);
          await logActivity(user, "DELETE_ROLE", p.roleName, `Deleted role: ${p.roleName}`, clientIp, userAgent);
        }
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      case 'getSystemSettings': {
        const settings = await requestSupabase('GET', 'settings');
        const dict: any = {};
        settings.forEach((s: any) => dict[s.key] = s.value);
        return NextResponse.json({
          lineNotificationsEnabled: dict['line_notifications_enabled'] === 'true',
          lineChannelAccessToken: dict['line_channel_access_token'] || '',
          lineDestinationId: dict['line_destination_id'] || '',
          frontendUrl: dict['frontend_url'] || ''
        }, { headers: corsHeaders });
      }

      case 'getGlobalLockdown': {
        const settings = await requestSupabase('GET', 'settings');
        const dict: any = {};
        if (Array.isArray(settings)) {
          settings.forEach((s: any) => dict[s.key] = s.value);
        }

        let isLocked = dict['system_lockdown'] === 'true';
        let lockUntil = dict['system_lockdown_until'] || '';
        let schedEnabled = dict['scheduled_lock_enabled'] === 'true';
        const schedTime = dict['scheduled_lock_time'] || '';

        // If current date time is past scheduled lock time, trigger shutdown globally
        if (schedEnabled && schedTime && new Date() >= new Date(schedTime)) {
          isLocked = true;
          schedEnabled = false;
          lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default 24 hours lock

          const updatePayload = [
            { key: 'system_lockdown', value: 'true' },
            { key: 'system_lockdown_until', value: lockUntil },
            { key: 'scheduled_lock_enabled', value: 'false' }
          ];
          await requestSupabase('POST', 'settings', updatePayload, { 'Prefer': 'resolution=merge-duplicates' });
          await logActivity(user, "SCHEDULED_LOCKDOWN_TRIGGERED", "System", "Scheduled lockdown time reached. System locked globally.", clientIp, userAgent);
        }

        return NextResponse.json({
          systemLockdown: isLocked,
          systemLockdownUntil: lockUntil,
          scheduledLockEnabled: schedEnabled,
          scheduledLockTime: schedTime
        }, { headers: corsHeaders });
      }

      case 'saveGlobalLockdown': {
        const isMaster = user.email.toLowerCase() === 'masteradmin' || user.role === 'Master Admin';
        const isSilent = !!params.silent;
        if (!isAdmin && !isMaster && !isSilent) {
          return NextResponse.json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขการควบคุมปิดใช้งานระบบ' }, { status: 403, headers: corsHeaders });
        }
        const payloads = [
          { key: 'system_lockdown', value: String(!!params.systemLockdown) },
          { key: 'system_lockdown_until', value: params.systemLockdownUntil || '' },
          { key: 'scheduled_lock_enabled', value: String(!!params.scheduledLockEnabled) },
          { key: 'scheduled_lock_time', value: params.scheduledLockTime || '' }
        ];
        await requestSupabase('POST', 'settings', payloads, { 'Prefer': 'resolution=merge-duplicates' });
        
        // Skip log audit if silent is requested
        if (!isSilent) {
          await logActivity(user, "SAVE_LOCKDOWN_SETTINGS", "System", `Updated lockdown settings (Locked: ${params.systemLockdown})`, clientIp, userAgent);
        }
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      case 'saveSystemSettings': {
        if (!isAdmin) return NextResponse.json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขการตั้งค่าระบบ กรุณาติดต่อ Master Admin' }, { status: 403, headers: corsHeaders });
        const dict = params.settings;

        const payloads = [
          { key: 'line_notifications_enabled', value: String(!!dict.lineNotificationsEnabled) },
          { key: 'line_channel_access_token', value: dict.lineChannelAccessToken || '' },
          { key: 'line_destination_id', value: dict.lineDestinationId || '' },
          { key: 'frontend_url', value: dict.frontendUrl || '' }
        ];

        await requestSupabase('POST', 'settings', payloads, { 'Prefer': 'resolution=merge-duplicates' });
        await logActivity(user, "SAVE_SYSTEM_SETTINGS", "System", "Saved system settings configuration", clientIp, userAgent);
        
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      case 'manageMcTiers': {
        if (!isAdmin) return NextResponse.json({ success: false, message: 'คุณไม่มีสิทธิ์จัดการข้อมูล Tiers กรุณาติดต่อ Master Admin เพื่อขอเพิ่มสิทธิ์' }, { status: 403, headers: corsHeaders });
        const subAction = params.subAction;
        const p = params.payload;

        if (subAction === 'CREATE') {
          const existing = await requestSupabase('GET', `mc_tiers?name=eq.${encodeURIComponent(p.name)}`);
          if (existing && existing.length > 0) {
            return NextResponse.json({ success: false, message: 'มี Tier ชื่อนี้อยู่ในระบบแล้ว' }, { headers: corsHeaders });
          }
          const allTiers = await requestSupabase('GET', 'mc_tiers');
          const maxSort = (allTiers || []).reduce((max: number, t: any) => t.sort_order > max ? t.sort_order : max, 0);
          await requestSupabase('POST', 'mc_tiers', { name: p.name, sort_order: maxSort + 1 });
          await logActivity(user, "CREATE_MC_TIER", p.name, `Created MC tier: ${p.name}`, clientIp, userAgent);
        } else if (subAction === 'UPDATE') {
          await requestSupabase('PATCH', `mc_tiers?id=eq.${encodeURIComponent(p.id)}`, { name: p.name });
          await logActivity(user, "UPDATE_MC_TIER", p.name, `Updated MC tier: ${p.name} (ID: ${p.id})`, clientIp, userAgent);
        } else if (subAction === 'UPDATE_ORDER') {
          for (const item of p.tiers) {
            await requestSupabase('PATCH', `mc_tiers?id=eq.${encodeURIComponent(item.id)}`, { sort_order: item.sortOrder });
          }
          await logActivity(user, "UPDATE_MC_TIERS_ORDER", "mc_tiers", `Updated MC tiers sort order`, clientIp, userAgent);
        } else if (subAction === 'DELETE') {
          const mcs = await requestSupabase('GET', `mc_list?tier_id=eq.${encodeURIComponent(p.id)}`);
          if (mcs && mcs.length > 0) {
            return NextResponse.json({ success: false, message: 'ไม่สามารถลบ Tier นี้ได้ เนื่องจากมี MC ที่ใช้ Tier นี้อยู่ในระบบ' }, { headers: corsHeaders });
          }
          await requestSupabase('DELETE', `mc_tiers?id=eq.${encodeURIComponent(p.id)}`);
          await logActivity(user, "DELETE_MC_TIER", p.id, `Deleted MC tier ID: ${p.id}`, clientIp, userAgent);
        }
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      case 'manageMcList': {
        if (!isAdmin) return NextResponse.json({ success: false, message: 'คุณไม่มีสิทธิ์จัดการข้อมูล MC กรุณาติดต่อ Master Admin เพื่อขอเพิ่มสิทธิ์' }, { status: 403, headers: corsHeaders });
        const subAction = params.subAction;
        const p = params.payload;

        const thDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        const localDateStr = thDate.getFullYear() + '-' + String(thDate.getMonth() + 1).padStart(2, '0') + '-' + String(thDate.getDate()).padStart(2, '0');
        const localTimeStr = String(thDate.getHours()).padStart(2, '0') + ':' + String(thDate.getMinutes()).padStart(2, '0');

        if (subAction === 'CREATE') {
          const existing = await requestSupabase('GET', `mc_list?name=eq.${encodeURIComponent(p.name)}`);
          if (existing && existing.length > 0) {
            return NextResponse.json({ success: false, message: 'มี MC ชื่อนี้อยู่ในระบบแล้ว' }, { headers: corsHeaders });
          }
          await requestSupabase('POST', 'mc_list', { name: p.name, tier_id: p.tierId, status: p.status || 'Active' });
          await logActivity(user, "CREATE_MC", p.name, `Created MC: ${p.name} (Tier ID: ${p.tierId})`, clientIp, userAgent);
        } else if (subAction === 'UPDATE') {
          if (p.status === 'Inactive') {
            const bookings = await requestSupabase('GET', `bookings?mc_id=eq.${encodeURIComponent(p.id)}&status=neq.Cancelled&date=gte.${localDateStr}`);
            const upcomingBookings = (bookings || []).filter((b: any) => {
              if (b.date > localDateStr) return true;
              if (b.date === localDateStr && b.end_time > localTimeStr) return true;
              return false;
            });
            if (upcomingBookings.length > 0) {
              return NextResponse.json({ success: false, message: 'ไม่สามารถปิดการใช้งาน MC ท่านนี้ได้ เนื่องจากยังมีคิวจองที่กำลังจะเกิดขึ้น' }, { headers: corsHeaders });
            }
          }
          await requestSupabase('PATCH', `mc_list?id=eq.${encodeURIComponent(p.id)}`, { name: p.name, tier_id: p.tierId, status: p.status });
          await logActivity(user, "UPDATE_MC", p.name, `Updated MC: ${p.name} (ID: ${p.id})`, clientIp, userAgent);
        } else if (subAction === 'DELETE') {
          const bookings = await requestSupabase('GET', `bookings?mc_id=eq.${encodeURIComponent(p.id)}&status=neq.Cancelled&date=gte.${localDateStr}`);
          const upcomingBookings = (bookings || []).filter((b: any) => {
            if (b.date > localDateStr) return true;
            if (b.date === localDateStr && b.end_time > localTimeStr) return true;
            return false;
          });
          if (upcomingBookings.length > 0) {
            const bookingDetails = upcomingBookings.map((b: any) => ({
              id: b.id,
              date: b.date,
              startTime: b.start_time,
              endTime: b.end_time,
              brandName: b.brand_name,
              roomName: b.room_name
            }));
            return NextResponse.json({
              success: false,
              message: 'ไม่สามารถลบ MC ท่านนี้ได้ เนื่องจากมีคิวไลฟ์สดที่เกี่ยวข้องในระบบ',
              bookings: bookingDetails
            }, { headers: corsHeaders });
          }
          await requestSupabase('DELETE', `mc_list?id=eq.${encodeURIComponent(p.id)}`);
          await logActivity(user, "DELETE_MC", p.name, `Deleted MC: ${p.name} (ID: ${p.id})`, clientIp, userAgent);
        }
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }

      default:
        return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400, headers: corsHeaders });
    }

  } catch (err: any) {
    console.error("API proxy execution error:", err);
    return NextResponse.json({ success: false, message: 'Database/Server error: ' + err.message }, { status: 500, headers: corsHeaders });
  }
}
