'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/useAuthStore';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  timezone: string | null;
  notifyOnCrSubmitted: boolean;
  notifyOnCrReturned: boolean;
  notifyOnCrApproved: boolean;
  notifyOnCrDeclined: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  DELIVERY_MANAGER: 'Delivery Manager',
  PRODUCT_OWNER: 'Product Owner',
  FINANCE: 'Finance',
};

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Karachi',
  'Asia/Riyadh', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
];

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, token, setAuth } = useAuthStore();

  const [profileForm, setProfileForm] = useState({ name: '', phone: '', timezone: 'UTC' });
  const [notifForm, setNotifForm] = useState({
    notifyOnCrSubmitted: true,
    notifyOnCrReturned: true,
    notifyOnCrApproved: true,
    notifyOnCrDeclined: true,
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data.data as ProfileData;
    },
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({ name: profile.name, phone: profile.phone ?? '', timezone: profile.timezone ?? 'UTC' });
      setNotifForm({
        notifyOnCrSubmitted: profile.notifyOnCrSubmitted,
        notifyOnCrReturned: profile.notifyOnCrReturned,
        notifyOnCrApproved: profile.notifyOnCrApproved,
        notifyOnCrDeclined: profile.notifyOnCrDeclined,
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof profileForm & typeof notifForm) => apiClient.patch('/auth/me', data),
    onSuccess: (res) => {
      setProfileSuccess('Profile updated successfully.');
      setProfileError('');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      if (user && token) setAuth({ ...user, name: res.data.data.name }, token);
      setTimeout(() => setProfileSuccess(''), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update profile.';
      setProfileError(msg);
      setProfileSuccess('');
    },
  });

  const changePwMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/auth/me/change-password', data),
    onSuccess: () => {
      setPwSuccess('Password changed successfully.');
      setPwError('');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwSuccess(''), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to change password.';
      setPwError(msg);
      setPwSuccess('');
    },
  });

  const handleProfileSave = () => {
    if (!profileForm.name.trim()) { setProfileError('Name is required.'); return; }
    setProfileError('');
    updateMutation.mutate({ ...profileForm, ...notifForm });
  };

  const handlePasswordChange = () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) { setPwError('All fields are required.'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('New passwords do not match.'); return; }
    if (pwForm.newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    setPwError('');
    changePwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  };

  if (isLoading) {
    return (
      <PageWrapper title="Profile">
        <div className="flex items-center justify-center py-16 text-[#5D5B5B]">Loading…</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Profile">
      <div className="max-w-2xl space-y-6">

        {/* Identity card */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EF323F] text-white text-xl font-bold">
              {profile?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-[#2D2D2D]">{profile?.name}</p>
              <p className="text-sm text-[#5D5B5B]">{profile?.email}</p>
              <span className="mt-1 inline-block rounded-full bg-[#EF323F]/10 px-2.5 py-0.5 text-xs font-medium text-[#EF323F]">
                {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Full Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Email</label>
              <input
                type="email"
                value={profile?.email ?? ''}
                disabled
                className="w-full rounded-lg border border-[#D3D3D3] bg-[#F7F7F7] px-3 py-2 text-sm text-[#5D5B5B] cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 555 000 0000"
                  className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Timezone</label>
                <select
                  value={profileForm.timezone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, timezone: e.target.value }))}
                  className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
                >
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Notification preferences */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6">
          <h3 className="text-sm font-semibold text-[#2D2D2D] mb-4">Email Notifications</h3>
          <div className="space-y-3">
            {([
              { key: 'notifyOnCrSubmitted' as const, label: 'CR submitted' },
              { key: 'notifyOnCrReturned' as const, label: 'Estimation returned to me' },
              { key: 'notifyOnCrApproved' as const, label: 'CR approved' },
              { key: 'notifyOnCrDeclined' as const, label: 'CR declined' },
            ]).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 text-sm text-[#2D2D2D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifForm[key]}
                  onChange={(e) => setNotifForm((p) => ({ ...p, [key]: e.target.checked }))}
                  className="accent-[#EF323F] h-4 w-4"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Save profile */}
        {profileError && <p className="text-sm text-red-600">{profileError}</p>}
        {profileSuccess && <p className="text-sm text-green-600">{profileSuccess}</p>}
        <Button onClick={handleProfileSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
        </Button>

        {/* Change password */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6">
          <h3 className="text-sm font-semibold text-[#2D2D2D] mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
                />
                <button type="button" onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-2.5 text-[#5D5B5B] hover:text-[#2D2D2D]">
                  {showCurrent ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
                />
                <button type="button" onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-2.5 text-[#5D5B5B] hover:text-[#2D2D2D]">
                  {showNew ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Confirm New Password</label>
              <input
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
            </div>
          </div>

          {pwError && <p className="mt-3 text-sm text-red-600">{pwError}</p>}
          {pwSuccess && <p className="mt-3 text-sm text-green-600">{pwSuccess}</p>}
          <div className="mt-4">
            <Button onClick={handlePasswordChange} disabled={changePwMutation.isPending}>
              {changePwMutation.isPending ? 'Updating…' : 'Change Password'}
            </Button>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
