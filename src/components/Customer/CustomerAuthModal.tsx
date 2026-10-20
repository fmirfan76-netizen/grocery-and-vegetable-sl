import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  Lock, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Home, 
  ShoppingBag, 
  ArrowRight, 
  AlertCircle, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  LogOut,
  Map,
  RotateCcw,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';
import { useCart } from '../../context/CartContext';
import { MATALE_AREAS } from '../../services/seedData';
import { 
  formatLKR, 
  formatDateLK, 
  isValidSriLankanPhone, 
  getStatusColor, 
  cleanPhoneForWhatsApp,
  normalizeSriLankanPhone,
  getGoogleMapsPinUrl
} from '../../utils/formatters';
import { getAdminWhatsAppUrl, buildAdminOrderWhatsAppMessage } from '../../utils/bankAndWhatsApp';
import { Order } from '../../types';
import { logoImage } from '../Logo';
import { LocationMapPicker } from './LocationMapPicker';

function getSriLankanCarrier(phone: string): { name: string; color: string } {
  const digits = phone.replace(/[^0-9]/g, '');
  let prefix = '';
  if (digits.startsWith('0') && digits.length >= 3) {
    prefix = digits.slice(0, 3);
  } else if (digits.startsWith('94') && digits.length >= 4) {
    prefix = '0' + digits.slice(2, 4);
  } else if (digits.length >= 2) {
    prefix = '0' + digits.slice(0, 2);
  }

  if (['077', '076', '074'].includes(prefix)) {
    return { name: 'Dialog Axiata 4G/5G', color: 'bg-red-50 text-red-800 border-red-200' };
  }
  if (['071', '070'].includes(prefix)) {
    return { name: 'SLT Mobitel 4G', color: 'bg-blue-50 text-blue-800 border-blue-200' };
  }
  if (['078', '072'].includes(prefix)) {
    return { name: 'Hutchison 4G', color: 'bg-amber-50 text-amber-800 border-amber-200' };
  }
  if (['075'].includes(prefix)) {
    return { name: 'Airtel Sri Lanka', color: 'bg-rose-50 text-rose-800 border-rose-200' };
  }
  if (['066'].includes(prefix)) {
    return { name: 'Matale SLT Landline', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  }
  return { name: 'Sri Lankan Local Line', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
}

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackOrder?: (orderId: string) => void;
  isCheckoutPending?: boolean;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onTrackOrder,
  isCheckoutPending = false,
}) => {
  const {
    customer,
    isLoading,
    customerOrders,
    ordersLoading,
    authModalTab,
    openAuthModal,
    signup,
    login,
    logout,
    addNewLocation,
    selectLocation,
    deleteLocation,
    refreshOrders,
  } = useCustomer();

  const { setSelectedArea } = useCart();

  // Multi-step signup state: 'info' -> 'otp' -> 'location'
  const [signupStep, setSignupStep] = useState<'info' | 'otp' | 'location'>('info');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPin, setSignupPin] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const [simulatedSmsBanner, setSimulatedSmsBanner] = useState<string | null>(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(false);

  // Map & location state in signup
  const [showMapInSignup, setShowMapInSignup] = useState<boolean>(true);
  const [signupArea, setSignupArea] = useState(MATALE_AREAS[0].name);
  const [signupAddress, setSignupAddress] = useState('');
  const [signupLabel, setSignupLabel] = useState('Home');
  const [signupInstructions, setSignupInstructions] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat?: number; lng?: number }>({});

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Add location form state (in Saved Locations tab)
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [showMapInAddLoc, setShowMapInAddLoc] = useState(false);
  const [newLocLabel, setNewLocLabel] = useState('Home');
  const [newLocArea, setNewLocArea] = useState(MATALE_AREAS[0].name);
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocInstructions, setNewLocInstructions] = useState('');
  const [newLocAsCurrent, setNewLocAsCurrent] = useState(true);
  const [newLocCoords, setNewLocCoords] = useState<{ lat?: number; lng?: number }>({});

  // Status and feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // OTP Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  useEffect(() => {
    setFormError(null);
    setSuccessMessage(null);
    if (customer?.phone) {
      refreshOrders();
    }
  }, [authModalTab, customer?.phone, refreshOrders]);

  if (!isOpen) return null;

  // Step 1: Send OTP to verify phone authenticity
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!signupName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!signupPhone.trim() || !isValidSriLankanPhone(signupPhone)) {
      setFormError('Please enter a valid Sri Lankan mobile number (e.g. 077 123 4567, 77 123 4567, or +94 77 123 4567).');
      return;
    }

    const normalized = normalizeSriLankanPhone(signupPhone);
    setSignupPhone(normalized);

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setEnteredOtp('');
    setOtpCountdown(30);
    setSimulatedSmsBanner(`Your Matale Fresh verification code is ${code}. Valid for 5 minutes.`);
    setSignupStep('otp');
  };

  // Instant 1-tap Auto-fill and verify
  const handleInstantAutoVerify = () => {
    setEnteredOtp(generatedOtp);
    setIsPhoneVerified(true);
    setSuccessMessage('✓ Mobile authenticity confirmed successfully!');
    setTimeout(() => {
      setSuccessMessage(null);
      setSignupStep('location');
    }, 400);
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanInput = enteredOtp.trim().replace(/\D/g, '');
    if (cleanInput.length !== 6) {
      setFormError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (cleanInput !== generatedOtp.trim()) {
      setFormError('Invalid verification code. Please check the code or tap Resend.');
      return;
    }

    setIsPhoneVerified(true);
    setSuccessMessage('✓ Mobile number authenticity confirmed successfully!');
    setTimeout(() => {
      setSuccessMessage(null);
      setSignupStep('location');
    }, 700);
  };

  // Resend OTP
  const handleResendOtp = () => {
    if (otpCountdown > 0) return;
    setFormError(null);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpCountdown(30);
    setSimulatedSmsBanner(`New verification code sent: ${code}. Valid for 5 minutes.`);
  };

  // Step 3: Complete Sign Up with Stored Location & Map Pin
  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!signupAddress.trim()) {
      setFormError('Please provide your delivery street address / landmark in Matale or mark on map.');
      return;
    }

    const res = await signup({
      fullName: signupName.trim(),
      phone: signupPhone.trim(),
      pin: signupPin.trim() || '1234',
      isVerified: true,
      initialLocation: {
        area: signupArea,
        streetAddress: signupAddress.trim(),
        label: signupLabel,
        deliveryInstructions: signupInstructions.trim(),
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng,
      },
    });

    if (res.success && res.user) {
      const areaObj = MATALE_AREAS.find((a) => a.name === signupArea);
      if (areaObj) setSelectedArea(areaObj);
      setSuccessMessage('Account created and delivery location verified!');
      setTimeout(() => {
        openAuthModal('orders');
      }, 1000);
    } else {
      setFormError(res.error || 'Failed to complete registration. Please try again.');
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!loginPhone.trim()) {
      setFormError('Please enter your mobile phone number.');
      return;
    }

    const res = await login(loginPhone.trim(), loginPin.trim() || undefined);
    if (res.success && res.user) {
      if (res.user.currentLocation?.area) {
        const areaObj = MATALE_AREAS.find((a) => a.name === res.user?.currentLocation?.area);
        if (areaObj) setSelectedArea(areaObj);
      }
      setSuccessMessage(`Welcome back, ${res.user.fullName}!`);
      setTimeout(() => {
        openAuthModal('orders');
      }, 800);
    } else {
      setFormError(res.error || 'Account not found. Please sign up to create a new profile.');
    }
  };

  // Handle Add Location in Saved Locations tab
  const handleAddLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newLocAddress.trim()) {
      setFormError('Please enter the street address in Matale.');
      return;
    }

    await addNewLocation({
      label: newLocLabel,
      area: newLocArea,
      streetAddress: newLocAddress.trim(),
      deliveryInstructions: newLocInstructions.trim(),
      latitude: newLocCoords.lat,
      longitude: newLocCoords.lng,
      setAsCurrent: newLocAsCurrent,
    });

    if (newLocAsCurrent) {
      const areaObj = MATALE_AREAS.find((a) => a.name === newLocArea);
      if (areaObj) setSelectedArea(areaObj);
    }

    setIsAddingLocation(false);
    setShowMapInAddLoc(false);
    setNewLocAddress('');
    setNewLocInstructions('');
    setNewLocCoords({});
    setSuccessMessage('New delivery location saved successfully!');
  };

  const handleCopyOrder = (order: Order) => {
    const text = buildAdminOrderWhatsAppMessage(order);
    navigator.clipboard.writeText(text);
    setCopiedOrderId(order.id);
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 shrink-0 overflow-hidden shadow-xs">
              <img src={logoImage} alt="Matale Fresh" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                {customer ? `Welcome, ${customer.fullName}` : 'Customer Account & Locations'}
              </h2>
              <p className="text-xs text-emerald-200">
                {customer
                  ? `Phone: +${customer.phone} • Verified Member`
                  : 'Mobile OTP verification & map delivery location'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-4 pt-2 gap-1 overflow-x-auto text-xs font-bold scrollbar-none">
          {!customer ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setSignupStep('info');
                  openAuthModal('signup');
                }}
                className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                  authModalTab === 'signup'
                    ? 'border-emerald-600 text-emerald-900 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <User className="w-4 h-4 text-emerald-600" />
                <span>Sign Up & Verify Phone</span>
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                  authModalTab === 'login'
                    ? 'border-emerald-600 text-emerald-900 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Log In (Mobile Number)</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthModal('orders')}
                className={`px-3 sm:px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                  authModalTab === 'orders'
                    ? 'border-emerald-600 text-emerald-900 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Package className="w-4 h-4 text-emerald-600" />
                <span>My Orders ({customerOrders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => openAuthModal('locations')}
                className={`px-3 sm:px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                  authModalTab === 'locations'
                    ? 'border-emerald-600 text-emerald-900 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Saved Locations ({customer.savedLocations?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className={`px-3 sm:px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                  authModalTab === 'signup'
                    ? 'border-emerald-600 text-emerald-900 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <User className="w-4 h-4 text-emerald-600" />
                <span>My Profile</span>
              </button>
            </>
          )}
        </div>

        {/* Checkout Pending Notice if redirected from Cart */}
        {isCheckoutPending && !customer && (
          <div className="mx-6 mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-center gap-2.5 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              🛒
            </div>
            <div className="flex-1">
              <p className="font-extrabold text-amber-950 text-xs">Login Required to Complete Checkout</p>
              <p className="text-[11px] text-amber-800">
                Please log in or sign up with your mobile number. You'll be immediately taken to complete your delivery order!
              </p>
            </div>
          </div>
        )}

        {/* Feedback Alerts */}
        <div className="px-6 pt-3">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ============================================================ */}
          {/* TAB 1: SIGN UP WITH MOBILE OTP & MAP MARKING */}
          {/* ============================================================ */}
          {authModalTab === 'signup' && (
            <div>
              {!customer ? (
                <div>
                  {/* Step Progress Indicators */}
                  <div className="flex items-center justify-between mb-5 px-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                        signupStep === 'info'
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {signupStep === 'info' ? '1' : '✓'}
                      </div>
                      <span className={`text-xs font-bold ${signupStep === 'info' ? 'text-emerald-950 font-black' : 'text-gray-500'}`}>
                        1. Mobile Info
                      </span>
                    </div>

                    <div className="h-0.5 w-8 bg-gray-200" />

                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                        signupStep === 'otp'
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                          : isPhoneVerified
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isPhoneVerified ? '✓' : '2'}
                      </div>
                      <span className={`text-xs font-bold ${signupStep === 'otp' ? 'text-emerald-950 font-black' : 'text-gray-500'}`}>
                        2. Verify OTP
                      </span>
                    </div>

                    <div className="h-0.5 w-8 bg-gray-200" />

                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                        signupStep === 'location'
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        3
                      </div>
                      <span className={`text-xs font-bold ${signupStep === 'location' ? 'text-emerald-950 font-black' : 'text-gray-500'}`}>
                        3. Mark on Map
                      </span>
                    </div>
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* SIGNUP STEP 1: Full Name & Mobile Number */}
                  {/* ---------------------------------------------------- */}
                  {signupStep === 'info' && (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 text-xs text-emerald-900 flex items-start gap-2.5">
                        <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-emerald-950">
                            Mobile Number Authenticity Verification
                          </p>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Enter your mobile phone number. We will send a secure 6-digit OTP code to verify your account's authenticity before marking your delivery location.
                          </p>
                        </div>
                      </div>

                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={signupName}
                            onChange={(e) => setSignupName(e.target.value)}
                            placeholder="e.g., Nuwan Senanayake"
                            className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50"
                          />
                        </div>
                      </div>

                      {/* Sri Lankan Phone */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-gray-800">
                            Sri Lankan Mobile Number <span className="text-rose-500">*</span>
                          </label>
                          {signupPhone.trim().length >= 3 && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getSriLankanCarrier(signupPhone).color}`}>
                              {getSriLankanCarrier(signupPhone).name}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                          <input
                            type="tel"
                            required
                            value={signupPhone}
                            onChange={(e) => setSignupPhone(e.target.value)}
                            placeholder="077 123 4567 or 77 123 4567 or +94 77 123 4567"
                            className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50 font-mono"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 flex items-center justify-between">
                          <span>Works with all Dialog, Mobitel, Hutch & Airtel local numbers</span>
                          <span className="text-emerald-700 font-bold">Local & Int'l supported</span>
                        </p>
                      </div>

                      {/* Optional PIN */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Set 4-Digit Quick PIN (Optional)
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                          <input
                            type="password"
                            maxLength={6}
                            value={signupPin}
                            onChange={(e) => setSignupPin(e.target.value)}
                            placeholder="Default 1234 (for easy re-login)"
                            className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50 font-mono tracking-widest"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <span>Generate & Send Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => openAuthModal('login')}
                          className="text-xs text-emerald-700 font-bold hover:underline"
                        >
                          Already have an account? Log In with Mobile Number
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* SIGNUP STEP 2: OTP Verification & Authenticity */}
                  {/* ---------------------------------------------------- */}
                  {signupStep === 'otp' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in duration-150">
                      {/* Notice explaining telecom SMS and why code is generated on screen */}
                      <div className="p-3.5 bg-emerald-950 text-white rounded-2xl shadow-md border border-emerald-500/40 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Mobile Authenticity Verification</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-800/80 text-[10px] text-emerald-200 border border-emerald-600">
                            {getSriLankanCarrier(signupPhone).name}
                          </span>
                        </div>

                        <div className="bg-emerald-900/60 p-2.5 rounded-xl border border-emerald-700/50 text-[11px] text-emerald-100 leading-relaxed">
                          <p className="font-semibold text-white mb-0.5">
                            ℹ️ Did not receive an SMS on your phone?
                          </p>
                          <p className="text-[10px] text-emerald-200">
                            Sri Lankan carrier SMS requires enterprise telecom gateway routing. To prevent any network delays, your authentic 6-digit verification code is generated directly below. You can send it to your WhatsApp or tap <strong>Instant Auto-Fill & Verify</strong>.
                          </p>
                        </div>

                        {/* Digits Display Box */}
                        <div className="bg-black/40 p-3 rounded-xl border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold block mb-1">
                              Your Verification Code:
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-xl font-black text-amber-300 tracking-wider">
                              {generatedOtp.split('').map((char, idx) => (
                                <span
                                  key={idx}
                                  className="w-7 h-8 bg-emerald-900/90 rounded border border-emerald-400 flex items-center justify-center text-white font-extrabold shadow-inner"
                                >
                                  {char}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Quick 1-tap Auto-Fill Button */}
                          <button
                            type="button"
                            onClick={handleInstantAutoVerify}
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>⚡ Auto-Fill & Continue</span>
                          </button>
                        </div>

                        {/* Alternative Channels: WhatsApp & Native SMS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <a
                            href={`https://api.whatsapp.com/send?phone=${cleanPhoneForWhatsApp(signupPhone)}&text=${encodeURIComponent(
                              `Your Matale Fresh verification code is: ${generatedOtp}. Enter this 6-digit code in the app to authenticate your mobile number.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Send Code to My WhatsApp</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>

                          <a
                            href={`sms:${cleanPhoneForWhatsApp(signupPhone)}?body=${encodeURIComponent(
                              `Your Matale Fresh verification code is: ${generatedOtp}`
                            )}`}
                            className="px-3 py-2 bg-teal-800/80 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-teal-600 transition-colors"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Open in Mobile SMS App</span>
                          </a>
                        </div>
                      </div>

                      {/* Manual Entry Form */}
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center space-y-2">
                        <p className="text-xs font-bold text-gray-800">
                          Confirm 6-Digit Code for:
                        </p>
                        <p className="font-mono text-sm font-extrabold text-emerald-900 bg-white px-3 py-1 rounded-xl inline-block border border-gray-200">
                          {signupPhone}
                        </p>
                        <div>
                          <button
                            type="button"
                            onClick={() => setSignupStep('info')}
                            className="text-[11px] text-gray-500 hover:text-emerald-700 underline cursor-pointer"
                          >
                            Wrong phone number? Change
                          </button>
                        </div>

                        {/* 6-Digit Code Input */}
                        <div className="pt-2">
                          <input
                            type="text"
                            maxLength={6}
                            autoFocus
                            value={enteredOtp}
                            onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="• • • • • •"
                            className="w-48 text-center text-2xl font-mono font-black tracking-widest py-2 border-2 border-emerald-500 rounded-xl bg-white focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20 text-gray-950 mx-auto"
                          />
                        </div>

                        {/* Resend OTP */}
                        <div className="pt-2 flex items-center justify-center gap-3 text-xs">
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={otpCountdown > 0}
                            className={`flex items-center gap-1 font-bold ${
                              otpCountdown > 0
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-emerald-700 hover:underline cursor-pointer'
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>
                              {otpCountdown > 0 ? `Generate New Code in ${otpCountdown}s` : 'Generate New Code'}
                            </span>
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Confirm Authenticity & Continue to Location Map</span>
                      </button>
                    </form>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* SIGNUP STEP 3: Mark Current Location Using Map */}
                  {/* ---------------------------------------------------- */}
                  {signupStep === 'location' && (
                    <form onSubmit={handleCompleteSignup} className="space-y-4 animate-in fade-in duration-150">
                      <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                            ✓
                          </div>
                          <div>
                            <span className="font-extrabold text-emerald-950">
                              Mobile Number Authenticated
                            </span>
                            <span className="text-[10px] text-emerald-800 block font-mono">
                              +{signupPhone}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 font-black px-2 py-0.5 rounded-full">
                          Authenticity Verified
                        </span>
                      </div>

                      {/* Map Toggle & Picker */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            <span>Mark Your Location on Map</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => setShowMapInSignup(!showMapInSignup)}
                            className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            <Map className="w-3.5 h-3.5" />
                            <span>{showMapInSignup ? 'Hide Map' : 'Open Interactive Map'}</span>
                          </button>
                        </div>

                        {showMapInSignup && (
                          <LocationMapPicker
                            compact={true}
                            initialArea={signupArea}
                            initialLat={selectedCoords.lat}
                            initialLng={selectedCoords.lng}
                            onLocationSelect={(loc) => {
                              setSelectedCoords({ lat: loc.lat, lng: loc.lng });
                              setSignupArea(loc.area);
                              if (loc.streetAddress) {
                                setSignupAddress(loc.streetAddress);
                              } else if (!signupAddress.trim()) {
                                setSignupAddress(`Near ${loc.area}, Matale`);
                              }
                            }}
                          />
                        )}
                      </div>

                      {/* Location Label Selector */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-bold text-gray-700">Location Label:</span>
                        <div className="flex gap-1">
                          {['Home', 'Work', 'Shop', 'Other'].map((lbl) => (
                            <button
                              key={lbl}
                              type="button"
                              onClick={() => setSignupLabel(lbl)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                signupLabel === lbl
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white text-gray-700 border border-gray-200'
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Matale Area */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Delivery Area in Matale <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={signupArea}
                          onChange={(e) => setSignupArea(e.target.value)}
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:border-emerald-600 focus:outline-hidden"
                        >
                          {MATALE_AREAS.map((a) => (
                            <option key={a.name} value={a.name}>
                              {a.name} (Delivery: {formatLKR(a.deliveryFee)} • {a.estMinutes})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Street Address */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Street Address & Landmark <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={signupAddress}
                          onChange={(e) => setSignupAddress(e.target.value)}
                          placeholder="e.g. No. 42 Mandandawela Road, near St. Thomas' College ground..."
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>

                      {/* Gate / Delivery Instructions */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Gate / Delivery Instructions (Optional)
                        </label>
                        <input
                          type="text"
                          value={signupInstructions}
                          onChange={(e) => setSignupInstructions(e.target.value)}
                          placeholder="e.g. Ring bell, call upon arrival..."
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        {isLoading ? (
                          <span>Saving Account...</span>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Complete Sign Up & Save Location</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* Profile summary for logged-in user */
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                        {customer.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-950 text-sm">
                          {customer.fullName}
                        </h3>
                        <p className="text-xs text-emerald-800 font-mono">
                          +{customer.phone}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Phone Authenticity Confirmed</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={logout}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-lg font-black text-emerald-950">
                        {customerOrders.length}
                      </p>
                      <p className="text-[11px] text-gray-500 font-bold">Total Orders Placed</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-lg font-black text-emerald-950">
                        {customer.savedLocations?.length || 0}
                      </p>
                      <p className="text-[11px] text-gray-500 font-bold">Saved Locations</p>
                    </div>
                  </div>

                  {customer.currentLocation && (
                    <div className="p-4 bg-white rounded-2xl border-2 border-emerald-300 space-y-1 text-xs shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          <span>Active Current Delivery Location:</span>
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">
                          {customer.currentLocation.label || 'Home'}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900">{customer.currentLocation.streetAddress}</p>
                      <p className="text-gray-600">Area: {customer.currentLocation.area}</p>
                      {customer.currentLocation.latitude && customer.currentLocation.longitude && (
                        <p className="text-[10px] text-emerald-800 font-mono">
                          GPS: {customer.currentLocation.latitude.toFixed(4)}, {customer.currentLocation.longitude.toFixed(4)}
                        </p>
                      )}
                      {customer.currentLocation.deliveryInstructions && (
                        <p className="text-[11px] text-gray-500 italic">
                          Note: {customer.currentLocation.deliveryInstructions}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => openAuthModal('orders')}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      <span>Check Previous & Current Orders</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openAuthModal('locations')}
                      className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-emerald-700" />
                      <span>Manage Locations</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: LOG IN */}
          {/* ============================================================ */}
          {authModalTab === 'login' && !customer && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 text-xs text-emerald-900 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-emerald-950">
                    Log In with Mobile Number
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Enter your Sri Lankan phone number to access your stored delivery addresses and live order statuses.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Mobile Number (WhatsApp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="077 123 4567 or 071 987 6543"
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  4-Digit Access PIN (Optional)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    maxLength={6}
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    placeholder="Default is 1234 (or your custom PIN)"
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50 font-mono tracking-widest"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <span>Logging in...</span>
                ) : (
                  <>
                    <span>Log In to My Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  New customer? Sign Up with Mobile & Mark Location on Map
                </button>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* TAB 3: MY ORDERS & STATUS */}
          {/* ============================================================ */}
          {authModalTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                    Your Orders & Live Delivery Status
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Live updates from Matale Pola and Supermarket dispatch
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshOrders}
                  disabled={ordersLoading}
                  className="text-[11px] text-emerald-700 font-bold hover:underline"
                >
                  {ordersLoading ? 'Refreshing...' : '↻ Refresh'}
                </button>
              </div>

              {customerOrders.length === 0 ? (
                <div className="text-center py-10 space-y-3 bg-gray-50/60 rounded-2xl border border-gray-100">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl font-bold">
                    📦
                  </div>
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-sm">
                      No Orders Placed Yet
                    </h4>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                      When you order fresh vegetables, fruit, halal meat, or groceries, your orders and live delivery progress will appear here.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    Start Shopping Fresh Items
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {customerOrders.map((ord) => {
                    const statusConfig = getStatusColor(ord.status);
                    const isCopied = copiedOrderId === ord.id;

                    return (
                      <div
                        key={ord.id}
                        className="p-4 bg-white rounded-2xl border border-gray-200/90 hover:border-emerald-300 transition-all shadow-xs space-y-3"
                      >
                        {/* Order Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-black text-gray-950">
                                {ord.id}
                              </span>
                              <span
                                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${statusConfig.badge}`}
                              >
                                {ord.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {formatDateLK(ord.createdAt)} • {ord.area}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="font-extrabold text-sm text-emerald-950">
                              {formatLKR(ord.actualTotalAmount || ord.totalAmount)}
                            </span>
                            <p className="text-[10px] text-gray-500 capitalize">
                              {ord.paymentMethod === 'bank_transfer' ? '🏦 Bank Transfer' : '💵 Cash on Delivery'}
                            </p>
                          </div>
                        </div>

                        {/* Items Preview */}
                        <div className="text-xs text-gray-600 space-y-1">
                          <p className="font-bold text-gray-800 text-[11px]">
                            Items ({ord.items.length}):
                          </p>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            {ord.items.slice(0, 5).map((it, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded-md"
                              >
                                {it.productName} × {it.quantity}
                              </span>
                            ))}
                            {ord.items.length > 5 && (
                              <span className="text-[10px] text-gray-400 self-center">
                                +{ord.items.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                          {onTrackOrder && (
                            <button
                              type="button"
                              onClick={() => {
                                onTrackOrder(ord.id);
                                onClose();
                              }}
                              className="flex-1 py-2 px-3 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Track Status Live</span>
                            </button>
                          )}

                          <a
                            href={getAdminWhatsAppUrl(ord)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-white" />
                            <span>WhatsApp Details</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyOrder(ord)}
                            className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors"
                            title="Copy Order Text"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: SAVED DELIVERY LOCATIONS WITH MAP PICKER */}
          {/* ============================================================ */}
          {authModalTab === 'locations' && customer && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                    Your Stored Delivery Locations
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Select your active delivery address in Matale for instant checkout
                  </p>
                </div>

                {!isAddingLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingLocation(true);
                      setShowMapInAddLoc(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Location</span>
                  </button>
                )}
              </div>

              {/* Add Location Form with Map Pinning */}
              {isAddingLocation && (
                <form onSubmit={handleAddLocationSubmit} className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>Add New Delivery Location</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingLocation(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Interactive Map Picker Toggle */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900">
                        Mark on Interactive Matale Map:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMapInAddLoc(!showMapInAddLoc)}
                        className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <Map className="w-3.5 h-3.5" />
                        <span>{showMapInAddLoc ? 'Hide Map' : 'Show Map'}</span>
                      </button>
                    </div>

                    {showMapInAddLoc && (
                      <LocationMapPicker
                        compact={true}
                        initialArea={newLocArea}
                        initialLat={newLocCoords.lat}
                        initialLng={newLocCoords.lng}
                        onLocationSelect={(loc) => {
                          setNewLocCoords({ lat: loc.lat, lng: loc.lng });
                          setNewLocArea(loc.area);
                          if (loc.streetAddress) {
                            setNewLocAddress(loc.streetAddress);
                          } else if (!newLocAddress.trim()) {
                            setNewLocAddress(`Near ${loc.area}, Matale`);
                          }
                        }}
                      />
                    )}
                  </div>

                  <div className="flex gap-2">
                    {['Home', 'Work', 'Shop', 'Other'].map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setNewLocLabel(lbl)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          newLocLabel === lbl
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-200'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Matale Area
                    </label>
                    <select
                      value={newLocArea}
                      onChange={(e) => setNewLocArea(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:border-emerald-600 focus:outline-hidden"
                    >
                      {MATALE_AREAS.map((a) => (
                        <option key={a.name} value={a.name}>
                          {a.name} (Delivery: {formatLKR(a.deliveryFee)} • {a.estMinutes})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Street Address & Landmark <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={newLocAddress}
                      onChange={(e) => setNewLocAddress(e.target.value)}
                      placeholder="e.g. No. 18, Hulangamuwa Road, opposite dispensary..."
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Delivery / Gate Instructions
                    </label>
                    <input
                      type="text"
                      value={newLocInstructions}
                      onChange={(e) => setNewLocInstructions(e.target.value)}
                      placeholder="e.g. Ring bell, leave with security..."
                      className="w-full text-xs p-2 border border-gray-200 rounded-xl bg-white focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="setAsCurrent"
                      checked={newLocAsCurrent}
                      onChange={(e) => setNewLocAsCurrent(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <label htmlFor="setAsCurrent" className="text-xs text-gray-800 font-bold cursor-pointer">
                      Set as my active current delivery location
                    </label>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      Save Location
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingLocation(false)}
                      className="py-2.5 px-3 bg-white border border-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Locations List */}
              <div className="space-y-3">
                {(!customer.savedLocations || customer.savedLocations.length === 0) ? (
                  <p className="text-xs text-gray-500 italic text-center py-6">
                    No locations saved yet. Tap "Add Location" to store your delivery address.
                  </p>
                ) : (
                  customer.savedLocations.map((loc) => {
                    const isCurrent = customer.currentLocation?.id === loc.id || loc.isDefault;

                    return (
                      <div
                        key={loc.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCurrent
                            ? 'bg-emerald-50/60 border-2 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-gray-950 flex items-center gap-1.5">
                                <MapPin className={`w-4 h-4 ${isCurrent ? 'text-emerald-600' : 'text-gray-400'}`} />
                                <span>{loc.label || 'Home'}</span>
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.2 rounded-full">
                                  Current Active Location
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-gray-900 text-xs mt-1">
                              {loc.streetAddress}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Area: <strong>{loc.area}</strong>
                              {loc.latitude && loc.longitude && (
                                <span className="text-emerald-700 ml-1.5 font-mono">
                                  ({loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)})
                                </span>
                              )}
                            </p>
                            {loc.deliveryInstructions && (
                              <p className="text-[10px] text-gray-400 italic mt-0.5">
                                Instructions: {loc.deliveryInstructions}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await selectLocation(loc.id);
                                  const areaObj = MATALE_AREAS.find((a) => a.name === loc.area);
                                  if (areaObj) setSelectedArea(areaObj);
                                }}
                                className="px-2.5 py-1 bg-white border border-emerald-400 hover:bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-lg transition-colors"
                              >
                                Set as Current
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteLocation(loc.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors"
                              title="Delete Location"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
