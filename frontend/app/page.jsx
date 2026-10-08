'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Mic, Archive, Cpu, ShieldCheck, UserCheck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const features = [
  {
    icon: Mic,
    title: 'Speak in your own language',
    description: 'Elders, storytellers, artisans and teachers record knowledge by voice — starting with Hausa and Nigerian English.',
  },
  {
    icon: Cpu,
    title: 'N-ATLAS understands it',
    description: "Nigeria's N-ATLAS models transcribe the recording, translate it and structure the people, places, practices and proverbs it contains.",
  },
  {
    icon: ShieldCheck,
    title: 'Grounded, never invented',
    description: 'Anything the AI extracts that is not in the recording is removed. MemoryAI preserves what people said — it does not generate culture.',
  },
  {
    icon: UserCheck,
    title: 'People verify it',
    description: 'Contributors rate how faithfully N-ATLAS captured their words, giving every record a Cultural Fidelity score. Moderators verify.',
  },
  {
    icon: Search,
    title: 'Search real sources',
    description: 'Questions are answered from community contributions only, with the number of sources shown and every source one click away.',
  },
  {
    icon: Archive,
    title: 'Provenance on every record',
    description: 'Each record keeps its original audio, consent, location, processing details and review history. Contributors can stay anonymous or withdraw.',
  },
];

const stats = [
  { value: 'Hausa', label: 'First language, voice-first' },
  { value: 'N-ATLAS', label: 'Core language technology' },
  { value: '1–5', label: 'Cultural Fidelity rating per record' },
  { value: 'Every record', label: 'Linked to its original source' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-serif font-bold text-lg">MemoryAI Nigeria</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="outline" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="gradient-brand text-white border-0">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="flex flex-wrap gap-2 justify-center mb-6">
            <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium">
              🇳🇬 Hausa · Yoruba · Igbo · English
            </Badge>
            <Badge className="px-4 py-1.5 text-sm font-medium gradient-brand text-white border-0">
              Powered by N-ATLAS
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="font-serif text-4xl sm:text-5xl md:text-7xl font-bold leading-tight text-balance mb-4"
          >
            Kiyaye Ilimin{' '}
            <span className="gradient-text">Hausawa</span>
            <br />
            da Taimakon{' '}
            <span className="gradient-text">AI.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1.5}
            className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-2 leading-relaxed font-medium"
          >
            Preserving Hausa Knowledge with AI — Starting with Northern Nigeria.
          </motion.p>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Our Stories, Our Languages, Our Memory. Nigerians speak their knowledge, N-ATLAS understands their
            language, MemoryAI structures it, people verify it — and future generations can find it.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/register">
              <Button size="lg" className="gradient-brand text-white border-0 px-8 h-12 text-base gap-2">
                Start Preserving Knowledge
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-8 h-12 text-base">
                Explore the Archive
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-border/50 bg-muted/30">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="text-center"
            >
              <div className="font-serif text-3xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-4xl font-bold mb-4">
              How MemoryAI works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              AI should preserve Nigerian knowledge, not invent Nigerian culture.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i * 0.5}
                className="group p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center p-12 rounded-3xl bg-primary text-white"
        >
          <h2 className="font-serif text-4xl font-bold mb-4">
            Preserving Nigerian Indigenous Knowledge, Starting with Hausa
          </h2>
          <p className="text-white/80 text-lg mb-2">
            Kowane dattijo ɗakin karatu ne. Kowane labari yana da muhimmanci.
          </p>
          <p className="text-white/60 text-base mb-8">
            Every elder is a library. Every story matters.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="px-8 h-12 text-base gap-2">
              Record Your First Contribution
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gradient-brand flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span>MemoryAI Nigeria © 2026</span>
          </div>
          <p>Kiyaye Ilimin Gargajiya na Najeriya ta Hanyar AI &mdash; Preserving Nigerian Indigenous Wisdom Through AI</p>
        </div>
      </footer>
    </div>
  );
}
