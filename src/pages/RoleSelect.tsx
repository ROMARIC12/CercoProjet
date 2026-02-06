import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Stethoscope, HeadphonesIcon, Settings, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type Role = 'patient' | 'doctor' | 'secretary' | 'admin';

const roles: { value: Role; title: string; subtitle: string; icon: typeof User }[] = [
  {
    value: 'patient',
    title: 'Patient',
    subtitle: 'Gérer mes RDV',
    icon: User,
  },
  {
    value: 'doctor',
    title: 'Médecin',
    subtitle: 'Suivi patients',
    icon: Stethoscope,
  },
  {
    value: 'secretary',
    title: 'Secrétaire',
    subtitle: 'Agenda cabinet',
    icon: HeadphonesIcon,
  },
  {
    value: 'admin',
    title: 'Admin',
    subtitle: 'Supervision',
    icon: Settings,
  },
];

export default function RoleSelect() {
  const navigate = useNavigate();
  const { user, role: userRole, isLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Redirect if already logged in with a role
  useEffect(() => {
    if (!isLoading && user && userRole) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, userRole, isLoading, navigate]);

  const handleContinue = () => {
    if (selectedRole) {
      sessionStorage.setItem('selectedRole', selectedRole);
      navigate('/register');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      {/* Header */}
      <header className="w-full bg-white py-4 px-4 flex items-center justify-center relative border-b border-border/50">
        <button
          onClick={handleBack}
          className="absolute left-4 w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center text-primary hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Identification</h1>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col px-6 pt-10 pb-6">
        {/* Title section */}
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Choisissez votre profil
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Accédez à votre espace personnalisé en{'\n'}sélectionnant votre rôle.
          </p>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          {roles.map((role) => {
            const isSelected = selectedRole === role.value;
            const Icon = role.icon;

            return (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={cn(
                  "flex flex-col items-center p-6 bg-white rounded-2xl transition-all duration-200",
                  "hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected
                    ? "ring-2 ring-primary shadow-elevated"
                    : "shadow-soft"
                )}
              >
                {/* Icon circle */}
                <div
                  className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                    isSelected
                      ? "bg-primary/10"
                      : "bg-gray-100"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-7 w-7 transition-colors",
                      isSelected
                        ? "text-primary"
                        : "text-gray-500"
                    )}
                  />
                </div>

                {/* Text */}
                <span className="font-semibold text-foreground text-base mb-1">
                  {role.title}
                </span>
                <span className="text-muted-foreground text-sm">
                  {role.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <Button
            size="lg"
            className={cn(
              "w-full h-14 rounded-2xl text-base font-semibold transition-all",
              selectedRole
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-gray-200 text-gray-400"
            )}
            disabled={!selectedRole}
            onClick={handleContinue}
          >
            Continuer
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-muted-foreground text-sm"
            onClick={handleLogin}
          >
            J'ai déjà un compte
          </Button>
        </div>
      </main>
    </div>
  );
}
