'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, Globe, Music, Landmark, Flame, Scroll, Heart, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import api from '@/lib/api';
import { LANGUAGE_COLORS } from '@/lib/constants';

const CATEGORIES = [
  { value: 'all',       label: 'All',        icon: BookOpen  },
  { value: 'story',     label: 'Stories',    icon: Scroll    },
  { value: 'proverb',   label: 'Proverbs',   icon: Globe     },
  { value: 'folktale',  label: 'Folktales',  icon: BookOpen  },
  { value: 'history',   label: 'History',    icon: Landmark  },
  { value: 'festival',  label: 'Festivals',  icon: Flame     },
  { value: 'song',      label: 'Songs',      icon: Music     },
  { value: 'tradition', label: 'Traditions', icon: Heart     },
];

const LANGUAGES = ['all', 'hausa', 'yoruba', 'igbo', 'english', 'pidgin'];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.05 } }),
};

export default function KnowledgeLibraryPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [language, setLanguage] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-library', activeCategory, language],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '30', sort: '-createdAt' });
      if (activeCategory !== 'all') params.set('knowledgeType', activeCategory);
      if (language !== 'all') params.set('language', language);
      return api.get(`/stories?${params}`).then((r) => r.data);
    },
  });

  const items = data?.data || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">Knowledge Library</h1>
            <p className="text-muted-foreground text-sm">The public repository of approved indigenous knowledge</p>
          </div>
        </div>
      </motion.div>

      {/* Category filter */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setActiveCategory(value)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
                activeCategory === value
                  ? 'gradient-brand text-white border-transparent'
                  : 'border-border bg-background hover:bg-muted text-muted-foreground',
              ].join(' ')}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Language filter */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={[
                'px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all border',
                language === lang
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'border-border text-muted-foreground hover:bg-muted',
              ].join(' ')}
            >
              {lang === 'all' ? 'All Languages' : lang}
            </button>
          ))}
        </div>
      </motion.div>

      {!isLoading && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{items.length}</span> items found
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array(9).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
          : items.map((item, i) => (
              <motion.div key={item._id} variants={fadeUp} initial="hidden" animate="visible" custom={i}>
                <Link href={`/stories/${item._id}`}>
                  <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm line-clamp-2 flex-1">{item.title}</h3>
                        <Badge className={`text-xs shrink-0 ${LANGUAGE_COLORS[item.language] || ''}`}>
                          {item.language}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3">
                        {item.analysis?.summary || item.content?.slice(0, 120) + '…'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {item.knowledgeType?.replace(/_/g, ' ')}
                        </Badge>
                        {item.analysis?.themes?.slice(0, 1).map((theme) => (
                          <Badge key={theme} variant="outline" className="text-xs">{theme}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
      </div>

      {!isLoading && !items.length && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-4 opacity-20" />
          <p className="font-medium mb-1">No content found</p>
          <p className="text-sm mb-4">Try a different category or language filter.</p>
          <Link href="/upload">
            <Button variant="outline" size="sm">Upload Knowledge</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
