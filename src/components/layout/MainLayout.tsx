import { SidebarProvider } from "@/components/ui/sidebar";
import { TopNavbar } from "./TopNavbar";
import { Sidebar } from "./Sidebar";
import { Outlet } from "react-router-dom";

export function MainLayout() {
    return (
        <SidebarProvider defaultOpen={false}>
            <div className="min-h-screen w-full bg-background flex flex-col">
                <TopNavbar />
                <div className="flex flex-1 relative">
                    <Sidebar />
                    <main className="flex-1 w-full pt-4 px-4 pb-8 overflow-x-hidden">
                        <div className="mx-auto max-w-6xl animate-fade-in">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
