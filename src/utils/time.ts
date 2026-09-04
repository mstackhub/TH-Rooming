export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return -1;
  const trimmed = String(timeStr).trim();
  // Strictly validate time format: ONLY digits and : or . (e.g. 09:00, 9:00, 13:30, 13.30)
  // No Thai letters (like ว, จ, น), no English characters, numbers only!
  if (!/^(?:0?[0-9]|1[0-9]|2[0-3])[:.][0-5][0-9]$|^23:59$|^24:00$/.test(trimmed)) {
    return -1;
  }
  const normalized = trimmed.replace('.', ':');
  const parts = normalized.split(':');
  if (parts.length !== 2) return -1;
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 24 || mm < 0 || mm > 59) return -1;
  if (hh === 23 && mm === 59) {
    return 1440;
  }
  return hh * 60 + mm;
}

export function minutesToTimeStr(mins: number): string {
  if (mins < 0) return "00:00";
  if (mins >= 1440) return "23:59";
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return String(hh).padStart(2, '0') + ":" + String(mm).padStart(2, '0');
}

export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const THAI_MONTH_NAMES = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return `${date.getDate()} ${THAI_MONTH_NAMES[date.getMonth()]} ${date.getFullYear() + 543}`;
}

export function getAutoStatus(booking: { date: string; startTime: string; endTime: string; status: string }): 'Confirmed' | 'Completed' | 'Cancelled' {
  if (booking.status === 'Cancelled') {
    return 'Cancelled';
  }

  const now = new Date();
  const localYear = now.getFullYear();
  const localMonth = String(now.getMonth() + 1).padStart(2, '0');
  const localDay = String(now.getDate()).padStart(2, '0');
  const todayStr = `${localYear}-${localMonth}-${localDay}`;
  
  const currentTotalMins = now.getHours() * 60 + now.getMinutes();
  const endMins = parseTimeToMinutes(booking.endTime);

  if (booking.date < todayStr) {
    return 'Completed';
  } else if (booking.date > todayStr) {
    return 'Confirmed';
  } else {
    // Today
    if (currentTotalMins < endMins) {
      return 'Confirmed';
    } else {
      return 'Completed';
    }
  }
}

