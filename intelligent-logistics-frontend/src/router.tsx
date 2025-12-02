import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './Login';

const GateLayout = React.lazy(() => import('./app/gate-operator/layout/OperatorQuick'));
const Dashboard = React.lazy(() => import('./app/gate-operator/components/Dashboard'));
const ArrivalCard = React.lazy(() => import('./app/gate-operator/components/ArrivalCard'));

const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  { path: '/login', element: <Login /> },
  {
    path: '/gate',
    element: <GateLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      /* { path: 'arrival/:id', element: <ArrivalCard /> }, */
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