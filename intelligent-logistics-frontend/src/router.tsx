import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
/* import { AuthProvider } from './features/auth/AuthProvider';
import Login from './features/auth/Login'; */

const DriverLayout = React.lazy(() => import('./app/driver/layout/DriverLayout'));
const GateLayout = React.lazy(() => import('./app/gate-operator/layout/GateOperatorLayout'));
const ManagerLayout = React.lazy(() => import('./app/logistics-manager/layout/ManagerLayout'));

const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  { path: '/driver/*', element: <DriverLayout /> },
  { path: '/gate/*', element: <GateLayout /> },
  { path: '/manager/*', element: <ManagerLayout /> },
]);

export default function AppRouter() {
  return (
    <AuthProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </AuthProvider>
  );
}