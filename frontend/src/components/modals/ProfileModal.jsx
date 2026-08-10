import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  X,
  Check,
  KeyRound,
  Mail,
  UserCheck,
  Save
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import * as authService from '../services/authServices';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, setUser } = useUser();
  
  // Profile Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(user?.name || '');
      setEmail(user?.email || '');
      setProfileError('');
      setProfileSuccessMsg('');
      setPasswordError('');
      setPasswordSuccess('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    setProfileError('');
    setProfileSuccessMsg('');

    if (!trimmedName) {
      setProfileError('Please enter your full name.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setProfileError('Please enter a valid email address.');
      return;
    }

    setIsSavingProfile(true);

    const result = await authService.updateProfile({ name: trimmedName, email: trimmedEmail });
    setIsSavingProfile(false);

    if (!result.success) {
      setProfileError(result.message || 'Profile update failed.');
      return;
    }

    if (setUser && result.user) {
      setUser(result.user);
    } else if (setUser && user) {
      setUser({ ...user, name: trimmedName, email: trimmedEmail });
    }

    setName(result.user?.name || trimmedName);
    setEmail(result.user?.email || trimmedEmail);
    setProfileSuccessMsg(result.message || 'Profile updated successfully!');
    setTimeout(() => setProfileSuccessMsg(''), 3000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password.');
      return;
    }

    setIsSavingPassword(true);
    const result = await authService.changePassword({ currentPassword, newPassword });
    setIsSavingPassword(false);

    if (!result.success) {
      setPasswordError(result.message || 'Password update failed.');
      return;
    }

    setPasswordSuccess(result.message || 'Password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(''), 3500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-md transition-all animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-5 py-4 text-white border-b border-white/10 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-indigo-300 border border-white/15 shadow-inner">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Account Profile
              </h2>
              <p className="text-xs text-slate-300">
                Manage your personal profile and account credentials
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Profile Card Header */}
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 p-4 sm:p-5 shadow-2xs">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold text-2xl shadow-md">
              {(name || user?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left space-y-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg font-bold text-slate-900 truncate">{name || user?.name || 'User'}</h3>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 capitalize border border-indigo-200">
                  {user?.role || 'Admin'}
                </span>
                {user?.workerType && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 capitalize border border-emerald-200">
                    {user.workerType}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{email || user?.email || 'N/A'}</span>
              </p>
            </div>
          </div>

          {/* Profile Details Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <UserCheck className="h-4 w-4 text-indigo-600" />
              Personal Information
            </h4>

            {profileSuccessMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800">
                {profileError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSavingProfile}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSavingProfile}
                  placeholder="your.email@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                <span>{isSavingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>

          {/* Password Change Form */}
          <form onSubmit={handleChangePassword} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <KeyRound className="h-4 w-4 text-indigo-600" />
              Security & Password
            </h4>

            {passwordError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isSavingPassword}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSavingPassword}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSavingPassword}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingPassword}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4 text-indigo-300" />
                <span>{isSavingPassword ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
