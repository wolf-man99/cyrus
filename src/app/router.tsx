import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { TodayPage } from '@/features/today/TodayPage';
import { WelcomePage } from '@/features/auth/WelcomePage';
import { SplashScreen } from '@/features/auth/SplashScreen';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { RouteError } from './RouteError';
import { useAuth } from './providers/AuthProvider';

/** Shows sign-in when a backend is configured and nobody is signed in. Demo mode skips auth. */
function AuthGate() {
  const { status } = useAuth();
  if (status === 'loading') return <SplashScreen />;
  if (status === 'signed-out') return <WelcomePage />;
  if (status === 'recovery') return <ResetPasswordPage />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <AuthGate />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <SplashScreen />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <TodayPage /> },
          { path: 'track', lazy: () => import('@/features/track/TrackPage').then((m) => ({ Component: m.TrackPage })) },
          {
            path: 'track/:domain',
            lazy: () => import('@/features/track/DomainPage').then((m) => ({ Component: m.DomainPage })),
          },
          {
            path: 'reflect',
            lazy: () => import('@/features/reflect/ReflectPage').then((m) => ({ Component: m.ReflectPage })),
          },
          {
            path: 'reflect/:period/:start',
            lazy: () => import('@/features/reflect/ReflectionFlow').then((m) => ({ Component: m.ReflectionFlow })),
          },
        ],
      },
      // Full-screen assistant — outside the shell, no tab bar.
      { path: 'cyrus', lazy: () => import('@/features/cyrus/CyrusPage').then((m) => ({ Component: m.CyrusPage })) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
