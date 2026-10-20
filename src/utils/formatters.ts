import { OrderStatus } from '../types';

export function formatLKR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rs. 0.00';
  }
  return `Rs. ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateLK(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleString('en-GB', {
      timeZone: 'Asia/Colombo',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}

export function normalizeSriLankanPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  // 9 digits without leading 0 (e.g. 771234567)
  if (digits.length === 9) {
    return `0${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  // 10 digits starting with 0 (e.g. 0771234567)
  if (digits.length === 10 && digits.startsWith('0')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  // 11 digits starting with 94 (e.g. 94771234567)
  if (digits.length === 11 && digits.startsWith('94')) {
    return `+94 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return phone.trim();
}

export function isValidSriLankanPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.replace(/[\s\-().]/g, '');
  
  // 1. Standard 10-digit Sri Lankan phone: 07X XXX XXXX or 011 / 066 (Matale)
  if (/^0[1-9][0-9]{8}$/.test(clean)) return true;
  
  // 2. 9-digit local phone entered without leading 0 (e.g. 771234567)
  if (/^[1-9][0-9]{8}$/.test(clean)) return true;
  
  // 3. International format with +94 or 94
  if (/^(?:\+?94)[1-9][0-9]{8}$/.test(clean)) return true;
  
  // 4. Any valid international phone with + country code (min 8, max 15 digits)
  if (/^\+[1-9][0-9]{7,14}$/.test(clean)) return true;
  
  return false;
}

export function cleanPhoneForWhatsApp(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '');
  
  // 9 digits entered without leading 0 (e.g. 771234567)
  if (clean.length === 9 && !clean.startsWith('0')) {
    return '94' + clean;
  }
  
  // 10 digits starting with 0 (e.g. 0771234567)
  if (clean.startsWith('0') && clean.length === 10) {
    return '94' + clean.slice(1);
  }
  
  // If it doesn't start with 94 and is not a 10+ digit international number
  if (!clean.startsWith('94') && clean.length <= 10) {
    clean = '94' + clean;
  }
  
  return clean;
}

export function getGoogleMapsPinUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function getStatusColor(status: OrderStatus): {
  bg: string;
  text: string;
  border: string;
  badge: string;
} {
  switch (status) {
    case 'Pending':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    case 'Confirmed':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-800 border-blue-300',
      };
    case 'Shopping':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'border-purple-200',
        badge: 'bg-purple-100 text-purple-800 border-purple-300',
      };
    case 'Packed':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-200',
        badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      };
    case 'Out for Delivery':
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-800',
        border: 'border-teal-200',
        badge: 'bg-teal-100 text-teal-800 border-teal-300',
      };
    case 'Delivered':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
    case 'Cancelled':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-200',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
      };
    default:
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-800',
        border: 'border-gray-200',
        badge: 'bg-gray-100 text-gray-800 border-gray-300',
      };
  }
}

export function playNewOrderSound(): void {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
    osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.25); // D6

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.65);
  } catch (e) {
    console.log('Audio playback note:', e);
  }
}
