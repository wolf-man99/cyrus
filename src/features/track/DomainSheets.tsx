import type { LifeDomain } from '@/domain/types';
import { LogWeightSheet } from '@/features/today/sheets/LogWeightSheet';
import { LogWorkoutSheet } from '@/features/today/sheets/LogWorkoutSheet';
import { LogExpenseSheet } from '@/features/today/sheets/LogExpenseSheet';
import { activityKind } from './activityKinds';
import type { SheetRequest } from './domains/types';
import { GoalSheet } from './sheets/GoalSheet';
import { LogActivitySheet } from './sheets/LogActivitySheet';
import { BALANCES, BODY_MEASUREMENTS, MetricSheet } from './sheets/MetricSheet';
import { MoodSheet } from './sheets/MoodSheet';
import { LearningResourceSheet, LogProgressSheet } from './sheets/LearningSheets';
import { IncomeSheet, InvestmentSheet, ProjectSheet, SkillSheet } from './sheets/EntitySheets';
import { HealthReportSheet } from './sheets/HealthReportSheet';

interface DomainSheetsProps {
  domain: LifeDomain;
  request: SheetRequest | null;
  currency: string;
  onClose(): void;
}

/** Renders whichever logging or editing sheet the domain page asked for. */
export function DomainSheets({ domain, request: r, currency, onClose }: DomainSheetsProps) {
  const is = <T extends SheetRequest['type']>(type: T) => r?.type === type;
  const close = (open: boolean) => !open && onClose();

  return (
    <>
      <LogWeightSheet open={is('weight')} onOpenChange={close} />
      <LogWorkoutSheet open={is('workout')} onOpenChange={close} />
      <LogExpenseSheet open={is('expense')} onOpenChange={close} />
      <IncomeSheet open={is('income')} onOpenChange={close} />
      <MoodSheet open={is('mood')} onOpenChange={close} />
      <HealthReportSheet open={is('report')} onOpenChange={close} />
      <LogProgressSheet open={is('progress')} onOpenChange={close} />
      <LogActivitySheet config={r?.type === 'activity' ? (activityKind(domain, r.kind) ?? null) : null} onOpenChange={close} />
      <MetricSheet
        open={is('metric')}
        onOpenChange={close}
        domain={domain}
        currency={currency}
        title={r?.type === 'metric' && r.set === 'balances' ? 'Savings & debt' : 'Measurements'}
        options={r?.type === 'metric' && r.set === 'balances' ? BALANCES : BODY_MEASUREMENTS}
      />
      <LearningResourceSheet open={is('resource')} onOpenChange={close} resource={r?.type === 'resource' ? r.resource : null} />
      {r?.type === 'skill' && <SkillSheet open onOpenChange={close} domain={r.domain} skill={r.skill} />}
      {r?.type === 'project' && <ProjectSheet open onOpenChange={close} domain={r.domain} kind={r.kind} project={r.project} />}
      <InvestmentSheet open={is('investment')} onOpenChange={close} investment={r?.type === 'investment' ? r.investment : null} />
      <GoalSheet open={is('goal')} onOpenChange={close} domain={domain} goal={r?.type === 'goal' ? r.goal : null} />
    </>
  );
}
