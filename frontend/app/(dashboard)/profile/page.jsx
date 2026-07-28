'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { User, Globe, BookOpen, Settings, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { useTheme } from 'next-themes';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().max(500).optional(),
  preferredLanguage: z.string(),
});

const INTERESTS = [
  { value: 'history', label: 'History' },
  { value: 'folktales', label: 'Folktales' },
  { value: 'proverbs', label: 'Proverbs' },
  { value: 'culture', label: 'Culture' },
  { value: 'education', label: 'Education' },
  { value: 'medicine', label: 'Traditional Medicine' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'music', label: 'Music & Songs' },
];

const FONT_SIZES = [
  { value: 'normal', label: 'Normal', class: 'text-sm' },
  { value: 'large', label: 'Large', class: 'text-base' },
  { value: 'xlarge', label: 'Extra Large', class: 'text-lg' },
];

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { t } = useTranslation();
  const { setTheme } = useTheme();
  const [interests, setInterests] = useState(user?.interests || []);
  const [fontSize, setFontSize] = useState(user?.accessibility?.fontSize || 'normal');
  const [tts, setTts] = useState(user?.accessibility?.textToSpeech || false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
      preferredLanguage: user?.preferredLanguage || 'english',
    },
  });

  useEffect(() => {
    if (user) {
      reset({ name: user.name, bio: user.bio || '', preferredLanguage: user.preferredLanguage || 'english' });
      setInterests(user.interests || []);
      setFontSize(user.accessibility?.fontSize || 'normal');
      setTts(user.accessibility?.textToSpeech || false);
    }
  }, [user, reset]);

  // Apply font size to document root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-normal-size', 'font-large-size', 'font-xlarge-size');
    if (fontSize === 'large') root.style.fontSize = '18px';
    else if (fontSize === 'xlarge') root.style.fontSize = '20px';
    else root.style.fontSize = '';
  }, [fontSize]);

  const toggleInterest = (val) => {
    setInterests((prev) =>
      prev.includes(val) ? prev.filter((i) => i !== val) : [...prev, val]
    );
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await updateProfile({
        ...data,
        interests,
        accessibility: { fontSize, textToSpeech: tts, theme: 'system' },
      });
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = async (theme) => {
    setTheme(theme);
    try {
      await updateProfile({ accessibility: { fontSize, textToSpeech: tts, theme } });
    } catch (_) {}
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-3xl font-bold">{t('profileSettings')}</h1>
        <p className="text-muted-foreground mt-1">{t('profileDesc')}</p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2"><User className="w-3.5 h-3.5" />Profile</TabsTrigger>
            <TabsTrigger value="language" className="gap-2"><Globe className="w-3.5 h-3.5" />Language</TabsTrigger>
            <TabsTrigger value="interests" className="gap-2"><BookOpen className="w-3.5 h-3.5" />Interests</TabsTrigger>
            <TabsTrigger value="accessibility" className="gap-2"><Settings className="w-3.5 h-3.5" />Accessibility</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center text-white font-bold text-2xl">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <Badge variant="secondary" className="text-xs mt-1 capitalize">{user?.role}</Badge>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input {...register('name')} />
                  {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Bio <span className="text-muted-foreground">(optional)</span></label>
                  <Textarea {...register('bio')} placeholder="Tell the community about yourself..." rows={3} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  {' · '}{user?.contributionCount || 0} contributions
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Language Tab */}
          <TabsContent value="language">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Language Preference</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select your preferred language. AI responses and content will be tailored to this language.
                </p>
                <Controller
                  name="preferredLanguage"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[...SUPPORTED_LANGUAGES].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={async () => {
                            field.onChange(lang);
                            // Immediately save language so UI switches right away
                            try {
                              await updateProfile({ preferredLanguage: lang });
                            } catch (_) {}
                          }}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            field.value === lang
                              ? 'border-primary bg-primary/5'
                              : 'border-border/50 hover:border-primary/40'
                          }`}
                        >
                          <div className="font-medium capitalize text-sm">{lang}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {lang === 'hausa' && 'Northern Nigeria'}
                            {lang === 'yoruba' && 'Southwest Nigeria'}
                            {lang === 'igbo' && 'Southeast Nigeria'}
                            {lang === 'english' && 'Colonial / Modern'}
                            {lang === 'pidgin' && 'Nigerian Creole'}
                          </div>
                          {field.value === lang && (
                            <Check className="w-4 h-4 text-primary mt-1" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interests Tab */}
          <TabsContent value="interests">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Knowledge Interests</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select topics you care about. This helps the AI recommend relevant knowledge.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {INTERESTS.map(({ value, label }) => {
                    const active = interests.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleInterest(value)}
                        className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/50 hover:border-primary/40 text-muted-foreground'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5 inline mr-1" />}
                        {label}
                      </button>
                    );
                  })}
                </div>
                {interests.length > 0 && (
                  <p className="text-xs text-muted-foreground">{interests.length} interest{interests.length !== 1 ? 's' : ''} selected</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accessibility Tab */}
          <TabsContent value="accessibility">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Accessibility & Display</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {/* Theme */}
                <div>
                  <p className="text-sm font-medium mb-3">Theme</p>
                  <div className="flex gap-3">
                    {['light', 'dark', 'system'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleThemeChange(t)}
                        className={`px-4 py-2 rounded-lg border-2 text-sm capitalize transition-all ${
                          (user?.accessibility?.theme || 'system') === t
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/50 hover:border-primary/40'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <p className="text-sm font-medium mb-3">Font Size</p>
                  <div className="flex gap-3">
                    {FONT_SIZES.map(({ value, label, class: cls }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFontSize(value)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${cls} ${
                          fontSize === value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/50 hover:border-primary/40'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Preview: <span style={{ fontSize: fontSize === 'large' ? '18px' : fontSize === 'xlarge' ? '20px' : '14px' }}>
                      The quick brown fox
                    </span>
                  </p>
                </div>

                {/* Text-to-Speech */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Text-to-Speech</p>
                    <p className="text-xs text-muted-foreground">Enable audio playback for stories and AI responses</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTts((v) => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${tts ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    role="switch"
                    aria-checked={tts}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${tts ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                {/* Screen reader note */}
                <div className="bg-muted rounded-xl p-4 text-xs text-muted-foreground">
                  This platform supports screen readers. All interactive elements have ARIA labels.
                  Use Tab to navigate, Enter/Space to activate.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            className="gradient-brand text-white border-0 px-8"
            disabled={saving}
          >
            {saving ? t('saving') : t('saveChanges')}
          </Button>
        </div>
      </form>
    </div>
  );
}
