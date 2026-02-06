import { HelpCircle, Calendar, XCircle, Video, CreditCard, Phone, ChevronDown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

const faqs = [
  {
    id: 'rdv',
    icon: Calendar,
    question: 'Comment prendre rendez-vous ?',
    answer: 'Depuis votre tableau de bord, appuyez sur "Prendre RDV" pour choisir un centre de santé, une spécialité, un médecin et un créneau disponible. Vous pouvez aussi utiliser la réservation vocale en appuyant sur le bouton microphone.',
  },
  {
    id: 'cancel',
    icon: XCircle,
    question: 'Comment annuler ou reprogrammer un rendez-vous ?',
    answer: 'Rendez-vous dans "Mes Rendez-vous", sélectionnez le rendez-vous concerné puis appuyez sur "Reprogrammer". La demande sera envoyée au secrétariat pour validation.',
  },
  {
    id: 'teleconsult',
    icon: Video,
    question: 'Comment fonctionne la téléconsultation ?',
    answer: 'Allez dans l\'onglet "Téléconsultation" pour voir les médecins disponibles en ligne. Sélectionnez un médecin, effectuez le paiement si nécessaire, puis rejoignez la consultation vidéo avec le code fourni.',
  },
  {
    id: 'payment',
    icon: CreditCard,
    question: 'Quels moyens de paiement sont acceptés ?',
    answer: 'Nous acceptons le paiement mobile (Mobile Money via MoneyFusion), les cartes bancaires, et le paiement sur place au cabinet médical.',
  },
  {
    id: 'contact',
    icon: Phone,
    question: 'Comment contacter le support ?',
    answer: 'Pour toute question urgente, contactez le secrétariat de votre centre de santé directement. Vous pouvez retrouver leurs coordonnées dans les détails de votre rendez-vous.',
  },
];

export function HelpSupportView() {
  return (
    <ScrollArea className="flex-1">
      <div className="p-4 sm:p-6 pb-24 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Aide & Support</h2>
          <p className="text-muted-foreground text-sm">Questions fréquentes sur KÔKÔ SANTÉ</p>
        </div>

        {/* FAQ */}
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq) => {
            const Icon = faq.icon;
            return (
              <AccordionItem key={faq.id} value={faq.id} className="bg-card rounded-xl border-0 shadow-sm px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="font-medium text-sm text-foreground">{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm pb-4 pl-8">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Contact card */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center space-y-2">
          <p className="font-semibold text-foreground">Besoin d'aide supplémentaire ?</p>
          <p className="text-sm text-muted-foreground">
            Contactez le secrétariat de votre centre de santé pour une assistance personnalisée.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
