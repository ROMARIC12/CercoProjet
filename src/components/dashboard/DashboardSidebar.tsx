import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { 
  LayoutDashboard, 
  Users, 
  User, 
  Heart, 
  LogOut, 
  Calendar,
  Stethoscope,
  CreditCard,
  FileText,
  Clock,
  Building2,
  Bell
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

// Menu items by role - comprehensive navigation
const menuItemsByRole = {
  admin: [
    { title: 'Tableau de bord', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Utilisateurs', url: '/dashboard/users', icon: Users },
    { title: 'Mon Profil', url: '/dashboard/profile', icon: User },
  ],
  doctor: [
    { title: 'Mon agenda', url: '/dashboard', icon: Calendar },
    { title: 'Mon Profil', url: '/dashboard/profile', icon: User },
  ],
  secretary: [
    { title: 'Accueil', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Mon Profil', url: '/dashboard/profile', icon: User },
  ],
  patient: [
    { title: 'Mon espace', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Mon Profil', url: '/dashboard/profile', icon: User },
  ],
};

export function DashboardSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut, profile, role } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  // Get menu items based on role
  const menuItems = menuItemsByRole[role || 'patient'] || menuItemsByRole.patient;

  // Get role display name
  const getRoleDisplayName = (role: string | null) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrateur';
      case 'admin':
        return 'Administrateur';
      case 'doctor':
        return 'Médecin';
      case 'secretary':
        return 'Secrétaire';
      case 'patient':
        return 'Patient';
      default:
        return 'Utilisateur';
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Heart className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground">KôKô Santé</span>
              <span className="text-xs text-sidebar-foreground/70">{getRoleDisplayName(role)}</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            {!collapsed && 'Navigation'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && profile && (
          <div className="mb-3 p-3 rounded-lg bg-sidebar-accent/50">
            <p className="text-sm font-medium text-sidebar-foreground">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-xs text-sidebar-foreground/70">{profile.phone || 'Pas de téléphone'}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          {!collapsed && 'Déconnexion'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
