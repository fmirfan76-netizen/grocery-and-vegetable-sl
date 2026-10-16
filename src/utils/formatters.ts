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

export function isValidSriLankanPhone(phone: string): boolean {
  // Allow formats like: 0771234567, 077 123 4567, +94771234567, 0662223481
  const clean = phone.replace(/[\s\-()]/g, '');
  return /^(?:0|\+94)[1-9][0-9]{8}$/.test(clean);
}

export function cleanPhoneForWhatsApp(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '94' + clean.slice(1);
  } else if (!clean.startsWith('94')) {
    clean = '94' + clean;
  }
  return clean;
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
