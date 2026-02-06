import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ClinicSelector } from '@/components/clinic/ClinicSelector';
import { Loader2, Mail, Lock, User, Phone, Building2, Stethoscope, Calendar, ChevronLeft, BriefcaseMedical, Eye, EyeOff, MapPin, LocateFixed } from 'lucide-react';

type SelectedRole = 'patient' | 'doctor' | 'secretary' | 'admin';

const SPECIALTIES = [
  'Médecine générale',
  'Cardiologie',
  'Dermatologie',
  'Gynécologie',
  'Pédiatrie',
  'Ophtalmologie',
  'ORL',
  'Neurologie',
  'Psychiatrie',
  'Rhumatologie',
  'Gastro-entérologie',
];

export default function Register() {
  const [selectedRole, setSelectedRole] = useState<SelectedRole>('patient');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Role-specific fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  
  // Clinic selection
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  
  // Consents
  const [acceptCGU, setAcceptCGU] = useState(false);
  const [acceptMedicalDisclaimer, setAcceptMedicalDisclaimer] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Geolocation function
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'La géolocalisation n\'est pas supportée par votre navigateur',
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Use reverse geocoding to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();
          if (data.display_name) {
            setAddress(data.display_name);
          } else {
            setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          toast({
            variant: 'destructive',
            title: 'Erreur',
            description: 'Impossible de récupérer l\'adresse',
          });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        let message = 'Impossible d\'obtenir votre position';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Accès à la localisation refusé. Veuillez autoriser l\'accès dans les paramètres.';
        }
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: message,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Check for pre-selected role from RoleSelect page
  useEffect(() => {
    const storedRole = sessionStorage.getItem('selectedRole') as SelectedRole | null;
    if (storedRole && ['patient', 'doctor', 'secretary'].includes(storedRole)) {
      setSelectedRole(storedRole);
    }
  }, []);

  // Reset clinic selection when role changes
  useEffect(() => {
    setSelectedClinicId('');
    setSelectedClinicIds([]);
  }, [selectedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 6 caractères',
      });
      return;
    }

    if (!acceptCGU || !acceptMedicalDisclaimer) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Vous devez accepter les CGU et le disclaimer médical',
      });
      return;
    }

    // Validate clinic selection for secretary
    if (selectedRole === 'secretary' && !selectedClinicId) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner un centre de santé',
      });
      return;
    }

    // Validate clinic selection for doctor
    if (selectedRole === 'doctor' && selectedClinicIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un centre de santé',
      });
      return;
    }

    setIsLoading(true);

    const redirectUrl = `${window.location.origin}/dashboard`;
    
    // For patients, create a fake email from phone number
    const authEmail = selectedRole === 'patient' ? `${phone.replace(/\s+/g, '')}@kokosante.app` : email;

    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
        },
      },
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur d\'inscription',
        description: error.message === 'User already registered'
          ? 'Un compte existe déjà avec ce numéro de téléphone'
          : error.message,
      });
      setIsLoading(false);
      return;
    }

    if (data.user) {
      try {
        // Insert role
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: selectedRole,
        });

        // Update profile with phone
        await supabase.from('profiles').update({ phone }).eq('id', data.user.id);

        // Insert consents
        await supabase.from('user_consents').insert([
          { user_id: data.user.id, consent_type: 'cgu' },
          { user_id: data.user.id, consent_type: 'medical_disclaimer' },
        ]);

        // Role-specific data
        if (selectedRole === 'patient') {
          await supabase.from('patients').insert({
            profile_id: data.user.id,
            date_of_birth: dateOfBirth || null,
            gender: gender || null,
            emergency_contact: emergencyContact || null,
            address: address || null,
          });
        } else if (selectedRole === 'doctor') {
          // Insert doctor data with teleconsultation enabled by default
          const { data: doctorData } = await supabase.from('doctors').insert({
            profile_id: data.user.id,
            specialty: specialty,
            license_number: licenseNumber || null,
            is_verified: true, // Verified by default for immediate functionality
            teleconsultation_enabled: true, // Enable teleconsultation by default
          }).select('id').single();

          // Associate doctor with selected clinics
          if (doctorData && selectedClinicIds.length > 0) {
            const clinicDoctorEntries = selectedClinicIds.map(clinicId => ({
              clinic_id: clinicId,
              doctor_id: doctorData.id,
              is_active: true,
            }));
            const { error: clinicError } = await supabase.from('clinic_doctors').insert(clinicDoctorEntries);
            
            if (clinicError) {
              console.error('Erreur rattachement clinique:', clinicError);
              toast({
                variant: 'destructive',
                title: 'Avertissement',
                description: 'Compte créé mais le rattachement à la clinique a échoué. Contactez l\'administrateur.',
              });
            }
          }
        } else if (selectedRole === 'secretary') {
          // Associate secretary with selected clinic
          if (selectedClinicId) {
            await supabase.from('clinic_secretaries').insert({
              clinic_id: selectedClinicId,
              secretary_id: data.user.id,
              is_active: true,
            });
          }
        }

      } catch (roleError) {
        console.error('Error setting up user:', roleError);
      }
    }

    toast({
      title: 'Compte créé avec succès',
      description: 'Vous pouvez maintenant vous connecter',
    });
    sessionStorage.removeItem('selectedRole');
    navigate('/login');
    setIsLoading(false);
  };

  const getRoleTitle = () => {
    switch (selectedRole) {
      case 'patient': return 'Compte Patient';
      case 'doctor': return 'Compte Médecin';
      case 'secretary': return 'Compte Secrétariat';
      default: return 'Créer un compte';
    }
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
          className="absolute left-4 w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center text-primary hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Inscription</h1>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-auto px-6 pt-6 pb-6">
        {/* Logo section */}
        <div className="flex flex-col items-center mb-6 animate-fade-in">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-elevated flex items-center justify-center mb-4">
            <BriefcaseMedical className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            {getRoleTitle()}
          </h2>
          <p className="text-muted-foreground text-sm">
            Créez votre espace KôKô Santé
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
          {/* Role Selector */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Type de compte</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as SelectedRole)}>
              <SelectTrigger className="h-12 bg-white rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patient">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Patient
                  </div>
                </SelectItem>
                <SelectItem value="doctor">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Médecin
                  </div>
                </SelectItem>
                <SelectItem value="secretary">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Secrétariat
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-foreground font-medium">Prénom</Label>
              <Input
                id="firstName"
                placeholder="Jean"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-12 bg-white rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-foreground font-medium">Nom</Label>
              <Input
                id="lastName"
                placeholder="Dupont"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-12 bg-white rounded-xl"
                required
              />
          </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground font-medium">Téléphone</Label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="07 00 00 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-11 h-12 bg-white rounded-xl"
                required
              />
            </div>
          </div>

          {/* Email field only for non-patients */}
          {selectedRole !== 'patient' && (
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 bg-white rounded-xl"
                  required
                />
              </div>
            </div>
          )}

          {/* Patient-specific fields */}
          {selectedRole === 'patient' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="dob" className="text-foreground font-medium">Date de naissance</Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="pl-11 h-12 bg-white rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-foreground font-medium">Genre</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="h-12 bg-white rounded-xl">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Homme</SelectItem>
                      <SelectItem value="F">Femme</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency" className="text-foreground font-medium">Contact d'urgence</Label>
                <Input
                  id="emergency"
                  placeholder="Numéro d'un proche"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="h-12 bg-white rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-foreground font-medium">Adresse de domicile</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    placeholder="Votre adresse"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-11 pr-12 h-12 bg-white rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors disabled:opacity-50"
                    title="Utiliser ma position actuelle"
                  >
                    {isLocating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LocateFixed className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cliquez sur l'icône pour activer la localisation en temps réel
                </p>
              </div>
            </>
          )}

          {/* Doctor-specific fields */}
          {selectedRole === 'doctor' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="specialty" className="text-foreground font-medium">Spécialité</Label>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger className="h-12 bg-white rounded-xl">
                    <SelectValue placeholder="Sélectionner une spécialité" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((spec) => (
                      <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="license" className="text-foreground font-medium">Numéro de licence</Label>
                <Input
                  id="license"
                  placeholder="Numéro d'ordre"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="h-12 bg-white rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctorAddress" className="text-foreground font-medium">Adresse de domicile</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="doctorAddress"
                    placeholder="Votre adresse"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-11 pr-12 h-12 bg-white rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors disabled:opacity-50"
                    title="Utiliser ma position actuelle"
                  >
                    {isLocating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LocateFixed className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cliquez sur l'icône pour activer la localisation en temps réel
                </p>
              </div>
              
              {/* Clinic selection for doctors (multiple) */}
              <ClinicSelector
                mode="multiple"
                value={selectedClinicIds}
                onChange={(v) => setSelectedClinicIds(v as string[])}
                label="Centres de santé"
                required
              />
            </>
          )}

          {/* Secretary-specific fields */}
          {selectedRole === 'secretary' && (
            <ClinicSelector
              mode="single"
              value={selectedClinicId}
              onChange={(v) => setSelectedClinicId(v as string)}
              label="Centre de santé"
              required
              placeholder="Sélectionner votre centre"
            />
          )}

          {/* Password Fields */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground font-medium">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 pr-11 h-12 bg-white rounded-xl"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirmer</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-11 pr-11 h-12 bg-white rounded-xl"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Consents */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="cgu"
                checked={acceptCGU}
                onCheckedChange={(checked) => setAcceptCGU(checked as boolean)}
                className="mt-0.5"
              />
              <Label htmlFor="cgu" className="text-sm leading-relaxed font-normal text-muted-foreground">
                J'accepte les <a href="#" className="text-primary hover:underline">CGU</a>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="medical"
                checked={acceptMedicalDisclaimer}
                onCheckedChange={(checked) => setAcceptMedicalDisclaimer(checked as boolean)}
                className="mt-0.5"
              />
              <Label htmlFor="medical" className="text-sm leading-relaxed font-normal text-muted-foreground">
                Je comprends que cette plateforme ne fournit pas de diagnostic médical
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 space-y-3">
            <Button 
              type="submit" 
              size="lg" 
              className="w-full h-14 rounded-2xl text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground" 
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer mon compte
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Déjà inscrit ?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
