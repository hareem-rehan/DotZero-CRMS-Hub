'use client';

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { useMe, useUpdateMe, useChangePassword, useAdminStats } from '@/hooks/useSettings';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-base font-semibold text-[#2D2D2D]">{title}</h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { data: me, isLoading } = useMe();
  const { data: stats } = useAdminStats();

  // Profile form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('');

  // Notification prefs
  const [notifyOnCrSubmitted, setNotifyOnCrSubmitted] = useState(false);
  const [notifyOnCrReturned, setNotifyOnCrReturned] = useState(false);
  const [notifyOnCrApproved, setNotifyOnCrApproved] = useState(false);
  const [notifyOnCrDeclined, setNotifyOnCrDeclined] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (me) {
      setName(me.name ?? '');
      setPhone(me.phone ?? '');
      setTimezone(me.timezone ?? '');
      setNotifyOnCrSubmitted(me.notifyOnCrSubmitted);
      setNotifyOnCrReturned(me.notifyOnCrReturned);
      setNotifyOnCrApproved(me.notifyOnCrApproved);
      setNotifyOnCrDeclined(me.notifyOnCrDeclined);
    }
  }, [me]);

  const updateMe = useUpdateMe({
    onSuccess: () => toast.success('Profile updated'),
    onError: (msg) => toast.error(msg),
  });

  const changePassword = useChangePassword({
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (msg) => toast.error(msg),
  });

  const handleProfileSave = () => {
    updateMe.mutate({ name, phone: phone || null, timezone: timezone || null });
  };

  const handleNotifSave = () => {
    updateMe.mutate({ notifyOnCrSubmitted, notifyOnCrReturned, notifyOnCrApproved, notifyOnCrDeclined });
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Karachi',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];

  if (isLoading) {
    return (
      <PageWrapper title="Settings">
        <div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">Loading…</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Settings">
      <div className="space-y-6 max-w-2xl">

        {/* Profile */}
        <SectionCard title="Profile">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Email</label>
              <input
                type="email"
                value={me?.email ?? ''}
                disabled
                className="w-full rounded-lg border border-[#D3D3D3] bg-gray-50 px-3 py-2 text-sm text-[#5D5B5B] cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-[#5D5B5B]">Email cannot be changed here</p>
            </div>
            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              >
                <option value="">Select timezone…</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={handleProfileSave} loading={updateMe.isPending}>
              Save Profile
            </Button>
          </div>
        </SectionCard>

        {/* Change Password */}
        <SectionCard title="Change Password">
          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              onClick={handlePasswordChange}
              loading={changePassword.isPending}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Change Password
            </Button>
          </div>
        </SectionCard>

        {/* Notification Preferences */}
        <SectionCard title="Email Notifications">
          <p className="mb-4 text-sm text-[#5D5B5B]">Choose which events trigger an email to you.</p>
          <div className="space-y-3">
            {[
              { key: 'notifyOnCrSubmitted', label: 'New CR submitted', checked: notifyOnCrSubmitted, onChange: setNotifyOnCrSubmitted },
              { key: 'notifyOnCrReturned', label: 'CR returned for revision', checked: notifyOnCrReturned, onChange: setNotifyOnCrReturned },
              { key: 'notifyOnCrApproved', label: 'CR approved', checked: notifyOnCrApproved, onChange: setNotifyOnCrApproved },
              { key: 'notifyOnCrDeclined', label: 'CR declined', checked: notifyOnCrDeclined, onChange: setNotifyOnCrDeclined },
            ].map(({ key, label, checked, onChange }) => (
              <label key={key} className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#EF323F] accent-[#EF323F]"
                />
                <span className="text-sm text-[#2D2D2D]">{label}</span>
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={handleNotifSave} loading={updateMe.isPending}>
              Save Preferences
            </Button>
          </div>
        </SectionCard>

        {/* System Overview (SA only) */}
        <SectionCard title="System Overview">
          <p className="mb-4 text-sm text-[#5D5B5B]">Live counts across the platform.</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Users', value: stats?.users },
              { label: 'Total Projects', value: stats?.projects },
              { label: 'Total CRs', value: stats?.changeRequests },
              { label: 'Pending Review', value: stats?.pendingCRs },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-4 text-center">
                <p className="text-2xl font-bold text-[#2D2D2D]">{value ?? '—'}</p>
                <p className="mt-1 text-xs text-[#5D5B5B]">{label}</p>
              </div>
            ))}
          </div>
        </SectionCard>

      </div>
    </PageWrapper>
  );
}
