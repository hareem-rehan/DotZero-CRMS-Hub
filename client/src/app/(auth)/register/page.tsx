'use client';

import { useSearchParams, Suspense } from 'next/navigation';
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

function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { mutate: register, isPending, error } = useRegister();

  const { register: formRegister, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const password = watch('password');

  const errorMessage = error
    ? isAxiosError(error)
      ? (error.response?.data?.error as string) ?? 'Something went wrong'
      : 'Something went wrong'
    : null;

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-[#EF323F] text-sm">Invalid invitation link. Please contact your administrator.</p>
      </div>
    );
  }

  const onSubmit = (data: RegisterForm) => {
    register({ token, name: data.name, password: data.password, confirmPassword: data.confirmPassword });
  };

  return (
    <>
      <h1 className="text-xl font-bold text-[#2D2D2D] mb-1">Create your account</h1>
      <p className="text-sm text-[#5D5B5B] mb-6">Complete your registration to access DotZero CR Portal.</p>

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

        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...formRegister('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
            pattern: { value: /[A-Z]/, message: 'Must contain 1 uppercase letter' },
            validate: (v) => /[0-9]/.test(v) || 'Must contain 1 number',
          })}
        />

        <Input
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...formRegister('confirmPassword', {
            required: 'Please confirm your password',
            validate: (v) => v === password || 'Passwords do not match',
          })}
        />

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
