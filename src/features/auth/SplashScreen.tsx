import { MiniOrb } from '@/components/brand/MiniOrb';

export function SplashScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading CYRUS">
      <div className="cosmos" aria-hidden />
      <MiniOrb className="relative size-14" />
    </div>
  );
}
