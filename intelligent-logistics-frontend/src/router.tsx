import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from '@/pages/Login/Login';

// Layouts e Componentes do Operador de Portaria
const GateQuickLayout = React.lazy(() => import('@/components/layout/gate-operator/OperatorQuick'));
const GateDetailLayout = React.lazy(() => import('@/components/layout/gate-operator/OperatorDetail'));
const Dashboard = React.lazy(() => import('@/components/gate-operator/Dashboard'));
const ArrivalsList = React.lazy(() => import('@/pages/gate-operator/ArrivalsList'));
const AlertsPage = React.lazy(() => import('@/pages/gate-operator/AlertsPage'));

// Componentes do Gestor Logístico
const ManagerDashboard = React.lazy(() => import('@/pages/logistics-manager/ManagerDashboard'));

// Rotas Comuns (Login)
const commonRoutes = [
  { path: '/', element: <Login /> },
  { path: '/login', element: <Login /> },
];

// Rotas do Operador de Portaria
const gateRoutes = [
  ...commonRoutes,
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
  {
    path: '/gate/alerts',
    element: <GateDetailLayout />,
    children: [
      { index: true, element: <AlertsPage /> },
    ],
  },
  // Redireciona qualquer rota desconhecida para /gate
  { path: '*', element: <Navigate to="/gate" replace /> }
];

// Rotas do Gestor Logístico
const managerRoutes = [
  ...commonRoutes,
  {
    path: '/manager',
    element: <ManagerDashboard />
  },
  // Redireciona qualquer rota desconhecida para /manager
  { path: '*', element: <Navigate to="/manager" replace /> }
];

// Seleção de rotas baseada no modo
const getRoutes = () => {
  const mode = import.meta.env.MODE;

  console.log(`Carregando rotas para o modo: ${mode}`);

  switch (mode) {
    case 'manager':
      return managerRoutes;
    case 'gate':
    default:
      // Gate é agora o modo padrão (driver foi movido para app nativo)
      return gateRoutes;
  }
};

const router = createBrowserRouter(getRoutes());

export default function AppRouter() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}