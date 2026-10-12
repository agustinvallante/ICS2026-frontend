import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './modules/auth/context/AuthProvider';
import ProtectedRoute from './modules/auth/components/ProtectedRoute';
import { Toaster } from 'sonner';

const LoginPage = lazy(() => import('./modules/auth/pages/LoginPage'));
const Dashboard = lazy(() => import('./modules/templates/components/Dashboard'));
const ListOrdersPage = lazy(() => import('./modules/orders/pages/ListOrdersPage'));
const Home = lazy(() => import('./modules/home/pages/Home'));
const ListProductsPage = lazy(() => import('./modules/products/pages/ListProductsPage'));
const CreateProductPage = lazy(() => import('./modules/products/pages/CreateProductPage'));
const ClientProductsPage = lazy(() => import('./modules/products/pages/ClientProductsPage'));
const CartPage = lazy(() => import('./modules/orders/pages/CartPage'));

function App() {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <><Outlet /></>,
      children: [
        {
          path: '/',
          element: <ClientProductsPage />,
        },
        {
          path: '/cart',
          element: <CartPage />,
        },
      ],
    },
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/admin',
      element: (
        <ProtectedRoute allowedRoles={['Admin']}>
          <Dashboard />
        </ProtectedRoute>
      ),
      children: [
        { path: '/admin/home', element: <Home /> },
        { path: '/admin/products', element: <ListProductsPage /> },
        { path: '/admin/products/create', element: <CreateProductPage /> },
        { path: '/admin/orders', element: <ListOrdersPage /> },
      ],
    },
  ]);

  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <Suspense fallback={<div role="status">Cargando página...</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </AuthProvider>
  );
}

export default App;
