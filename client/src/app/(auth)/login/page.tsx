'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useLogin } from '@/hooks/useAuth';
import { isAxiosError } from 'axios';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: login, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const errorMessage = error
    ? isAxiosError(error)
      ? ((error.response?.data?.error as string) ?? 'Something went wrong')
      : 'Something went wrong'
    : null;

  const onSubmit = (data: LoginForm) => login(data);

  return (
    <>
      <h1 className="text-xl font-bold text-[#2D2D2D] mb-1">Sign in</h1>
      <p className="text-sm text-[#5D5B5B] mb-6">Welcome back to DotZero CR Portal</p>

      {errorMessage && (
        <div className="mb-4 rounded-md bg-red-50 border border-[#EF323F] px-4 py-3 text-sm text-[#EF323F]">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-[#2D2D2D]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`w-full rounded-md border px-3 py-2.5 pr-10 text-sm text-[#2D2D2D] placeholder-[#5D5B5B] outline-none transition-colors
                ${errors.password ? 'border-[#EF323F] focus:ring-1 focus:ring-[#EF323F]' : 'border-[#D3D3D3] focus:border-[#2D2D2D] focus:ring-1 focus:ring-[#2D2D2D]'}`}
              {...register('password', { required: 'Password is required' })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5D5B5B] hover:text-[#2D2D2D]"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          {errors.password && <p className="text-xs text-[#EF323F]">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-[#5D5B5B] cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#D3D3D3] accent-[#EF323F]"
              {...register('rememberMe')}
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm text-[#EF323F] hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={isPending} className="w-full mt-2">
          Sign in
        </Button>
      </form>
    </>
  );
}
