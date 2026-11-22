import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Eye,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  Wand2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  DEFAULT_SITE_EXPERIENCES,
  SiteExperienceConfig,
  SiteExperienceKey,
  SiteExperienceShowcaseMap,
} from '../utils/platformLogic';

interface AdminExperienceShowcaseEditorProps {
  siteExperiences: SiteExperienceShowcaseMap;
  onSaveSiteExperiences: (next: SiteExperienceShowcaseMap) => Promise<void> | void;
  onUploadExperienceMedia?: (
    key: SiteExperienceKey,
    file: File
  ) => Promise<{ url: string; mediaType: 'image' | 'video' } | null>;
  onOpenSampleInStudio?: (key: SiteExperienceKey) => void;
  onPreviewSample?: (key: SiteExperienceKey) => void;
}

const EDITION_TABS: Array<{ key: SiteExperienceKey; label: string; sampleSlug: string }> = [
  { key: 'chasing-her', label: '01 · Chasing Her Edition', sampleSlug: 'ama-and-kofi' },
  { key: 'memories', label: '02 · Memories Edition', sampleSlug: 'wanjiku-and-brian' },
];

export const AdminExperienceShowcaseEditor: React.FC<AdminExperienceShowcaseEditorProps> = ({
  siteExperiences,
  onSaveSiteExperiences,
  onUploadExperienceMedia,
  onOpenSampleInStudio,
  onPreviewSample,
}) => {
  const [draft, setDraft] = useState<SiteExperienceShowcaseMap>(siteExperiences);
  const [activeKey, setActiveKey] = useState<SiteExperienceKey>('chasing-her');
  const [newFeatureText, setNewFeatureText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setDraft(siteExperiences);
  }, [siteExperiences]);

  const current = draft[activeKey];

  const updateCurrent = (patch: Partial<SiteExperienceConfig>) => {
    setDraft((prev) => ({
      ...prev,
      [activeKey]: {
        ...prev[activeKey],
        ...patch,
      },
    }));
  };

  const handleUpdateFeature = (index: number, value: string) => {
    const nextFeatures = [...current.exampleFeatures];
    nextFeatures[index] = value;
    updateCurrent({ exampleFeatures: nextFeatures });
  };

  const handleMoveFeature = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= current.exampleFeatures.length) return;
    const nextFeatures = [...current.exampleFeatures];
    const [moved] = nextFeatures.splice(index, 1);
    nextFeatures.splice(target, 0, moved);
    updateCurrent({ exampleFeatures: nextFeatures });
  };

  const handleRemoveFeature = (index: number) => {
    const nextFeatures = current.exampleFeatures.filter((_, i) => i !== index);
    updateCurrent({ exampleFeatures: nextFeatures });
  };

  const handleAddFeature = () => {
    const trimmed = newFeatureText.trim();
    if (!trimmed) return;
    updateCurrent({ exampleFeatures: [...current.exampleFeatures, trimmed] });
    setNewFeatureText('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned: SiteExperienceShowcaseMap = {
        'chasing-her': {
          ...draft['chasing-her'],
          exampleFeatures: draft['chasing-her'].exampleFeatures
            .map((f) => f.trim())
            .filter(Boolean),
        },
        memories: {
          ...draft.memories,
          exampleFeatures: draft.memories.exampleFeatures
            .map((f) => f.trim())
            .filter(Boolean),
        },
      };
      await onSaveSiteExperiences(cleaned);
      setFeedback('Saved! Both Win Her Back and Birthday sales pages now show your updated experience features.');
      setTimeout(() => setFeedback(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleResetActive = () => {
    setDraft((prev) => ({
      ...prev,
      [activeKey]: {
        ...DEFAULT_SITE_EXPERIENCES[activeKey],
        exampleFeatures: [...DEFAULT_SITE_EXPERIENCES[activeKey].exampleFeatures],
      },
    }));
    setFeedback(`Reset ${activeKey === 'chasing-her' ? 'Chasing Her' : 'Memories'} back to defaults. Click Save to publish.`);
    setTimeout(() => setFeedback(''), 3500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadExperienceMedia) return;
    setUploadingMedia(true);
    try {
      const uploaded = await onUploadExperienceMedia(activeKey, file);
      if (uploaded) {
        updateCurrent({
          mediaUrl: uploaded.url,
          mediaType: uploaded.mediaType,
        });
        setFeedback('Preview media uploaded. Click Save Experience Features to publish it live.');
        setTimeout(() => setFeedback(''), 3500);
      }
    } finally {
      setUploadingMedia(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-experiences-editor">
      {feedback && (
        <div className="rounded-xl bg-emerald-950/70 border border-emerald-500/35 px-4 py-3 text-xs text-emerald-200">
          {feedback}
        </div>
      )}

      {/* Top Selector & Action Bar */}
      <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div
          className="inline-flex items-center p-1 rounded-xl bg-[#120408] border border-[#E2B96F]/20 self-start"
          role="tablist"
          aria-label="Choose site experience edition to edit"
        >
          {EDITION_TABS.map((tab) => {
            const isActive = activeKey === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveKey(tab.key)}
                className={`min-h-[38px] px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#E2B96F] text-[#16050A]'
                    : 'text-[#FBF3EA]/70 hover:text-[#FBF3EA]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onPreviewSample && (
            <button
              type="button"
              onClick={() => onPreviewSample(activeKey)}
              className="min-h-[38px] px-3.5 rounded-xl border border-[#E2B96F]/25 bg-[#120408] hover:border-[#E2B96F]/55 text-xs font-medium text-[#FBF3EA] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5 text-[#E2B96F]" />
              <span>Preview Live Sample</span>
            </button>
          )}

          {onOpenSampleInStudio && (
            <button
              type="button"
              onClick={() => onOpenSampleInStudio(activeKey)}
              className="min-h-[38px] px-3.5 rounded-xl border border-[#E2B96F]/25 bg-[#120408] hover:border-[#E2B96F]/55 text-xs font-medium text-[#E2B96F] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Edit Live Sample Photos &amp; Letter</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetActive}
            className="min-h-[38px] px-3.5 rounded-xl border border-[#FBF3EA]/15 bg-[#120408] hover:border-[#FBF3EA]/35 text-xs font-medium text-[#FBF3EA]/75 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            data-testid="save-experience-features-btn"
            disabled={saving}
            onClick={handleSave}
            className="min-h-[38px] px-4 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] disabled:opacity-60 text-[#16050A] font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Experience Features'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Workspace: Left Form + Right Live Sales Card Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Editable Form Controls */}
        <div className="xl:col-span-7 space-y-6">
          {/* Card Identity & Copy */}
          <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-5 sm:p-6 space-y-4">
            <div className="border-b border-[#FBF3EA]/10 pb-3">
              <h2 className="font-serif text-xl text-[#FBF3EA]">
                Sales Page Showcase Copy
              </h2>
              <p className="text-xs text-[#FBF3EA]/65 mt-0.5">
                Controls how this site experience is introduced on both your Win Her Back and Birthday sales pages.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block text-xs text-[#FBF3EA]/75">
                Edition Label
                <input
                  type="text"
                  value={current.editionLabel}
                  onChange={(e) => updateCurrent({ editionLabel: e.target.value })}
                  className="mt-1.5 w-full min-h-[40px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
                />
              </label>

              <label className="sm:col-span-2 block text-xs text-[#FBF3EA]/75">
                Experience Title
                <input
                  type="text"
                  data-testid="experience-title-input"
                  value={current.title}
                  onChange={(e) => updateCurrent({ title: e.target.value })}
                  className="mt-1.5 w-full min-h-[40px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
                />
              </label>
            </div>

            <label className="block text-xs text-[#FBF3EA]/75">
              Preview Banner Feature Strip (1-line highlight over preview header)
              <input
                type="text"
                value={current.featureStrip}
                onChange={(e) => updateCurrent({ featureStrip: e.target.value })}
                className="mt-1.5 w-full min-h-[40px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
              />
            </label>

            <label className="block text-xs text-[#FBF3EA]/75">
              Experience Description
              <textarea
                rows={3}
                value={current.description}
                onChange={(e) => updateCurrent({ description: e.target.value })}
                className="mt-1.5 w-full p-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA] leading-relaxed"
              />
            </label>

            <label className="block text-xs text-[#FBF3EA]/75">
              Primary Button Label
              <input
                type="text"
                value={current.ctaLabel}
                onChange={(e) => updateCurrent({ ctaLabel: e.target.value })}
                className="mt-1.5 w-full min-h-[40px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
              />
            </label>
          </div>

          {/* Example Features Checklist Editor */}
          <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-[#FBF3EA]/10 pb-3">
              <div>
                <h2 className="font-serif text-xl text-[#FBF3EA]">
                  Example Features ({current.exampleFeatures.length})
                </h2>
                <p className="text-xs text-[#FBF3EA]/65 mt-0.5">
                  The exact highlights visitors read to see what their recipient will experience.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {current.exampleFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-[11px] tabular-nums text-[#E2B96F]/70 w-5 shrink-0 text-right">
                    0{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={feature}
                    aria-label={`Example feature ${idx + 1}`}
                    onChange={(e) => handleUpdateFeature(idx, e.target.value)}
                    className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
                  />
                  <button
                    type="button"
                    onClick={() => handleMoveFeature(idx, -1)}
                    disabled={idx === 0}
                    aria-label={`Move feature ${idx + 1} up`}
                    className="h-9 w-9 rounded-lg border border-[#E2B96F]/20 bg-[#120408] text-[#FBF3EA]/70 hover:text-[#E2B96F] disabled:opacity-30 flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveFeature(idx, 1)}
                    disabled={idx === current.exampleFeatures.length - 1}
                    aria-label={`Move feature ${idx + 1} down`}
                    className="h-9 w-9 rounded-lg border border-[#E2B96F]/20 bg-[#120408] text-[#FBF3EA]/70 hover:text-[#E2B96F] disabled:opacity-30 flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(idx)}
                    aria-label={`Remove feature ${idx + 1}`}
                    className="h-9 w-9 rounded-lg border border-rose-500/30 bg-rose-950/50 text-rose-300 hover:bg-rose-900/60 flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-[#FBF3EA]/10">
              <input
                type="text"
                data-testid="new-example-feature-input"
                value={newFeatureText}
                onChange={(e) => setNewFeatureText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                placeholder="Add an example feature (e.g. Handwritten Polaroid timeline captions)..."
                className="flex-1 min-h-[40px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
              />
              <button
                type="button"
                data-testid="add-example-feature-btn"
                onClick={handleAddFeature}
                className="min-h-[40px] px-4 rounded-xl bg-[#E2B96F]/15 hover:bg-[#E2B96F]/25 border border-[#E2B96F]/35 text-[#E2B96F] font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Feature</span>
              </button>
            </div>
          </div>

          {/* Interactive Unboxing Cinema Spotlight & Preview Media */}
          <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-5 sm:p-6 space-y-4">
            <div className="border-b border-[#FBF3EA]/10 pb-3">
              <h2 className="font-serif text-xl text-[#FBF3EA]">
                Demo Cinema Spotlight &amp; Preview Media
              </h2>
              <p className="text-xs text-[#FBF3EA]/65 mt-0.5">
                Customizes this edition&apos;s scene inside the 5-step Interactive Unboxing Reel and optional hover video.
              </p>
            </div>

            <label className="block text-xs text-[#FBF3EA]/75">
              Demo Reel Scene Headline
              <input
                type="text"
                value={current.demoSceneTitle}
                onChange={(e) => updateCurrent({ demoSceneTitle: e.target.value })}
                className="mt-1.5 w-full min-h-[40px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
              />
            </label>

            <label className="block text-xs text-[#FBF3EA]/75">
              Demo Reel Scene Explanation
              <textarea
                rows={2}
                value={current.demoSceneSubtitle}
                onChange={(e) => updateCurrent({ demoSceneSubtitle: e.target.value })}
                className="mt-1.5 w-full p-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA] leading-relaxed"
              />
            </label>

            <label className="block text-xs text-[#FBF3EA]/75">
              Recipient Reaction Quote
              <input
                type="text"
                value={current.demoSceneQuote}
                onChange={(e) => updateCurrent({ demoSceneQuote: e.target.value })}
                className="mt-1.5 w-full min-h-[40px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
              />
            </label>

            <div className="pt-2 border-t border-[#FBF3EA]/10 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[#FBF3EA]/75 font-medium">
                  Optional Custom Preview Video / Image URL (leave blank to use built-in interactive animation)
                </span>
                {onUploadExperienceMedia && (
                  <label className="min-h-[34px] px-3 rounded-lg bg-[#E2B96F] text-[#16050A] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingMedia ? 'Uploading...' : 'Upload Media'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={current.mediaUrl}
                  onChange={(e) => updateCurrent({ mediaUrl: e.target.value })}
                  placeholder="Optional video or image URL..."
                  className="sm:col-span-3 min-h-[38px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs font-mono text-[#FBF3EA]"
                />
                <select
                  value={current.mediaType}
                  onChange={(e) =>
                    updateCurrent({ mediaType: e.target.value === 'video' ? 'video' : 'image' })
                  }
                  aria-label="Preview media type"
                  className="min-h-[38px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Sales Card Preview */}
        <div className="xl:col-span-5 xl:sticky xl:top-24 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#FBF3EA]/65 px-1">
            <span>Live Sales Page Card Preview</span>
            <span className="font-mono text-[#E2B96F]">{current.editionLabel}</span>
          </div>

          <div className="rounded-3xl bg-[#FFFBF6] text-[#2B1710] border border-[#E2B96F]/35 overflow-hidden">
            <div className="bg-gradient-to-br from-[#2B0813] via-[#421020] to-[#1A040A] p-4 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-[#DCC397]">
                <span>Hover to Play Motion</span>
                <span className="font-mono font-semibold">{current.editionLabel}</span>
              </div>
              {current.mediaUrl && current.mediaType === 'video' ? (
                <video
                  src={current.mediaUrl}
                  controls
                  muted
                  className="w-full aspect-[16/9] object-cover rounded-xl border border-white/10"
                />
              ) : current.mediaUrl && current.mediaType === 'image' ? (
                <img
                  src={current.mediaUrl}
                  alt={current.title}
                  className="w-full aspect-[16/9] object-cover rounded-xl border border-white/10"
                />
              ) : (
                <div className="rounded-xl bg-black/35 border border-[#E2B96F]/20 px-4 py-7 text-center text-xs text-[#FBF3EA]/75">
                  Built-in interactive{' '}
                  {activeKey === 'chasing-her'
                    ? 'Polaroid Conveyor & Wax Seal'
                    : '34-Photo Heart Mosaic'}{' '}
                  preview active
                </div>
              )}
              <div className="text-[11px] text-[#FBF3EA]/90 bg-black/45 px-3 py-1.5 rounded-lg border border-white/10 truncate">
                ✦ {current.featureStrip}
              </div>
            </div>

            <div className="p-5 space-y-3">
              <h3 className="font-serif text-2xl text-[#5A1A2C] leading-snug">
                {current.title}
              </h3>
              <p className="text-xs text-[#7A5A47] leading-relaxed">{current.description}</p>

              {current.exampleFeatures.length > 0 && (
                <ul className="space-y-1.5 pt-2 border-t border-[#5A1A2C]/10">
                  {current.exampleFeatures.map((feat, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs text-[#3F2A22] leading-snug"
                    >
                      <span className="text-[#C2185B] font-bold shrink-0">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="pt-2 flex items-center gap-2">
                <span className="flex-1 py-2.5 px-3 rounded-full bg-[#FBF3EA] border border-[#5A1A2C]/20 text-[#5A1A2C] font-bold text-[11px] text-center">
                  Launch Live Sample
                </span>
                <span className="flex-1 py-2.5 px-3 rounded-full bg-[#5A1A2C] text-[#FBF3EA] font-bold text-[11px] text-center">
                  {current.ctaLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
