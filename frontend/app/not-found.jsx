import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mb-6">
        <span className="text-white font-bold text-2xl">M</span>
      </div>
      <h1 className="font-serif text-5xl font-bold mb-3">404</h1>
      <p className="text-muted-foreground text-lg mb-8">
        This page doesn&apos;t exist — but Nigeria&apos;s stories do.
      </p>
      <Link href="/">
        <Button className="gradient-brand text-white border-0">Go Home</Button>
      </Link>
    </div>
  );
}
