import { ChevronRight, ClipboardList, Download, Lightbulb, Printer, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import type { FinancialInsight, InsightArea } from '../lib/insights';
import { downloadCsv } from '../lib/csv';
import { AREA_LABEL, PRIORITY_LABEL, buildReportCsv, type ReportScope } from './reportScope';

type InsightRouteTarget = FinancialInsight['route'];

function insightIcon(area: InsightArea) {
  if (area === 'accounts') return TrendingUp;
  if (area === 'goals') return Target;
  if (area === 'plan') return Lightbulb;
  if (area === 'transactions') return ClipboardList;
  return ShieldCheck;
}

function ReportScopePanel({ scope, insights }: { scope: ReportScope; insights: FinancialInsight[] }) {
  const period = scope.transactionPeriod ? `${scope.transactionPeriod.from} to ${scope.transactionPeriod.to}` : 'None recorded';
  return (
    <section className="account-panel report-scope-panel" aria-labelledby="report-scope-title" data-testid="report-scope">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">What this report is based on</p>
          <h2 id="report-scope-title">Report scope · as of {scope.asOf}</h2>
        </div>
        <div className="report-actions">
          <button
            type="button"
            className="secondary-button icon-text-button"
            onClick={() => downloadCsv(`finpath-report-${scope.asOf}.csv`, buildReportCsv(insights, scope))}
          >
            <Download size={16} aria-hidden="true" />
            Download CSV
          </button>
          <button type="button" className="secondary-button icon-text-button" onClick={() => {
              document.querySelectorAll<HTMLDetailsElement>('.insights-workspace details').forEach((detail) => {
                detail.open = true;
              });
              window.print();
            }}>
            <Printer size={16} aria-hidden="true" />
            Print
          </button>
        </div>
      </div>
      <dl className="report-scope-grid">
        <div><dt>Plan</dt><dd>{scope.planLabel}</dd></div>
        <div>
          <dt>Accounts</dt>
          <dd>{scope.accountCount}{scope.staleAccountCount ? ` (${scope.staleAccountCount} stale)` : ''}</dd>
        </div>
        <div><dt>Currencies</dt><dd>{scope.currencies.join(', ') || 'None'}</dd></div>
        <div><dt>Active goals</dt><dd>{scope.goalCount}</dd></div>
        <div><dt>Transactions</dt><dd>{scope.transactionCount} · {period}</dd></div>
      </dl>
      {scope.gaps.length ? (
        <div className="report-gaps" role="note" aria-label="Data gaps">
          <strong>Data gaps to keep in mind</strong>
          <ul>
            {scope.gaps.map((gap) => <li key={gap}>{gap}</li>)}
          </ul>
        </div>
      ) : (
        <p className="report-complete">No data gaps detected for this report.</p>
      )}
    </section>
  );
}

export function ReportsPanel({
  insights,
  onNavigate,
  scope
}: {
  insights: FinancialInsight[];
  onNavigate: (route: InsightRouteTarget) => void;
  scope?: ReportScope;
}) {
  const recommendationCount = insights.filter((insight) => insight.category === 'recommendation').length;
  const highPriorityCount = insights.filter((insight) => insight.priority === 'high').length;
  const evidenceCount = insights.reduce((total, insight) => total + insight.evidence.length, 0);
  const privacyInsight = insights.find((insight) => insight.area === 'privacy') ?? null;
  const workingInsights = insights.filter((insight) => insight.area !== 'privacy');

  return (
    <section className="insights-workspace" aria-label="Insights and recommendations">
      {scope ? <ReportScopePanel scope={scope} insights={insights} /> : null}

      <div className="insight-summary-strip">
        <article>
          <span>High priority</span>
          <strong>{highPriorityCount}</strong>
          <small>Items to review before using the plan as current.</small>
        </article>
        <article>
          <span>Recommendations</span>
          <strong>{recommendationCount}</strong>
          <small>Rule-based actions with cited inputs.</small>
        </article>
        <article>
          <span>Evidence points</span>
          <strong>{evidenceCount}</strong>
          <small>Plan, account, and goal facts behind each card.</small>
        </article>
      </div>

      <section className="account-panel insight-list-panel" aria-labelledby="insight-list-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Next actions</p>
            <h2 id="insight-list-title">Prioritized guidance</h2>
          </div>
          <button className="secondary-button icon-text-button" onClick={() => onNavigate('/plans')}>
            Plans
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="insight-card-list">
          {workingInsights.map((insight) => {
            const Icon = insightIcon(insight.area);
            return (
              <article className={`insight-card insight-priority-${insight.priority}`} key={insight.id}>
                <div className="insight-card-heading">
                  <span className="feature-icon">
                    <Icon size={18} />
                  </span>
                  <div>
                    <span>{AREA_LABEL[insight.area]} / {PRIORITY_LABEL[insight.priority]}</span>
                    <h3>{insight.title}</h3>
                  </div>
                  <span className="insight-category">{insight.category}</span>
                </div>

                <p>{insight.rationale}</p>

                <div className="insight-evidence-grid" aria-label={`${insight.title} evidence`}>
                  {insight.evidence.map((item) => (
                    <span key={`${insight.id}-${item.label}`}>
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                      {item.detail ? <em>{item.detail}</em> : null}
                    </span>
                  ))}
                </div>

                <div className="insight-action-row">
                  <div>
                    <strong>Suggested next step</strong>
                    <small>{insight.action}</small>
                  </div>
                  <button className="secondary-button icon-text-button" onClick={() => onNavigate(insight.route)}>
                    Open
                    <ChevronRight size={16} />
                  </button>
                </div>

                <details className="insight-detail">
                  <summary>Assumptions and uncertainty</summary>
                  <ul>
                    {insight.assumptions.map((assumption) => (
                      <li key={`${insight.id}-${assumption}`}>{assumption}</li>
                    ))}
                  </ul>
                  <p>{insight.uncertainty}</p>
                </details>
              </article>
            );
          })}
        </div>
      </section>

      {privacyInsight ? (
        <section className="account-panel insight-method-panel" aria-labelledby="insight-method-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Method</p>
              <h2 id="insight-method-title">{privacyInsight.title}</h2>
            </div>
            <span className="pill">{privacyInsight.evidence[0]?.value ?? 'Rule-based'}</span>
          </div>
          <p>{privacyInsight.rationale}</p>
          <div className="insight-action-row">
            <div>
              <strong>Boundary</strong>
              <small>{privacyInsight.action}</small>
            </div>
          </div>
          <details className="insight-detail">
            <summary>Assumptions and uncertainty</summary>
            <ul>
              {privacyInsight.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
            <p>{privacyInsight.uncertainty}</p>
          </details>
        </section>
      ) : null}
    </section>
  );
}
