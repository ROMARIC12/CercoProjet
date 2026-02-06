import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, ChevronLeft, BriefcaseMedical, Eye, EyeOff, LogIn, Mic } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && role) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      setIsLoading(false);
      return;
    }

    // Check if it's a phone number or email
    const isPhone = /^[0-9\s]+$/.test(email.replace(/\s+/g, ''));
    const authEmail = isPhone ? `${email.replace(/\s+/g, '')}@kokosante.app` : email;
    
    const { error: signInError } = await signIn(authEmail, password);

    if (signInError) {
      let errorMessage = 'Une erreur est survenue';
      
      if (signInError.message === 'Invalid login credentials') {
        errorMessage = 'Identifiant ou mot de passe incorrect';
      } else {
        errorMessage = signInError.message;
      }
      
      setError(errorMessage);
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Connexion réussie',
      description: 'Bienvenue sur KÔKÔ SANTÉ',
    });
    navigate('/dashboard');
    setIsLoading(false);
  };

  const handleBack = () => {
    navigate('/role-select');
  };

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      {/* Header */}
      <header className="w-full bg-white py-4 px-4 flex items-center justify-center relative border-b border-border/50">
        <button
          onClick={handleBack}
          className="absolute left-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-primary hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Connexion</h1>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col px-6 pt-8 pb-6">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
          {/* Logo section */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
              <BriefcaseMedical className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">
              Ravi de vous revoir
            </h2>
            <p className="text-muted-foreground text-sm text-center">
              Accédez à votre espace santé sécurisé
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Identifiant / Email
              </Label>
              <Input
                id="email"
                type="text"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-white border-gray-200 rounded-xl text-base"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-11 h-12 bg-white border-gray-200 rounded-xl text-base"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    toast({
                      title: 'Mot de passe oublié ?',
                      description: 'Contactez le secrétariat de votre centre de santé pour réinitialiser votre mot de passe.',
                    });
                  }}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              size="lg" 
              className="w-full h-14 rounded-2xl text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-wide" 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              Se connecter
            </Button>
          </form>
        </div>

        {/* Voice Help Section */}
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="uppercase text-xs font-semibold tracking-wide">Besoin d'aide ?</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3 relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Mic className="w-8 h-8 text-primary" />
              </div>
            </div>
            <p className="text-primary font-semibold text-sm mb-1">
              Aide vocale pour l'inscription
            </p>
            <p className="text-muted-foreground text-xs uppercase tracking-wide text-center">
              Dites "Aidez-moi à créer un compte"
            </p>
          </div>
        </div>

        {/* Create Account Link */}
        <div className="text-center mt-auto pt-4">
          <p className="text-sm text-muted-foreground">
            Pas encore de compte ?
          </p>
          <Link to="/register" className="text-primary hover:underline font-bold text-base uppercase tracking-wide">
            Créer un compte
          </Link>
        </div>
      </main>
    </div>
  );
}
