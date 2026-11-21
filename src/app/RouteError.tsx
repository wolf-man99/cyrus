import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button } from '@/components/ui/Button';

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unexpected error';
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="cosmos" aria-hidden />
      <div className="relative">
        <p className="font-display text-title font-bold">Something broke in orbit</p>
        <p className="mt-2 text-callout text-muted">{message}</p>
        <Button className="mt-6" onClick={() => window.location.assign('/')}>
          Back to Today
        </Button>
      </div>
    </div>
  );
}
