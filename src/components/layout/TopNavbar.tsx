import { Bell, Search, MessageCircle, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/components/ui/sidebar";

export function TopNavbar() {
    const { profile, signOut } = useAuth();
    const { toggleSidebar } = useSidebar();

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm h-16 flex items-center px-4 gap-4">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            <div className="flex items-center gap-2 mr-auto">
                <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl">
                    K
                </div>
                <span className="hidden md:block font-bold text-xl text-primary">KôKô Santé</span>
            </div>

            {/* Center Search - Facebook style */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="w-full pl-10 bg-secondary/50 border-none rounded-full h-10 focus-visible:ring-1 focus-visible:bg-background transition-all"
                        placeholder="Rechercher sur KôKô Santé..."
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50 hover:bg-secondary text-foreground">
                    <MessageCircle className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50 hover:bg-secondary text-foreground">
                    <Bell className="h-5 w-5" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={profile?.avatar_url} alt={profile?.first_name} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    {profile?.first_name?.[0] || "U"}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{profile?.first_name} {profile?.last_name}</p>
                                <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut()}>
                            Se déconnecter
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
