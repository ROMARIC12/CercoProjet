import { MessageCircle, Bell } from 'lucide-react';

export function MessagesView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <MessageCircle className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-bold text-foreground">Messagerie</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          La messagerie avec vos professionnels de santé sera bientôt disponible.
        </p>
      </div>
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Bientôt disponible</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Vous recevrez une notification dès que cette fonctionnalité sera activée.
        </p>
      </div>
    </div>
  );
}
