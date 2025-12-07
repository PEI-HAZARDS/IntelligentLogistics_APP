import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from '@/pages/Login/Login';

const GateQuickLayout = React.lazy(() => import('@/components/layout/gate-operator/OperatorQuick'));
const GateDetailLayout = React.lazy(() => import('@/components/layout/gate-operator/OperatorDetail'));
const Dashboard = React.lazy(() => import('@/components/gate-operator/Dashboard'));
const ArrivalsList = React.lazy(() => import('@/pages/gate-operator/ArrivalsList'));
const ArrivalCard = React.lazy(() => import('@/components/gate-operator/ArrivalCard'));

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