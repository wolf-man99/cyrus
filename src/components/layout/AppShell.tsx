import { Outlet, ScrollRestoration } from 'react-router';
import { useIsDemo } from '@/app/providers/DataProvider';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { DemoBanner } from './DemoBanner';

export function AppShell() {
  const isDemo = useIsDemo();
  return (
    <div className="relative min-h-dvh">
      <div className="cosmos" aria-hidden />
      <SideNav className="hidden lg:flex" />
      <main className="relative z-10 lg:pl-[17rem]">
        <div className="mx-auto w-full max-w-[72rem] px-4 pt-safe pb-nav sm:px-6 lg:px-10 lg:pt-8 lg:pb-14">
          {isDemo && <DemoBanner className="mb-3 lg:hidden" />}
          <Outlet />
        </div>
      </main>
      <BottomNav className="lg:hidden" />
      <ScrollRestoration />
    </div>
  );
}
