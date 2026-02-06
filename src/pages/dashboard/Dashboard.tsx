import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import DoctorDashboard from './DoctorDashboard';
import SecretaryDashboard from './SecretaryDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If role is not yet loaded, show loading
  if (!role) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect patient to their dedicated route (outside DashboardLayout)
  if (role === 'patient') {
    return <Navigate to="/patient" replace />;
  }

  // Handle super_admin as admin role for dashboard access
  const effectiveRole = role === 'super_admin' ? 'admin' : role;

  switch (effectiveRole) {
    case 'admin':
      return <AdminDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'secretary':
      return <SecretaryDashboard />;
    default:
      return <Navigate to="/patient" replace />;
  }
}
