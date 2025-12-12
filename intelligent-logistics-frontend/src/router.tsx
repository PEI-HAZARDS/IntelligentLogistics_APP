import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './Login';

const DriverLayout = React.lazy(() => import('./app/driver/layout/DriverLayout'));
const GateLayout = React.lazy(() => import('./app/gate-operator/layout/OperatorLayout'));
const GateDashboard = React.lazy(() => import('./app/gate-operator/routes/Dashboard'));
const ArrivalDetail = React.lazy(() => import('./app/gate-operator/routes/ArrivalDetail'));
const ManagerLayout = React.lazy(() => import('./app/logistics-manager/layout/ManagerLayout'));

const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  { path: '/login', element: <Login /> },
  { path: '/driver/*', element: <DriverLayout /> },
  {
    path: '/gate',
    element: <GateLayout />,
    children: [
      { index: true, element: <GateDashboard /> },             // /gate
      { path: 'arrival/:id', element: <ArrivalDetail /> },     // /gate/arrival/1234
      // outras rotas: { path: 'plates', element: <Plates /> }, ...
    ],
  },
  { path: '/manager/*', element: <ManagerLayout /> },
]);

export default function AppRouter() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}