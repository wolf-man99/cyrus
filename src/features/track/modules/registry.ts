import type { ComponentType } from 'react';
import type { DomainSection } from '@/domain/lifeDomains';
import type { LifeDomain } from '@/domain/types';
import { physicalModule } from './physical';
import { financialModule } from './financial';

/**
 * Domain modules plug into the shared domain page. A domain only provides the sections it
 * has real data for; the rest fall back to shared views (goals, areas, honest empty states).
 * New domains are added here without touching the page.
 */
export type DomainModule = Partial<Record<Exclude<DomainSection, 'goals'>, ComponentType>>;

export const DOMAIN_MODULES: Partial<Record<LifeDomain, DomainModule>> = {
  physical: physicalModule,
  financial: financialModule,
};
