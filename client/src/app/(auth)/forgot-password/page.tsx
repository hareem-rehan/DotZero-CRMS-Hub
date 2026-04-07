'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useForgotPassword } from '@/hooks/useAuth';

interface ForgotForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const { mutate: forgotPassword, isPending, isSuccess } = useForgotPassword();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>();

  const onSubmit = (data: ForgotForm) => forgotPassword(data);

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[#2D2D2D] mb-2">Check your email</h1>
        <p className="text-sm text-[#5D5B5B] mb-6">
          If an account exists with that email, a password reset link has been sent. The link expires in 1 hour.
        </p>
        <Link href="/login" className="text-sm text-[#EF323F] hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-[#2D2D2D] mb-1">Forgot password?</h1>
      <p className="text-sm text-[#5D5B5B] mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />

        <Button type="submit" loading={isPending} className="w-full">
          Send reset link
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-[#5D5B5B] hover:text-[#2D2D2D]">
          ← Back to sign in
        </Link>
      </div>
    </>
  );
}
