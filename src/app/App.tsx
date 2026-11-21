import { RouterProvider } from 'react-router';
import { AuthProvider } from './providers/AuthProvider';
import { DataProvider } from './providers/DataProvider';
import { ToastProvider } from './providers/ToastProvider';
import { router } from './router';

export function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}
