'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Image, Mic, CheckCircle, Clock, AlertCircle,
  Network, ChevronDown, ChevronUp, RefreshCw, CloudUpload, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';
import api from '@/lib/api';
import IngestionPipeline from '@/components/features/IngestionPipeline';
import { useTranslation } from '@/hooks/useTranslation';

const STATUS_CONFIG = {
  pending:    { icon: Clock,       color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40', label: 'Pending' },
  processing: { icon: Clock,       color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40',    label: 'Processing' },
  completed:  { icon: CheckCircle, color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40',  label: 'Completed' },
  failed:     { icon: AlertCircle, color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40',         label: 'Failed' },
};

const TYPE_ICONS = { image: Image, audio: Mic, document: FileText, text: FileText };

function IngestionResultPanel({ uploadId }) {
  const { t } = useTranslation();
  const [translateLang, setTranslateLang] = useState('');
  const [translation, setTranslation] = useState(null);
  const [translating, setTranslating] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ingestion-result', uploadId],
    queryFn: () => api.get(`/ingestion/${uploadId}/result`).then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

  const translateContent = async (lang) => {
    const text = data?.ingestion?.summaries?.medium || data?.ingestion?.summaries?.short;
    if (!text) return toast.info('No summary to translate yet');
    setTranslateLang(lang);
    setTranslating(true);
    setTranslation(null);
    try {
      const res = await api.post('/education/translate-text', { text, targetLanguage: lang });
      setTranslation(res.data.data?.translation || res.data.data?.translatedText || res.data.data);
    } catch {
      // fallback: try stories translate with content
      try {
        const res2 = await api.post('/education/lesson', {
          content: text,
          language: lang,
          audience: 'adult',
        });
        setTranslation(res2.data.data?.lesson?.introduction || 'Translation not available via this route.');
      } catch {
        toast.error('Translation failed');
      }
    }
    setTranslating(false);
  };

  if (isLoading) return <div className="text-xs text-muted-foreground py-2">Loading results…</div>;
  if (isError || !data?.ingestion) return <div className="text-xs text-destructive py-2">Could not load results.</div>;

  const { ingestion } = data;

  return (
    <div className="space-y-3 pt-3 border-t border-border/50">
      {ingestion.metadata?.title && (
        <p className="text-sm font-semibold">{ingestion.metadata.title}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {ingestion.detectedLanguage && (
          <Badge variant="secondary" className="text-xs capitalize">{ingestion.detectedLanguage}</Badge>
        )}
        {ingestion.contentType && (
          <Badge variant="secondary" className="text-xs capitalize">{ingestion.contentType.replace(/_/g, ' ')}</Badge>
        )}
        {ingestion.aiUnderstanding?.mainTheme && (
          <Badge variant="outline" className="text-xs">{ingestion.aiUnderstanding.mainTheme}</Badge>
        )}
        {(ingestion.aiUnderstanding?.subThemes || []).slice(0, 4).map((t) => (
          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
        ))}
      </div>

      {ingestion.summaries?.short && (
        <div>
          <p className="section-label mb-1">{t('summary')}</p>
          <p className="text-xs leading-relaxed">{ingestion.summaries.short}</p>
        </div>
      )}

      {ingestion.summaries?.medium && (
        <div>
          <p className="section-label mb-1">{t('detailedSummary')}</p>
          <p className="text-xs leading-relaxed">{ingestion.summaries.medium}</p>
        </div>
      )}

      {ingestion.aiUnderstanding?.moralLessons?.length > 0 && (
        <div>
          <p className="section-label mb-1">{t('moralLessons')}</p>
          <ul className="space-y-0.5">
            {ingestion.aiUnderstanding.moralLessons.map((l, i) => (
              <li key={i} className="text-xs">• {l}</li>
            ))}
          </ul>
        </div>
      )}

      {ingestion.aiUnderstanding?.culturalMeaning && (
        <div>
          <p className="section-label mb-1">{t('culturalMeaning')}</p>
          <p className="text-xs leading-relaxed">{ingestion.aiUnderstanding.culturalMeaning}</p>
        </div>
      )}

      {ingestion.aiUnderstanding?.historicalContext && (
        <div>
          <p className="section-label mb-1">{t('historicalContext')}</p>
          <p className="text-xs leading-relaxed">{ingestion.aiUnderstanding.historicalContext}</p>
        </div>
      )}

      {(() => {
        const e = ingestion.entities || {};
        const groups = [
          { label: 'People', items: e.people },
          { label: 'Places', items: e.places },
          { label: 'Communities', items: e.communities },
          { label: 'Traditions', items: e.traditions },
          { label: 'Festivals', items: e.festivals },
          { label: 'Medicinal Plants', items: e.medicinalPlants },
          { label: 'Animals', items: e.animals },
          { label: 'Foods', items: e.foods },
          { label: 'Keywords', items: e.keywords },
        ].filter((g) => g.items?.length);

        if (!groups.length) return null;
        return (
          <div>
            <p className="section-label mb-2">{t('extractedEntities')}</p>
            <div className="space-y-1.5">
              {groups.map(({ label, items }) => (
                <div key={label} className="flex flex-wrap items-start gap-1">
                  <span className="text-xs text-muted-foreground w-24 shrink-0 pt-0.5">{label}:</span>
                  <div className="flex flex-wrap gap-1">
                    {items.slice(0, 6).map((item) => (
                      <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {ingestion.metadata?.tags?.length > 0 && (
        <div>
          <p className="section-label mb-1">{t('tags')}</p>
          <div className="flex flex-wrap gap-1">
            {ingestion.metadata.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {ingestion.aiUnderstanding?.educationalValue && (
        <div>
          <p className="section-label mb-1">{t('educationalValue')}</p>
          <p className="text-xs leading-relaxed">{ingestion.aiUnderstanding.educationalValue}</p>
        </div>
      )}

      {/* Translate summary */}
      {(ingestion.summaries?.short || ingestion.summaries?.medium) && (
        <div className="border-t border-border/50 pt-3">
          <p className="section-label mb-2">🌍 Translate Summary</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {['hausa', 'yoruba', 'igbo', 'english', 'pidgin'].map((lang) => (
              <button
                key={lang}
                onClick={() => translateContent(lang)}
                disabled={translating}
                className={[
                  'px-2.5 py-1 rounded-full text-xs capitalize border transition-all',
                  translateLang === lang && translation
                    ? 'gradient-brand text-white border-transparent'
                    : 'border-border text-muted-foreground hover:bg-muted',
                ].join(' ')}
              >
                {lang}
              </button>
            ))}
          </div>
          {translating && (
            <p className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
              <span className="w-3 h-3 rounded-full gradient-brand inline-block animate-pulse" />
              Gemma is translating to {translateLang}…
            </p>
          )}
          {translation && !translating && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs leading-relaxed">
              <p className="font-medium text-primary mb-1 capitalize">{translateLang}:</p>
              <p>{typeof translation === 'string' ? translation : JSON.stringify(translation)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SAMPLE_UPLOAD_TEXT = `Egungun Festival — Yoruba Ancestor Masquerade

The Egungun festival is one of the most sacred ceremonies in Yoruba religion, celebrated across Yorubaland and in the African diaspora. Egungun are masquerades that represent the spirits of ancestors returning to the world of the living to bless, counsel, and sometimes discipline their descendants.

The masquerades are elaborately costumed figures whose identity must never be revealed — to unmask an Egungun is considered a serious taboo that can bring misfortune. The costumes are made of layers of cloth, often passed down through generations, and the Egungun speaks in a disguised voice.

During the festival, the Egungun moves through the community, blessing households, settling disputes, and reminding the living of their obligations to the ancestors. Certain Egungun are known for healing, others for prophecy, and others for entertainment.

The festival reinforces the Yoruba belief that death is not the end — the ancestors remain active participants in community life, and maintaining good relations with them through ritual and ethical living ensures prosperity and protection for the living.

Elders say: "Iku pa eniyan, ko pa oruko" — death kills a person, but not their name. The Egungun tradition ensures that names and wisdom live on.`;

export default function UploadPage() {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activePipelines, setActivePipelines] = useState({});
  const [expandedResults, setExpandedResults] = useState({});
  const queryClient = useQueryClient();

  const uploadSampleText = async () => {
    setUploading(true);
    try {
      const blob = new Blob([SAMPLE_UPLOAD_TEXT], { type: 'text/plain' });
      const file = new File([blob], 'egungun-festival-yoruba.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/uploads', formData);
      const upload = res.data.data?.upload;
      toast.success('Sample text uploaded — AI processing started');
      if (upload?._id) setActivePipelines((prev) => ({ ...prev, [upload._id]: true }));
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
    setUploading(false);
  };

  const { data: uploadsData, isLoading } = useQuery({
    queryKey: ['uploads'],
    queryFn: () => api.get('/uploads').then((r) => r.data.data),
    refetchInterval: 8000,
  });

  const handleUpload = useCallback(async (files) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await api.post('/uploads', formData);
        const upload = res.data.data?.upload;
        toast.success(`${file.name} uploaded — AI processing started`);
        if (upload?._id && upload?.extractedText) {
          setActivePipelines((prev) => ({ ...prev, [upload._id]: true }));
        }
      } catch (err) {
        toast.error(`Failed to upload ${file.name}: ${err.response?.data?.message || err.message}`);
      }
    }
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ['uploads'] });
  }, [queryClient]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const toggleResult = (id) => setExpandedResults((prev) => ({ ...prev, [id]: !prev[id] }));
  const reAnalyze = (id) => {
    setExpandedResults((prev) => ({ ...prev, [id]: false }));
    setActivePipelines((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('uploadTitle')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('uploadDesc2')}</p>
        </div>
        <Link href="/graph">
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <Network className="w-4 h-4" />
            <span className="hidden sm:inline">{t('knowledgeGraph')}</span>
            <span className="sm:hidden">{t('graph')}</span>
          </Button>
        </Link>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          'border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer',
          dragging
            ? 'border-primary bg-primary/8 scale-[1.01]'
            : 'border-border/50 hover:border-primary/50 hover:bg-muted/20',
        ].join(' ')}
        onClick={() => document.getElementById('file-input').click()}
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('file-input').click()}
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
          <CloudUpload className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </div>
        <h3 className="font-semibold text-base sm:text-lg mb-1.5">
          {dragging ? t('dropNow') : t('dropFiles')}
        </h3>
        <p className="text-muted-foreground text-xs sm:text-sm mb-4">
          Images (JPG, PNG) · Audio (MP3, WAV) · Documents (PDF, DOCX, TXT)
        </p>
        <input
          id="file-input"
          type="file"
          multiple
          className="hidden"
          accept="image/*,audio/*,.pdf,.docx,.txt,.md"
          onChange={(e) => handleUpload(e.target.files)}
        />
        <span className={[
          'inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 h-9 text-sm font-medium transition-colors hover:bg-muted',
          uploading ? 'opacity-50 pointer-events-none' : '',
        ].join(' ')}>
          <Upload className="w-4 h-4" />
          {uploading ? t('uploading') : t('chooseFiles')}
        </span>
      </div>

      {/* Sample text shortcut */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">No file? Try a sample:</span>
        <button
          type="button"
          onClick={uploadSampleText}
          disabled={uploading}
          className="filter-chip text-xs"
        >
          🌿 Egungun Festival (Yoruba text)
        </button>
      </div>

      {/* Upload type info */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Image,    title: 'Images',    desc: 'Handwritten notes, manuscripts — OCR extracts text', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { icon: Mic,      title: 'Audio',     desc: 'Voice recordings, oral histories, storytelling',      color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { icon: FileText, title: 'Documents', desc: 'PDF, Word, text files, and markdown',                 color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map((item) => (
          <Card key={item.title} className="border-border/50">
            <CardContent className="p-3 sm:p-4">
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center mb-2`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="font-medium text-xs sm:text-sm mb-0.5">{item.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed hidden sm:block">{item.desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Uploads list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base sm:text-lg">{t('yourUploads')}</h2>
          {!isLoading && uploadsData?.length > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{uploadsData.length}</span> file{uploadsData.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="space-y-3">
          {isLoading
            ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : uploadsData?.map((upload) => {
                const cfg = STATUS_CONFIG[upload.analysisStatus] || STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                const TypeIcon = TYPE_ICONS[upload.uploadType] || FileText;
                const isPipelineActive = activePipelines[upload._id];
                const isResultOpen = expandedResults[upload._id];
                const hasResult = upload.analysisStatus === 'completed' && upload.ingestion?.completedAt;
                const fileUrl = upload.fileUrl && !upload.fileUrl.startsWith('local://') ? upload.fileUrl : null;

                return (
                  <Card key={upload._id} className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <TypeIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            {fileUrl ? (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-sm truncate leading-snug hover:text-primary flex items-center gap-1 min-w-0"
                              >
                                <span className="truncate">{upload.originalName}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ) : (
                              <span className="font-medium text-sm truncate leading-snug">{upload.originalName}</span>
                            )}
                            <Badge variant="secondary" className="text-xs shrink-0 h-5">{upload.uploadType}</Badge>
                          </div>
                          {upload.ingestion?.metadata?.title && !isPipelineActive && (
                            <p className="text-xs font-medium text-foreground">{upload.ingestion.metadata.title}</p>
                          )}
                          {upload.ingestion?.summaries?.short && !isPipelineActive && !isResultOpen && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {upload.ingestion.summaries.short}
                            </p>
                          )}
                          {upload.ingestion?.aiUnderstanding?.subThemes?.length > 0 && !isPipelineActive && !isResultOpen && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {upload.ingestion.aiUnderstanding.subThemes.slice(0, 3).map((t) => (
                                <Badge key={t} variant="outline" className="text-xs h-4">{t}</Badge>
                              ))}
                            </div>
                          )}
                          {upload.extractedText && !upload.ingestion?.metadata?.title && !isPipelineActive && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{upload.extractedText}</p>
                          )}
                        </div>
                      </div>

                      {/* Status + actions row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>

                        {hasResult && !isPipelineActive && (
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-7 ml-auto" onClick={() => toggleResult(upload._id)}>
                            {isResultOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {isResultOpen ? t('hide') : t('viewResults')}
                          </Button>
                        )}

                        {hasResult && !isPipelineActive && (
                          <Button
                            size="sm" variant="ghost"
                            className="gap-1 text-xs h-7 text-muted-foreground"
                            onClick={() => reAnalyze(upload._id)}
                            title="Re-run AI analysis"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        )}

                        {(upload.analysisStatus === 'pending' || upload.analysisStatus === 'failed') &&
                          upload.extractedText && !isPipelineActive && (
                          <Button
                            size="sm" variant="outline"
                            className="gap-1 text-xs h-7"
                            onClick={() => setActivePipelines((prev) => ({ ...prev, [upload._id]: true }))}
                          >
                            {t('runAI')}
                          </Button>
                        )}
                      </div>

                      {/* Stored result panel */}
                      <AnimatePresence>
                        {isResultOpen && !isPipelineActive && (
                          <motion.div
                            key="result"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <IngestionResultPanel uploadId={upload._id} />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Live pipeline */}
                      {isPipelineActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="border-t border-border/50 pt-3"
                        >
                          <IngestionPipeline
                            uploadId={upload._id}
                            onComplete={() => {
                              setActivePipelines((prev) => ({ ...prev, [upload._id]: false }));
                              queryClient.invalidateQueries({ queryKey: ['uploads'] });
                              queryClient.invalidateQueries({ queryKey: ['ingestion-result', upload._id] });
                              queryClient.invalidateQueries({ queryKey: ['graph'] });
                              queryClient.invalidateQueries({ queryKey: ['graph-stats'] });
                              setExpandedResults((prev) => ({ ...prev, [upload._id]: true }));
                            }}
                            onError={(msg) => {
                              setActivePipelines((prev) => ({ ...prev, [upload._id]: false }));
                              toast.error(msg || 'AI processing failed');
                            }}
                          />
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}
