export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return -1;
  const parts = timeStr.split(":");
  if (parts.length < 2) return -1;
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  if (isNaN(hh) || isNaN(mm)) return -1;
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

