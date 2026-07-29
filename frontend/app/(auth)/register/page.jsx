'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  community: z.string().optional(),
  state: z.string().optional(),
});

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await registerUser(data);
      toast.success('Account created! Welcome to MemoryAI Nigeria.');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-border/50">
      <CardHeader className="text-center pb-2">
        <CardTitle className="font-serif text-2xl">Join MemoryAI Nigeria</CardTitle>
        <CardDescription>Start preserving indigenous knowledge today</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name</label>
            <Input {...register('name')} placeholder="Your name" />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input {...register('email')} type="email" placeholder="you@example.com" />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <Input {...register('password')} type="password" placeholder="Min. 8 chars, uppercase, number" />
            {errors.password
              ? <p className="text-destructive text-xs">{errors.password.message}</p>
              : <p className="text-xs text-muted-foreground">Min. 8 characters with uppercase, lowercase &amp; number</p>
            }
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Community <span className="text-muted-foreground">(optional)</span></label>
              <Input {...register('community')} placeholder="e.g. Kano" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">State <span className="text-muted-foreground">(optional)</span></label>
              <Input {...register('state')} placeholder="e.g. Lagos" />
            </div>
          </div>
          <Button type="submit" className="w-full gradient-brand text-white border-0" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
