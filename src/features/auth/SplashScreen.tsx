import { OrbitMark } from '@/components/brand/OrbitMark';

export function SplashScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading CYRUS">
      <div className="cosmos" aria-hidden />
      <OrbitMark className="relative size-10 text-secondary" />
    </div>
  );
}
