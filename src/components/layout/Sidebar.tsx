import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import {
    LayoutDashboard,
    Users,
    User,
    Settings,
    Calendar,
    CreditCard,
    FileText,
    Clock,
    Video
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
    Sidebar as ShadcnSidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

// Menu items by role
const menuItemsByRole = {
    admin: [
        { title: 'Tableau de bord', url: '/dashboard', icon: LayoutDashboard },
        { title: 'Utilisateurs', url: '/dashboard/users', icon: Users },
        { title: 'Mon Profil', url: '/dashboard/profile', icon: User },
    ],
    doctor: [
        { title: 'Mon agenda', url: '/dashboard', icon: Calendar },
        { title: 'Patients', url: '/dashboard/patients', icon: Users },
        { title: 'Consultations', url: '/dashboard/consultations', icon: Video },
        { title: 'Mon Profil', url: '/dashboard/profile', icon: User },
    ],
    secretary: [
        { title: 'Accueil', url: '/dashboard', icon: LayoutDashboard },
        { title: 'Rendez-vous', url: '/dashboard/appointments', icon: Calendar },
        { title: 'Mon Profil', url: '/dashboard/profile', icon: User },
    ],
    patient: [
        { title: 'Mon espace', url: '/dashboard', icon: LayoutDashboard },
        { title: 'Mes RDV', url: '/dashboard/appointments', icon: Calendar },
        { title: 'Documents', url: '/dashboard/documents', icon: FileText },
        { title: 'Mon Profil', url: '/dashboard/profile', icon: User },
    ],
};

export function Sidebar() {
    const { state, setOpenMobile, openMobile, isMobile, open, setOpen } = useSidebar();
    const location = useLocation();
    const { role } = useAuth();

    // Determine if sidebar is open based on context
    // For this overlay implementation, we want 'open' to mean visible
    const isOpen = open; // or state === 'expanded'

    const handleClose = () => {
        setOpen(false);
        if (isMobile) setOpenMobile(false);
    };

    const menuItems = menuItemsByRole[role || 'patient'] || menuItemsByRole.patient;

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={handleClose}
                />
            )}

            <aside
                className={cn(
                    "fixed left-0 top-0 h-full w-72 bg-card border-r border-border z-50 flex flex-col transition-transform duration-300 ease-in-out pt-16",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="space-y-1 px-3">
                        {menuItems.map((item) => (
                            <NavLink
                                key={item.title}
                                to={item.url}
                                onClick={handleClose}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
                                    location.pathname === item.url
                                        ? "bg-primary text-primary-foreground shadow-md font-medium"
                                        : "text-muted-foreground hover:bg-secondary hover:text-primary font-medium"
                                )}
                            >
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                <span>{item.title}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </aside>
        </>
    );
}
