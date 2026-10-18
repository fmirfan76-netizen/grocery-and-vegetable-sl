import React, { useState } from 'react';
import { ShieldAlert, Lock, X, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../Logo';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { adminEmail, authError, clearAuthError, signInWithGoogle, signInWithPasskey, loading } = useAuth();
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setPasskeyError(null);
    clearAuthError();
    const ok = await signInWithGoogle();
    if (ok) {
      onSuccess();
    }
  };

  const handlePasskeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasskeyError(null);
    clearAuthError();
    if (!passkeyInput.trim()) {
      setPasskeyError('Please enter the Administrator Passkey.');
      return;
    }
    const ok = signInWithPasskey(passkeyInput.trim());
    if (ok) {
      setPasskeyInput('');
      onSuccess();
    } else {
      setPasskeyError('Access Denied: Incorrect Admin Security Passkey.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-center mb-2">
            <Logo size="md" textColor="text-white" subtextColor="text-emerald-200" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-xs font-semibold mt-2 border border-emerald-700">
            <Lock className="w-3.5 h-3.5 text-amber-300" />
            <span>Store Administrator Portal</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Error Message */}
          {(authError || passkeyError) && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Failed</p>
                <p className="text-[11px] mt-0.5">{authError || passkeyError}</p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-gray-700 font-bold">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Authorized Store Owner:</span>
            </div>
            <p className="font-mono text-[11px] text-emerald-950 bg-white px-2.5 py-1 rounded-lg border border-gray-200 font-bold truncate">
              {adminEmail}
            </p>
          </div>

          {/* Primary Google Auth */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 shadow-xs flex items-center justify-center gap-2.5 transition-all hover:border-gray-400 disabled:opacity-50 cursor-pointer"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-4 h-4"
            />
            <span>Sign In with Admin Google Account</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-200" />
            <span className="shrink mx-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              or master security passkey
            </span>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          {/* Master Passkey Form */}
          <form onSubmit={handlePasskeySubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Admin Master Passkey:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  placeholder="Enter administrator passkey..."
                  className="w-full text-xs px-3.5 py-2.5 pl-9 border border-gray-300 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50 font-mono"
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Unlock Admin Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="text-center pt-1">
            <button
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium cursor-pointer"
            >
              Cancel and Return to Customer Store
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
