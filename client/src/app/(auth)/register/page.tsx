'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRegister } from '@/hooks/useAuth';
import { isAxiosError } from 'axios';

interface RegisterForm {
  name: string;
  password: string;
  confirmPassword: string;
}

const RULES = [
  { key: 'length', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { key: 'upper', label: '1 uppercase letter (A–Z)', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'number', label: '1 number (0–9)', test: (v: string) => /[0-9]/.test(v) },
  {
    key: 'special',
    label: '1 special character (!@#…)',
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
];

function PasswordStrengthChecks({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1">
      {RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li
            key={r.key}
            className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-[#EF323F]'}`}
          >
            {ok ? (
              <svg
                className="h-3.5 w-3.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="h-3.5 w-3.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={
          visible
            ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21'
            : 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
        }
      />
    </svg>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { mutate: register, isPending, error } = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register: formRegister,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();
  const password = watch('password') ?? '';

  const errorMessage = error
    ? isAxiosError(error)
      ? ((error.response?.data?.error as string) ?? 'Something went wrong')
      : 'Something went wrong'
    : null;

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-[#EF323F] text-sm">
          Invalid invitation link. Please contact your administrator.
        </p>
      </div>
    );
  }

  const onSubmit = (data: RegisterForm) => {
    register({
      token,
      name: data.name,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
  };

  return (
    <>
      <h1 className="text-xl font-bold text-[#2D2D2D] mb-1">Create your account</h1>
      <p className="text-sm text-[#5D5B5B] mb-6">
        Complete your registration to access DotZero CR Portal.
      </p>

      {errorMessage && (
        <div className="mb-4 rounded-md bg-red-50 border border-[#EF323F] px-4 py-3 text-sm text-[#EF323F]">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          id="name"
          label="Full Name"
          placeholder="Jane Smith"
          error={errors.name?.message}
          {...formRegister('name', {
            required: 'Full name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
          })}
        />

        {/* Password with toggle + live checklist */}
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-[#2D2D2D]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={`w-full rounded-md border px-3 py-2.5 pr-10 text-sm text-[#2D2D2D] placeholder-[#5D5B5B] outline-none transition-colors
                ${errors.password ? 'border-[#EF323F] focus:ring-1 focus:ring-[#EF323F]' : 'border-[#D3D3D3] focus:border-[#2D2D2D] focus:ring-1 focus:ring-[#2D2D2D]'}`}
              {...formRegister('password', {
                required: 'Password is required',
                validate: (v) => {
                  if (v.length < 8) return 'At least 8 characters required';
                  if (!/[A-Z]/.test(v)) return 'Must contain 1 uppercase letter';
                  if (!/[0-9]/.test(v)) return 'Must contain 1 number';
                  if (!/[^A-Za-z0-9]/.test(v)) return 'Must contain 1 special character';
                  return true;
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5D5B5B] hover:text-[#2D2D2D]"
              tabIndex={-1}
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>
          <PasswordStrengthChecks password={password} />
          {errors.password && !password && (
            <p className="text-xs text-[#EF323F]">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm password with toggle */}
        <div className="flex flex-col gap-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-[#2D2D2D]">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={`w-full rounded-md border px-3 py-2.5 pr-10 text-sm text-[#2D2D2D] placeholder-[#5D5B5B] outline-none transition-colors
                ${errors.confirmPassword ? 'border-[#EF323F] focus:ring-1 focus:ring-[#EF323F]' : 'border-[#D3D3D3] focus:border-[#2D2D2D] focus:ring-1 focus:ring-[#2D2D2D]'}`}
              {...formRegister('confirmPassword', {
                required: 'Please confirm your password',
                validate: (v) => v === password || 'Passwords do not match',
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5D5B5B] hover:text-[#2D2D2D]"
              tabIndex={-1}
            >
              <EyeIcon visible={showConfirm} />
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-[#EF323F]">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" loading={isPending} className="w-full mt-2">
          Create account
        </Button>
      </form>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[#5D5B5B]">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