export function generateBookingCustomId(
  booking: {
    id?: string;
    date?: string;
    roomName?: string;
    brandName?: string;
    startTime?: string;
    endTime?: string;
    lsArtworkLayout?: string;
  },
  allBookings?: Array<{
    id?: string;
    date?: string;
    roomName?: string;
    brandName?: string;
    startTime?: string;
    lsArtworkLayout?: string;
  }>
): string {
  // 1. If lsArtworkLayout contains a valid customId, return it
  if (booking.lsArtworkLayout) {
    try {
      const meta = JSON.parse(booking.lsArtworkLayout);
      if (meta && meta.customId && typeof meta.customId === 'string' && !meta.customId.includes('-') && /^\d{8}/.test(meta.customId)) {
        return meta.customId;
      }
    } catch (e) {}
  }

  // 2. If booking.id is already formatted as customId (starts with 8 digits and no UUID dashes)
  if (booking.id && /^\d{8}[A-Z0-9]+$/.test(booking.id)) {
    return booking.id;
  }

  // 3. Format Date: YYYYMMDD
  const formattedDate = (booking.date || '').replace(/[^0-9]/g, '').substring(0, 8) || '20260101';

  // 4. Brand Abbreviation
  let brandAbbr = 'XX';
  const rawBrand = (booking.brandName || '').trim().toUpperCase();
  if (rawBrand.startsWith('FOREMOST')) brandAbbr = 'FM';
  else if (rawBrand.startsWith('FINELINE')) brandAbbr = 'FL';
  else if (rawBrand.startsWith('EVERSENSE') || rawBrand.startsWith('EVERSENCE')) brandAbbr = 'ES';
  else if (rawBrand.startsWith('DNEE') || rawBrand.startsWith('D-NEE')) brandAbbr = 'DN';
  else if (rawBrand.startsWith('ARISTOTLE')) brandAbbr = 'AR';
  else if (rawBrand.startsWith('BENICE')) brandAbbr = 'BE';
  else if (rawBrand.startsWith('BIOSAFETY')) brandAbbr = 'BS';
  else if (rawBrand.startsWith('CLUB21')) brandAbbr = 'C21';
  else if (rawBrand.startsWith('BIG C')) brandAbbr = 'BC';
  else if (rawBrand.startsWith('TROS')) brandAbbr = 'TR';
  else if (rawBrand.startsWith('BABIMILD')) brandAbbr = 'BM';
  else if (rawBrand.startsWith('ROYAL CANIN')) brandAbbr = 'RC';
  else if (rawBrand.startsWith('BETAGROPET')) brandAbbr = 'BP';
  else if (rawBrand.startsWith('OCEANGLASS')) brandAbbr = 'OG';
  else if (rawBrand.startsWith('KEMISSARA')) brandAbbr = 'KM';
  else if (rawBrand.startsWith('BOSTANTEN')) brandAbbr = 'BT';
  else if (rawBrand.startsWith('GLORY')) brandAbbr = 'GL';
  else if (rawBrand.startsWith('TANDT') || rawBrand.startsWith('T&T')) brandAbbr = 'TT';
  else {
    const words = rawBrand.replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      brandAbbr = (words[0][0] + words[1][0]).substring(0, 2);
    } else if (words.length === 1) {
      const singleWord = words[0];
      if (singleWord.length >= 2) {
        brandAbbr = singleWord.substring(0, 2);
      } else {
        brandAbbr = singleWord + 'X';
      }
    }
  }

  // 5. Social / Platform (TT, FB, LZ, SP)
  let platformAbbr = 'TT'; // Default TikTok
  if (booking.lsArtworkLayout) {
    try {
      const parsedMeta = JSON.parse(booking.lsArtworkLayout);
      const rawChan = (parsedMeta.liveChannel === 'Other' ? (parsedMeta.customLiveChannel || '') : (parsedMeta.liveChannel || '')).trim().toUpperCase();
      if (rawChan.includes('FACEBOOK') || rawChan === 'FB') {
        platformAbbr = 'FB';
      } else if (rawChan.includes('TIKTOK') || rawChan.includes('TIK TOK') || rawChan === 'TT') {
        platformAbbr = 'TT';
      } else if (rawChan.includes('LAZADA') || rawChan === 'LZ') {
        platformAbbr = 'LZ';
      } else if (rawChan.includes('SHOPEE') || rawChan === 'SP') {
        platformAbbr = 'SP';
      } else if (rawChan) {
        const cleanedChan = rawChan.replace(/[^A-Z0-9]/g, '');
        if (cleanedChan.length >= 2) {
          platformAbbr = cleanedChan.substring(0, 2);
        } else if (cleanedChan.length === 1) {
          platformAbbr = cleanedChan + 'X';
        }
      }
    } catch (e) {}
  }

  // 6. Room Number (R01, R02, etc.)
  let roomNum = 'R00';
  if (booking.roomName) {
    const digits = booking.roomName.replace(/[^0-9]/g, '');
    if (digits) {
      roomNum = 'R' + digits.padStart(2, '0');
    } else {
      const cleanedRoom = booking.roomName.replace(/[^A-Z0-9]/g, '').toUpperCase();
      if (cleanedRoom.length >= 2) {
        roomNum = 'R' + cleanedRoom.substring(0, 2);
      } else {
        roomNum = 'R' + (cleanedRoom || 'X').padEnd(2, 'X');
      }
    }
  }

  const prefix = `${formattedDate}${brandAbbr}${platformAbbr}${roomNum}`;

  // 7. Sequence number
  let seq = 1;
  if (allBookings && allBookings.length > 0) {
    const samePrefix = allBookings.filter(b => {
      if (b.date !== booking.date) return false;
      if (booking.startTime && b.startTime && b.startTime < booking.startTime) return true;
      return false;
    });
    seq = samePrefix.length + 1;
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
}
