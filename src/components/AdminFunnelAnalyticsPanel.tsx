import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  RefreshCw,
  Trash2,
  TrendingDown,
  Users,
  CheckCircle2,
  Eye,
  AlertCircle,
  Clock,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import { ACTIVE_COUNTRIES, ActiveCountryCode, COUNTRIES } from '../utils/platformLogic';
import {
  FunnelCampaignId,
  FunnelQuestionKey,
  FunnelSessionRecord,
  buildFunnelSessionsCsv,
  computeFunnelAnalytics,
  computeQuestionBreakdown,
  filterFunnelSessions,
  getFunnelDisplayName,
  getFunnelQuestions,
  getFunnelStepLabel,
  getSessionOutcomeLabel,
} from '../utils/funnelTracking';

interface AdminFunnelAnalyticsPanelProps {
  sessions: FunnelSessionRecord[];
  onDeleteSession: (sessionId: string) => void;
  onRefreshSessions?: () => Promise<void> | void;
  isAdminSynced?: boolean;
}

const QUESTION_KEYS: readonly FunnelQuestionKey[] = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];

function formatRelativeTime(iso: string): string {
  const parsed = Date.parse(iso || '');
  if (Number.isNaN(parsed)) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(parsed).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  const parsed = Date.parse(iso || '');
  if (Number.isNaN(parsed)) return '—';
  return new Date(parsed).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AdminFunnelAnalyticsPanel: React.FC<AdminFunnelAnalyticsPanelProps> = ({
  sessions,
  onDeleteSession,
  onRefreshSessions,
  isAdminSynced = false,
}) => {
  const [funnelFilter, setFunnelFilter] = useState<'all' | FunnelCampaignId>('all');
  const [countryFilter, setCountryFilter] = useState<'all' | ActiveCountryCode>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'dropped' | 'completed' | 'checkout'
  >('all');
  const [breakdownFunnel, setBreakdownFunnel] = useState<FunnelCampaignId>(
    'reconcile-interactive'
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeBreakdownFunnel: FunnelCampaignId =
    funnelFilter === 'all' ? breakdownFunnel : funnelFilter;

  const filteredSessions = useMemo(
    () =>
      filterFunnelSessions(sessions, {
        funnel: funnelFilter,
        country: countryFilter,
        status: statusFilter,
      }),
    [sessions, funnelFilter, countryFilter, statusFilter]
  );

  const summary = useMemo(
    () =>
      computeFunnelAnalytics(sessions, {
        funnel: funnelFilter,
        country: countryFilter,
        status: statusFilter,
      }),
    [sessions, funnelFilter, countryFilter, statusFilter]
  );

  const questionBreakdown = useMemo(
    () => computeQuestionBreakdown(filteredSessions, activeBreakdownFunnel),
    [filteredSessions, activeBreakdownFunnel]
  );

  const selectedSession = useMemo(() => {
    if (filteredSessions.length === 0) return null;
    if (selectedSessionId) {
      const exact = filteredSessions.find((s) => s.id === selectedSessionId);
      if (exact) return exact;
    }
    return filteredSessions[0];
  }, [filteredSessions, selectedSessionId]);

  const handleRefresh = async () => {
    if (!onRefreshSessions) return;
    setIsRefreshing(true);
    try {
      await onRefreshSessions();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportCsv = () => {
    const csv = buildFunnelSessionsCsv(filteredSessions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chasing-her-quiz-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toneTextClass = (tone: 'emerald' | 'gold' | 'amber' | 'rose') => {
    switch (tone) {
      case 'emerald':
        return 'text-emerald-300';
      case 'gold':
        return 'text-[#E2B96F]';
      case 'amber':
        return 'text-amber-300';
      case 'rose':
        return 'text-rose-300';
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-funnel-analytics-panel">
      {/* Filter & Export Toolbar */}
      <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/15 p-3.5 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Funnel Segmented Control */}
          <div
            className="flex items-center bg-[#120408] p-1 rounded-xl border border-[#E2B96F]/15"
            role="group"
            aria-label="Filter by interactive funnel"
          >
            {(
              [
                { id: 'all', label: 'All Funnels' },
                { id: 'reconcile-interactive', label: 'Win Her Back' },
                { id: 'birthday-interactive', label: 'Birthday' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFunnelFilter(opt.id)}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  funnelFilter === opt.id
                    ? 'bg-[#E2B96F] text-[#16050A]'
                    : 'text-[#FBF3EA]/65 hover:text-[#FBF3EA]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Country Filter */}
          <div
            className="flex items-center bg-[#120408] p-1 rounded-xl border border-[#E2B96F]/15"
            role="group"
            aria-label="Filter by country market"
          >
            {(['all', ...ACTIVE_COUNTRIES] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setCountryFilter(code)}
                className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  countryFilter === code
                    ? 'bg-[#E2B96F] text-[#16050A]'
                    : 'text-[#FBF3EA]/65 hover:text-[#FBF3EA]'
                }`}
              >
                {code === 'all' ? 'All' : code.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Outcome Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as 'all' | 'dropped' | 'completed' | 'checkout'
              )
            }
            aria-label="Filter sessions by completion status"
            className="min-h-[42px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
          >
            <option value="all">All Visitor Progress</option>
            <option value="dropped">Dropped Off Before Result</option>
            <option value="completed">Completed All 6 Questions</option>
            <option value="checkout">Started Checkout</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          <span className="text-[11px] text-[#FBF3EA]/55 mr-1">
            {isAdminSynced ? 'Live Firestore + Local' : 'Local Session Feed'}
          </span>
          {onRefreshSessions && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="min-h-[38px] px-3.5 rounded-xl border border-[#E2B96F]/25 bg-[#120408] hover:border-[#E2B96F]/60 text-xs font-medium text-[#FBF3EA]/85 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#E2B96F] ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredSessions.length === 0}
            className="min-h-[38px] px-3.5 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip (Flat Elevation, Tabular Numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl p-4 sm:p-5 bg-[#1A060C] border border-[#E2B96F]/15">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#FBF3EA]/60">Visitors Tracked</p>
            <Users className="w-4 h-4 text-[#E2B96F]/75 shrink-0" />
          </div>
          <p
            data-testid="analytics-kpi-total"
            className="font-serif text-3xl text-[#FBF3EA] mt-1.5 font-mono tabular-nums"
          >
            {summary.totalSessions}
          </p>
          <p className="text-xs text-[#FBF3EA]/55 mt-1 font-mono tabular-nums">
            {summary.startedQuizCount} started Q1 · {summary.droppedBeforeResultCount} dropped
          </p>
        </div>

        <div className="rounded-2xl p-4 sm:p-5 bg-[#1A060C] border border-[#E2B96F]/15">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#FBF3EA]/60">Quiz Completion</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-300/80 shrink-0" />
          </div>
          <p
            data-testid="analytics-kpi-completion"
            className="font-serif text-3xl text-emerald-300 mt-1.5 font-mono tabular-nums"
          >
            {summary.completedQuizRate}%
          </p>
          <p className="text-xs text-[#FBF3EA]/55 mt-1 font-mono tabular-nums">
            {summary.completedQuizCount} of {summary.totalSessions} reached result
          </p>
        </div>

        <div className="rounded-2xl p-4 sm:p-5 bg-[#1A060C] border border-[#E2B96F]/15">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#FBF3EA]/60">Demo &amp; Checkout Intent</p>
            <Eye className="w-4 h-4 text-[#E2B96F]/80 shrink-0" />
          </div>
          <p className="font-serif text-3xl text-[#E2B96F] mt-1.5 font-mono tabular-nums">
            {summary.reachedSampleRate}%
          </p>
          <p className="text-xs text-[#FBF3EA]/55 mt-1 font-mono tabular-nums">
            {summary.reachedSampleCount} demo · {summary.startedCheckoutCount} checkout
          </p>
        </div>

        <div className="rounded-2xl p-4 sm:p-5 bg-[#1A060C] border border-[#E2B96F]/15">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#FBF3EA]/60">Highest Drop-Off Step</p>
            <TrendingDown className="w-4 h-4 text-rose-300/85 shrink-0" />
          </div>
          <p
            data-testid="analytics-kpi-dropoff"
            className="font-serif text-2xl sm:text-3xl text-rose-300 mt-1.5 truncate"
          >
            {summary.topDropOffStep ? summary.topDropOffStep.label : 'None Yet'}
          </p>
          <p className="text-xs text-[#FBF3EA]/55 mt-1 font-mono tabular-nums">
            {summary.topDropOffStep
              ? `${summary.topDropOffStep.stoppedCount} visitor${
                  summary.topDropOffStep.stoppedCount === 1 ? '' : 's'
                } stopped here`
              : 'Waiting for visitor sessions'}
          </p>
        </div>
      </div>

      {/* Empty State when no sessions exist yet */}
      {sessions.length === 0 ? (
        <div
          data-testid="analytics-empty-state"
          className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/15 p-10 sm:p-14 text-center space-y-3"
        >
          <BarChart3 className="w-9 h-9 text-[#E2B96F]/70 mx-auto" />
          <h2 className="font-serif text-2xl text-[#FBF3EA]">
            No questionnaire sessions tracked yet
          </h2>
          <p className="text-xs sm:text-sm text-[#FBF3EA]/65 max-w-lg mx-auto leading-relaxed">
            As soon as visitors open your Win Her Back Interactive or Birthday Interactive sales pages and start answering questions, every response and exact drop-off step appears here in real time.
          </p>
        </div>
      ) : (
        <>
          {/* Step-by-Step Drop-Off Funnel Visualization */}
          <section
            aria-label="Step-by-step drop-off funnel"
            className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/15 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#E2B96F]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg sm:text-xl text-[#FBF3EA]">
                  Step-by-Step Drop-Off Funnel
                </h2>
                <p className="text-xs text-[#FBF3EA]/60 mt-0.5">
                  See exactly how many visitors reach each screen and where they stop before checkout.
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#E2B96F]">
                {summary.totalSessions} session{summary.totalSessions === 1 ? '' : 's'} analyzed
              </span>
            </div>

            <div className="p-5 space-y-3" data-testid="analytics-dropoff-bars">
              {summary.steps.map((stepMetric) => {
                const isCheckout = stepMetric.step === 'checkout_started';
                const isPostQuiz =
                  stepMetric.step === 'result' ||
                  stepMetric.step === 'sample' ||
                  stepMetric.step === 'offer';
                const isTopDropOff =
                  summary.topDropOffStep?.step === stepMetric.step &&
                  stepMetric.stoppedHereCount > 0;

                return (
                  <div
                    key={stepMetric.step}
                    className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center rounded-xl px-3.5 py-2.5 border transition-colors ${
                      isTopDropOff
                        ? 'bg-rose-950/25 border-rose-400/35'
                        : 'bg-[#120408]/75 border-[#FBF3EA]/8'
                    }`}
                  >
                    <div className="md:col-span-3 flex items-center justify-between md:justify-start gap-2">
                      <span className="text-xs font-medium text-[#FBF3EA]">
                        {stepMetric.label}
                      </span>
                      <span className="md:hidden text-xs font-mono tabular-nums text-[#E2B96F]">
                        {stepMetric.reachedCount} ({stepMetric.reachedPercent}%)
                      </span>
                    </div>

                    <div className="md:col-span-5">
                      <div className="w-full h-2.5 rounded-full bg-[#240912] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCheckout
                              ? 'bg-emerald-400'
                              : isPostQuiz
                              ? 'bg-[#E2B96F]'
                              : 'bg-[#C87D87]'
                          }`}
                          style={{
                            width: `${Math.max(
                              stepMetric.reachedCount > 0 ? 4 : 0,
                              stepMetric.reachedPercent
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="hidden md:flex md:col-span-2 items-center justify-end gap-2 text-xs font-mono tabular-nums">
                      <span className="text-[#FBF3EA] font-semibold">
                        {stepMetric.reachedCount}
                      </span>
                      <span className="text-[#FBF3EA]/50">
                        ({stepMetric.reachedPercent}%)
                      </span>
                    </div>

                    <div className="md:col-span-2 text-left md:text-right text-xs font-mono tabular-nums">
                      {isCheckout ? (
                        <span className="text-emerald-300 font-semibold">
                          {stepMetric.stoppedHereCount > 0
                            ? `${stepMetric.stoppedHereCount} checkout`
                            : '0 checkout'}
                        </span>
                      ) : stepMetric.stoppedHereCount > 0 ? (
                        <span
                          className={
                            isPostQuiz
                              ? 'text-amber-300 font-semibold'
                              : 'text-rose-300 font-semibold'
                          }
                        >
                          {stepMetric.stoppedHereCount} stopped here
                        </span>
                      ) : (
                        <span className="text-[#FBF3EA]/35">0 stopped</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Individual Client Response Inspector (Master-Detail Grid) */}
          <section
            aria-label="Individual client responses"
            className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start"
          >
            {/* Left List: Tracked Sessions */}
            <div className="xl:col-span-7 rounded-2xl bg-[#1A060C] border border-[#E2B96F]/15 overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2B96F]/15 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl text-[#FBF3EA]">
                    Client Questionnaire Sessions
                  </h2>
                  <p className="text-xs text-[#FBF3EA]/60 mt-0.5">
                    Select any visitor to read every answer they chose and see the exact point where they stopped.
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-[#FBF3EA]/60 shrink-0">
                  {filteredSessions.length} shown
                </span>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <FileSpreadsheet className="w-7 h-7 text-[#E2B96F]/60 mx-auto" />
                  <p className="text-sm text-[#FBF3EA] font-medium">
                    No sessions match your current filter
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFunnelFilter('all');
                      setCountryFilter('all');
                      setStatusFilter('all');
                    }}
                    className="min-h-[36px] px-3.5 rounded-lg border border-[#E2B96F]/30 text-xs text-[#E2B96F] hover:bg-[#E2B96F]/10 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile Card Stack */}
                  <div className="md:hidden divide-y divide-[#FBF3EA]/10">
                    {filteredSessions.map((session) => {
                      const outcome = getSessionOutcomeLabel(session);
                      const isSelected = selectedSession?.id === session.id;
                      const countryCfg = COUNTRIES[session.country] || COUNTRIES.gh;
                      return (
                        <div
                          key={session.id}
                          onClick={() => setSelectedSessionId(session.id)}
                          className={`p-4 space-y-2 cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#280B14]' : 'hover:bg-[#210810]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#FBF3EA] truncate">
                                {getFunnelDisplayName(session.funnel)}
                              </p>
                              <p className="text-[11px] font-mono text-[#FBF3EA]/55">
                                {countryCfg.flag} {session.country.toUpperCase()} ·{' '}
                                {session.answeredCount}/6 answered ·{' '}
                                {formatRelativeTime(session.updatedAt)}
                              </p>
                            </div>
                            <span
                              className={`text-xs font-semibold shrink-0 ${toneTextClass(
                                outcome.tone
                              )}`}
                            >
                              {outcome.label}
                            </span>
                          </div>
                          {session.resultTitle && (
                            <p className="text-xs text-[#E2B96F] truncate">
                              Result: {session.resultTitle}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table
                      className="w-full text-left border-collapse table-fixed"
                      data-testid="analytics-sessions-table"
                    >
                      <thead>
                        <tr className="border-b border-[#E2B96F]/15 text-[11px] font-medium text-[#FBF3EA]/55 bg-[#16050A]">
                          <th className="py-3 px-4 w-[28%]">Funnel &amp; Market</th>
                          <th className="py-3 px-3 w-[24%]">Stopped At</th>
                          <th className="py-3 px-3 w-[13%]">Progress</th>
                          <th className="py-3 px-3 w-[25%]">Matched Result</th>
                          <th className="py-3 px-3 w-[10%] text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#FBF3EA]/8 text-xs">
                        {filteredSessions.map((session) => {
                          const outcome = getSessionOutcomeLabel(session);
                          const isSelected = selectedSession?.id === session.id;
                          const countryCfg = COUNTRIES[session.country] || COUNTRIES.gh;
                          return (
                            <tr
                              key={session.id}
                              onClick={() => setSelectedSessionId(session.id)}
                              className={`transition-colors cursor-pointer ${
                                isSelected ? 'bg-[#280B14]' : 'hover:bg-[#210810]'
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                <div className="font-medium text-[#FBF3EA] truncate">
                                  {session.funnel === 'birthday-interactive'
                                    ? 'Birthday Quiz'
                                    : 'Win Her Back Quiz'}
                                </div>
                                <div className="text-[11px] text-[#FBF3EA]/55 font-mono mt-0.5 truncate">
                                  {countryCfg.flag} {session.country.toUpperCase()} ·{' '}
                                  {formatRelativeTime(session.updatedAt)}
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                <span
                                  className={`font-semibold ${toneTextClass(outcome.tone)}`}
                                >
                                  {outcome.label}
                                </span>
                              </td>

                              <td className="py-3.5 px-3 font-mono tabular-nums text-[#FBF3EA]/85">
                                {session.answeredCount}/6 Qs
                              </td>

                              <td className="py-3.5 px-3">
                                <span className="text-[#FBF3EA]/80 truncate block">
                                  {session.resultTitle || 'Did not finish quiz'}
                                </span>
                              </td>

                              <td
                                className="py-3.5 px-3 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => onDeleteSession(session.id)}
                                  aria-label={`Delete session ${session.id}`}
                                  className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg text-[#FBF3EA]/45 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Right Inspector: Selected Client's Full Q1-Q6 Answer Sheet */}
            <div
              className="xl:col-span-5 rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 overflow-hidden"
              data-testid="analytics-session-inspector"
            >
              {!selectedSession ? (
                <div className="p-8 text-center text-xs text-[#FBF3EA]/55">
                  Select a visitor session to inspect their answers.
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 border-b border-[#E2B96F]/15 bg-[#16050A] space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-[#E2B96F]">
                          {getFunnelDisplayName(selectedSession.funnel)} ·{' '}
                          {selectedSession.country.toUpperCase()}
                        </p>
                        <h3 className="font-serif text-lg text-[#FBF3EA] mt-0.5 truncate">
                          {selectedSession.resultTitle || 'Incomplete Quiz Session'}
                        </h3>
                      </div>
                      <span
                        className={`text-xs font-semibold shrink-0 ${toneTextClass(
                          getSessionOutcomeLabel(selectedSession).tone
                        )}`}
                      >
                        {getSessionOutcomeLabel(selectedSession).label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#FBF3EA]/55 font-mono tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#E2B96F]/70" />
                        Started {formatDateTime(selectedSession.startedAt)}
                      </span>
                      <span>Updated {formatRelativeTime(selectedSession.updatedAt)}</span>
                      <span>{selectedSession.answeredCount}/6 answered</span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3.5">
                    {selectedSession.recommendedEdition && (
                      <div className="rounded-xl bg-[#120408] border border-[#E2B96F]/20 px-4 py-3 flex items-center justify-between gap-3">
                        <span className="text-xs text-[#FBF3EA]/65 inline-flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#E2B96F]" />
                          Recommended Edition
                        </span>
                        <span className="text-xs font-semibold text-[#E2B96F]">
                          {selectedSession.recommendedEdition === 'chasing-her'
                            ? 'Chasing Her Edition'
                            : selectedSession.recommendedEdition === 'memories'
                            ? 'Memories 34-Heart Edition'
                            : 'Either Edition'}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {getFunnelQuestions(selectedSession.funnel).map((q, idx) => {
                        const qKey = QUESTION_KEYS[idx];
                        const answerText = selectedSession.answerLabels[qKey];
                        const isDropOffHere = selectedSession.furthestStep === qKey;

                        return (
                          <div
                            key={q.id}
                            className={`rounded-xl p-3.5 border ${
                              isDropOffHere
                                ? 'bg-rose-950/25 border-rose-400/35'
                                : answerText
                                ? 'bg-[#120408] border-[#E2B96F]/15'
                                : 'bg-[#120408]/45 border-[#FBF3EA]/8'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[11px] text-[#FBF3EA]/60 leading-snug">
                                <span className="font-mono text-[#E2B96F] mr-1.5">
                                  Q{q.number}
                                </span>
                                {q.prompt}
                              </p>
                              {isDropOffHere && (
                                <span className="text-[11px] font-semibold text-rose-300 shrink-0 inline-flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Stopped here
                                </span>
                              )}
                            </div>

                            {answerText ? (
                              <p className="text-xs sm:text-[13px] font-medium text-[#FBF3EA] mt-1.5 leading-snug">
                                {answerText}
                              </p>
                            ) : (
                              <p className="text-xs italic text-[#FBF3EA]/35 mt-1.5">
                                Stopped before answering this question
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-[#FBF3EA]/10 flex items-center justify-between text-[11px] text-[#FBF3EA]/50">
                      <span className="font-mono truncate">
                        Furthest stage: {getFunnelStepLabel(selectedSession.furthestStep)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteSession(selectedSession.id)}
                        className="text-rose-300/80 hover:text-rose-200 font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Aggregate Answer Breakdown Across All Clients (Q1-Q6) */}
          <section
            aria-label="Client answers breakdown by question"
            className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/15 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#E2B96F]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg sm:text-xl text-[#FBF3EA]">
                  Most Chosen Client Answers (Q1–Q6)
                </h2>
                <p className="text-xs text-[#FBF3EA]/60 mt-0.5">
                  Understand exactly what buyers are feeling and looking for across each question.
                </p>
              </div>

              {funnelFilter === 'all' && (
                <div className="flex items-center bg-[#120408] p-1 rounded-xl border border-[#E2B96F]/15 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setBreakdownFunnel('reconcile-interactive')}
                    className={`min-h-[32px] px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      activeBreakdownFunnel === 'reconcile-interactive'
                        ? 'bg-[#E2B96F] text-[#16050A]'
                        : 'text-[#FBF3EA]/65 hover:text-[#FBF3EA]'
                    }`}
                  >
                    Win Her Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreakdownFunnel('birthday-interactive')}
                    className={`min-h-[32px] px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      activeBreakdownFunnel === 'birthday-interactive'
                        ? 'bg-[#E2B96F] text-[#16050A]'
                        : 'text-[#FBF3EA]/65 hover:text-[#FBF3EA]'
                    }`}
                  >
                    Birthday
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {questionBreakdown.map((q) => (
                <div
                  key={q.questionId}
                  className="rounded-xl bg-[#120408] border border-[#E2B96F]/15 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-medium text-[#FBF3EA] leading-snug">
                      <span className="font-mono text-[#E2B96F] mr-1.5">
                        Q{q.number}.
                      </span>
                      {q.prompt}
                    </p>
                    <span className="text-[11px] font-mono tabular-nums text-[#FBF3EA]/50 shrink-0">
                      {q.totalResponses} resp.
                    </span>
                  </div>

                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <div key={opt.optionId} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-[#FBF3EA]/80 truncate">{opt.label}</span>
                          <span className="font-mono tabular-nums text-[#E2B96F] shrink-0">
                            {opt.count} ({opt.percent}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#240912] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#E2B96F]"
                            style={{ width: `${opt.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
