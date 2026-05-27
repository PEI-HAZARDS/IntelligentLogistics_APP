import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from '@/pages/Login/Login';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Gate Operator Layouts and Components
const GateQuickLayout = React.lazy(() => import('@/components/layout/gate-operator/OperatorQuick'));
const GateDetailLayout = React.lazy(() => import('@/components/layout/gate-operator/OperatorDetail'));
const Dashboard = React.lazy(() => import('@/components/gate-operator/Dashboard'));
const ArrivalsList = React.lazy(() => import('@/pages/gate-operator/ArrivalsList'));
const ArrivalDetail = React.lazy(() => import('@/pages/gate-operator/ArrivalDetail'));
const AlertsPage = React.lazy(() => import('@/pages/gate-operator/AlertsPage'));

// Logistics Manager Components
const ManagerLayout = React.lazy(() => import('@/components/layout/logistics-manager/ManagerLayout'));
const ManagerDashboard = React.lazy(() => import('@/pages/logistics-manager/ManagerDashboard'));
const ShiftsPage = React.lazy(() => import('@/pages/logistics-manager/ShiftsPage'));
const PortPerformancePage = React.lazy(() => import('@/pages/logistics-manager/PortPerformancePage'));
const InfractionsPage = React.lazy(() => import('@/pages/logistics-manager/InfractionsPage'));
const SustainabilityPage = React.lazy(() => import('@/pages/logistics-manager/SustainabilityPage'));
const ReportsPage = React.lazy(() => import('@/pages/logistics-manager/ReportsPage'));
const SettingsPage = React.lazy(() => import('@/pages/logistics-manager/SettingsPage'));

// Shared Components
const WarningSign = React.lazy(() => import('@/pages/shared/WarningSign'));
const EnergyMetrics = React.lazy(() => import('@/pages/shared/EnergyMetrics'));

// Common Routes (Login)
const commonRoutes = [
  { path: '/', element: <Login /> },
  { path: '/login', element: <Login /> },
  { path: '/warning-sign/:gateId', element: <WarningSign /> },
  { path: '/energy-metrics', element: <EnergyMetrics /> },
];

// Gate Operator Routes
const gateRoutes = [
  ...commonRoutes,
  // Redirect bare /gate to /gate/1 for backwards compat
  { path: '/gate', element: <ProtectedRoute allowedRoles={['operator']}><Navigate to="/gate/1" replace /></ProtectedRoute> },
  {
    path: '/gate/:gateId',
    element: <ProtectedRoute allowedRoles={['operator']}><GateQuickLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Dashboard /> },
    ],
  },
  {
    path: '/gate/:gateId/arrivals',
    element: <ProtectedRoute allowedRoles={['operator']}><GateDetailLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <ArrivalsList /> },
    ],
  },
  {
    path: '/gate/:gateId/arrival/:id',
    element: <ProtectedRoute allowedRoles={['operator']}><GateDetailLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <ArrivalDetail /> },
    ],
  },
  {
    path: '/gate/:gateId/alerts',
    element: <ProtectedRoute allowedRoles={['operator']}><GateDetailLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <AlertsPage /> },
    ],
  },
  // Redirect unknown routes to /gate/1
  { path: '*', element: <Navigate to="/gate/1" replace /> }
];

// Logistics Manager Routes
const managerRoutes = [
  ...commonRoutes,
  {
    path: '/manager',
    element: <ProtectedRoute allowedRoles={['manager']}><ManagerLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <ManagerDashboard /> },
      { path: 'performance', element: <PortPerformancePage /> },
      { path: 'infractions', element: <InfractionsPage /> },
      { path: 'sustainability', element: <SustainabilityPage /> },
      { path: 'shifts', element: <ShiftsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  // Redirect unknown routes to /manager
  { path: '*', element: <Navigate to="/manager" replace /> }
];

// Route selection based on build mode
const getRoutes = () => {
  const mode = import.meta.env.MODE;

  console.log(`Loading routes for mode: ${mode}`);

  switch (mode) {
    case 'manager':
      return managerRoutes;
    case 'gate':
    default:
      // Gate is the default mode (driver moved to native app)
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
