import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import kokoLogo from '@/assets/koko-sante-logo.jpeg';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { user, isLoading, role } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (user && role) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/role-select', { replace: true });
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, isLoading, role, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#1a4b9c] to-[#2d7dd2] relative">
      {/* Main content */}
      <div className="flex flex-col items-center animate-fade-in">
        {/* Logo */}
        <img src={kokoLogo} alt="KÔKÔ SANTÉ" className="w-[250px] h-auto rounded-3xl shadow-2xl" />
      </div>

      {/* Slogan at bottom */}
      <p className="absolute bottom-16 text-white/90 italic text-lg text-center px-4">
        Votre santé sans barrière
      </p>
    </div>
  );
}
