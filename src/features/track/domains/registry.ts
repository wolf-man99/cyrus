import type { LifeDomain } from '@/domain/types';
import type { DomainModule } from './types';
import { physicalModule } from './physical';
import { mentalModule } from './mental';
import { intellectualModule } from './intellectual';
import { financialModule } from './financial';
import { socialModule } from './social';
import { careerModule } from './career';
import { entrepreneurshipModule } from './entrepreneurship';

/** Each life domain plugs into the same page through one of these modules. */
export const DOMAIN_MODULES: Record<LifeDomain, DomainModule> = {
  physical: physicalModule,
  mental: mentalModule,
  intellectual: intellectualModule,
  financial: financialModule,
  social: socialModule,
  career: careerModule,
  entrepreneurship: entrepreneurshipModule,
};
