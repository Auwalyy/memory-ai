'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Shield, User, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import api from '@/lib/api';

const ROLE_STYLES = {
  admin:       'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  moderator:   'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  contributor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  user:        'bg-muted text-muted-foreground',
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.04 } }),
};

export default function AdminUsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
  });

  const users = data?.data || [];

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold">Users</h1>
            <p className="text-muted-foreground text-sm">Platform members and their roles</p>
          </div>
        </div>
      </motion.div>

      {/* Role summary */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { role: 'admin',       icon: Shield, color: 'text-red-500'    },
            { role: 'moderator',   icon: Shield, color: 'text-orange-500' },
            { role: 'contributor', icon: BookOpen,color: 'text-blue-500'  },
            { role: 'user',        icon: User,   color: 'text-muted-foreground' },
          ].map(({ role, icon: Icon, color }) => (
            <Card key={role} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground capitalize">{role}s</span>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="font-serif text-2xl font-bold">{isLoading ? '—' : (roleCounts[role] || 0)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Users list */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
        <div className="space-y-2">
          {isLoading
            ? Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            : users.length === 0
              ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No users found</p>
                </div>
              )
              : users.map((u, i) => (
                <motion.div key={u._id} variants={fadeUp} initial="hidden" animate="visible" custom={i}>
                  <Card className="border-border/50">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-sm">
                          {u.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`text-xs capitalize ${ROLE_STYLES[u.role] || ROLE_STYLES.user}`}>
                          {u.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
          }
        </div>
      </motion.div>
    </div>
  );
}
