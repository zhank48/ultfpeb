import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useGlobalAlert } from './SweetAlertProvider.jsx';
import { useEffect } from 'react';

export function ProtectedRoute({ children, requiredRoles = [], requireAdmin = false }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const { alert } = useGlobalAlert();

  useEffect(() => {
    // Tampilkan alert jika user tidak memiliki akses
    if (isAuthenticated && user && !isLoading) {
      const userRole = user.role?.toLowerCase();
      
      if (requireAdmin && userRole !== 'admin') {
        alert.error({
          title: 'Akses Ditolak',
          text: 'Anda tidak memiliki izin untuk mengakses halaman ini. Hanya Admin yang dapat mengakses.',
          confirmButtonText: 'OK'
        });
      } else if (requiredRoles.length > 0) {
        const normalizedRequiredRoles = requiredRoles.map(role => role.toLowerCase());
        if (!normalizedRequiredRoles.includes(userRole)) {
          alert.error({
            title: 'Akses Ditolak',
            text: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
            confirmButtonText: 'OK'
          });
        }
      }
    }
  }, [isAuthenticated, user, isLoading, requiredRoles, requireAdmin, alert]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin permission
  if (requireAdmin && user?.role?.toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Akses Ditolak</h1>
          <p className="text-slate-600">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          <p className="text-slate-500 text-sm mt-2">Hanya Admin yang dapat mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  // Check role permissions
  if (requiredRoles.length > 0) {
    const userRole = user?.role?.toLowerCase();
    const normalizedRequiredRoles = requiredRoles.map(role => role.toLowerCase());
    
    if (!normalizedRequiredRoles.includes(userRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Akses Ditolak</h1>
            <p className="text-slate-600">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
            <p className="text-slate-500 text-sm mt-2">Role yang diperlukan: {requiredRoles.join(', ')}</p>
          </div>
        </div>
      );
    }
  }

  return children;
}
