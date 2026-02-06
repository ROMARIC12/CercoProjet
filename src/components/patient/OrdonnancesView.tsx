import { FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export function OrdonnancesView() {
  return (
    <div className="flex flex-col h-full bg-secondary">
      {/* Header */}
      <div className="bg-card px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-lg font-semibold flex-1 text-center text-foreground">Mes Ordonnances</h1>
        </div>

        {/* KÔKÔ SANTE Badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <span className="text-primary font-semibold text-sm">KÔKÔ SANTÉ</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une ordonnance"
            className="pl-10 bg-secondary border-0 rounded-full h-10"
            disabled
          />
        </div>
      </div>

      {/* Empty State */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center justify-center p-8 pt-16 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2 max-w-sm">
            <h2 className="text-xl font-bold text-foreground">Aucune ordonnance</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Vos ordonnances médicales apparaîtront ici après vos consultations avec vos médecins.
            </p>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 max-w-sm">
            <p className="text-xs text-muted-foreground">
              Après chaque consultation, votre médecin pourra vous envoyer vos ordonnances directement sur la plateforme.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
