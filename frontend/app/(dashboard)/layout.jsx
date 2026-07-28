'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, MessageSquare, Upload, GraduationCap,
  Search, Bookmark, Globe, LogOut, Moon, Sun, Menu, Network, UserCircle,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/stories',   icon: BookOpen,        labelKey: 'stories' },
  { href: '/proverbs',  icon: Globe,           labelKey: 'proverbs' },
  { href: '/chat',      icon: MessageSquare,   labelKey: 'chat' },
  { href: '/upload',    icon: Upload,          labelKey: 'upload' },
  { href: '/graph',     icon: Network,         labelKey: 'graph' },
  { href: '/education', icon: GraduationCap,   labelKey: 'education' },
  { href: '/search',    icon: Search,          labelKey: 'search' },
  { href: '/bookmarks', icon: Bookmark,        labelKey: 'bookmarks' },
  { href: '/profile',   icon: UserCircle,      labelKey: 'profile' },
];

// Bottom tab bar items (most used, shown on mobile)
const BOTTOM_TABS = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/stories',   icon: BookOpen,        labelKey: 'stories' },
  { href: '/chat',      icon: MessageSquare,   labelKey: 'chat' },
  { href: '/search',    icon: Search,          labelKey: 'search' },
  { href: '/upload',    icon: Upload,          labelKey: 'upload' },
];

function NavLink({ item, onClick }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isActive =
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link href={item.href} onClick={onClick}>
      <div className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}>
        <item.icon className="w-4 h-4 shrink-0" />
        <span>{t(item.labelKey)}</span>
      </div>
    </Link>
  );
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <div>
            <span className="font-serif font-bold text-sm leading-none block">MemoryAI</span>
            <span className="text-[10px] text-muted-foreground leading-none">Nigeria</span>
          </div>
        </Link>
      </div>

      <Separator />

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} onClick={onNavigate} />
        ))}
      </nav>

      <Separator />

      <div className="p-3 space-y-1">
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === 'dark' ? t('lightMode') : t('darkMode')}
        </button>

        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarFallback className="gradient-brand text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-none mb-0.5">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate capitalize leading-none">
              {user?.preferredLanguage || 'english'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={async () => { await logout(); router.push('/'); }}
            aria-label="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full gradient-brand animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 h-screen sticky top-0 flex-col border-r border-border/60 bg-card/80 backdrop-blur-sm shrink-0" aria-label="Main navigation">
        <SidebarContent />
      </aside>

      {/* Mobile top header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 border-b border-border/60 bg-card/90 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
            <span className="text-white font-bold text-xs">M</span>
          </div>
          <span className="font-serif font-bold text-sm">MemoryAI</span>
        </Link>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <main id="main-content" className="flex-1 overflow-auto pt-14 md:pt-0 pb-16 md:pb-0">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="px-4 py-5 md:px-6 md:py-7 lg:px-8 lg:py-8"
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 flex items-center justify-around border-t border-border/60 bg-card/95 backdrop-blur-md"
        aria-label="Bottom navigation"
      >
        {BOTTOM_TABS.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-0',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium truncate">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
