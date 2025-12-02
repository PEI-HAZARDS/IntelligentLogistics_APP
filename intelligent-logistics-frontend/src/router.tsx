import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './Login';

const GateQuickLayout = React.lazy(() => import('./app/gate-operator/layout/OperatorQuick'));
const GateDetailLayout = React.lazy(() => import('./app/gate-operator/layout/OperatorDetail'));
const Dashboard = React.lazy(() => import('./app/gate-operator/components/Dashboard'));
const ArrivalsList = React.lazy(() => import('./app/gate-operator/routes/ArrivalsList'));
const ArrivalCard = React.lazy(() => import('./app/gate-operator/components/ArrivalCard'));

const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  { path: '/login', element: <Login /> },
  {
    path: '/gate',
    element: <GateQuickLayout />,
    children: [
      { index: true, element: <Dashboard /> },
    ],
  },
  {
    path: '/gate/arrivals',
    element: <GateDetailLayout />,
    children: [
      { index: true, element: <ArrivalsList /> },
    ],
  },
]);

export default function AppRouter() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}