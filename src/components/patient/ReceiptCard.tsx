import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Eye, CheckCircle, Printer } from 'lucide-react';

interface ReceiptData {
  id: string;
  amount: number;
  transaction_ref: string | null;
  paid_at: string | null;
  created_at: string;
  payment_type: 'deposit' | 'balance';
  doctor_name: string;
  specialty: string;
  appointment_date: string;
  clinic_name?: string;
}

interface ReceiptCardProps {
  receipt: ReceiptData;
  patientName: string;
  patientEmail?: string;
}

export function ReceiptCard({ receipt, patientName, patientEmail }: ReceiptCardProps) {
  const [showReceipt, setShowReceipt] = useState(false);

  const generateReceiptNumber = () => {
    const date = format(new Date(receipt.created_at), 'yyyyMMdd');
    const ref = receipt.transaction_ref?.slice(-6) || receipt.id.slice(0, 6);
    return `KS-${date}-${ref.toUpperCase()}`;
  };

  const receiptNumber = generateReceiptNumber();

  const downloadReceipt = () => {
    const receiptContent = `
╔══════════════════════════════════════════════════════════════════╗
║                         REÇU DE PAIEMENT                         ║
║                           KôKô Santé                              ║
╚══════════════════════════════════════════════════════════════════╝

N° Reçu: ${receiptNumber}
Date: ${format(new Date(receipt.paid_at || receipt.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}

──────────────────────────────────────────────────────────────────
INFORMATIONS PATIENT
──────────────────────────────────────────────────────────────────
Nom: ${patientName}
${patientEmail ? `Email: ${patientEmail}` : ''}

──────────────────────────────────────────────────────────────────
DÉTAILS DE LA CONSULTATION
──────────────────────────────────────────────────────────────────
Médecin: ${receipt.doctor_name}
Spécialité: ${receipt.specialty}
${receipt.clinic_name ? `Centre: ${receipt.clinic_name}` : ''}
Date RDV: ${format(new Date(receipt.appointment_date), 'dd/MM/yyyy', { locale: fr })}

──────────────────────────────────────────────────────────────────
PAIEMENT
──────────────────────────────────────────────────────────────────
Type: ${receipt.payment_type === 'deposit' ? 'Arrhes (Acompte)' : 'Solde'}
Référence Transaction: ${receipt.transaction_ref || 'N/A'}

╔══════════════════════════════════════════════════════════════════╗
║   MONTANT PAYÉ:                     ${receipt.amount.toLocaleString().padStart(15)} FCFA   ║
╚══════════════════════════════════════════════════════════════════╝

Statut: ✓ PAYÉ

──────────────────────────────────────────────────────────────────
Ce reçu atteste du paiement effectué via la plateforme KôKô Santé.
Conservez ce document pour vos records.

Merci de votre confiance !
www.koko-sante.com
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recu-${receiptNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Reçu ${receiptNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .section { margin: 20px 0; }
            .section h3 { border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .row { display: flex; justify-content: space-between; padding: 5px 0; }
            .amount-box { background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .amount { font-size: 28px; font-weight: bold; color: #2563eb; }
            .status { color: #22c55e; font-weight: bold; }
            .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>KôKô Santé</h1>
            <p>Reçu de Paiement</p>
            <p><strong>N° ${receiptNumber}</strong></p>
          </div>
          
          <div class="section">
            <div class="row">
              <span>Date:</span>
              <span>${format(new Date(receipt.paid_at || receipt.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}</span>
            </div>
          </div>
          
          <div class="section">
            <h3>Patient</h3>
            <div class="row"><span>Nom:</span><span>${patientName}</span></div>
            ${patientEmail ? `<div class="row"><span>Email:</span><span>${patientEmail}</span></div>` : ''}
          </div>
          
          <div class="section">
            <h3>Consultation</h3>
            <div class="row"><span>Médecin:</span><span>${receipt.doctor_name}</span></div>
            <div class="row"><span>Spécialité:</span><span>${receipt.specialty}</span></div>
            ${receipt.clinic_name ? `<div class="row"><span>Centre:</span><span>${receipt.clinic_name}</span></div>` : ''}
            <div class="row"><span>Date RDV:</span><span>${format(new Date(receipt.appointment_date), 'dd/MM/yyyy', { locale: fr })}</span></div>
          </div>
          
          <div class="section">
            <h3>Paiement</h3>
            <div class="row"><span>Type:</span><span>${receipt.payment_type === 'deposit' ? 'Arrhes' : 'Solde'}</span></div>
            <div class="row"><span>Référence:</span><span>${receipt.transaction_ref || 'N/A'}</span></div>
          </div>
          
          <div class="amount-box">
            <p style="margin:0;color:#666;">Montant payé</p>
            <p class="amount">${receipt.amount.toLocaleString()} FCFA</p>
            <p class="status">✓ PAYÉ</p>
          </div>
          
          <div class="footer">
            <p>Ce reçu atteste du paiement effectué via la plateforme KôKô Santé.</p>
            <p>Merci de votre confiance !</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg text-primary">
                  {receipt.amount.toLocaleString()} FCFA
                </span>
                <Badge className="bg-green-500 gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Payé
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {receipt.doctor_name} - {receipt.specialty}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(receipt.paid_at || receipt.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </p>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Réf: {receiptNumber}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowReceipt(true)}
                title="Voir le reçu"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={downloadReceipt}
                title="Télécharger"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Reçu de Paiement</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold text-primary">KôKô Santé</h2>
              <p className="text-sm text-muted-foreground">N° {receiptNumber}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(receipt.paid_at || receipt.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>

            {/* Patient Info */}
            <div className="space-y-1">
              <p className="text-sm font-medium">Patient</p>
              <p className="text-sm text-muted-foreground">{patientName}</p>
              {patientEmail && <p className="text-xs text-muted-foreground">{patientEmail}</p>}
            </div>

            {/* Consultation Info */}
            <div className="space-y-1">
              <p className="text-sm font-medium">Consultation</p>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p>{receipt.doctor_name}</p>
                <p>{receipt.specialty}</p>
                {receipt.clinic_name && <p>{receipt.clinic_name}</p>}
                <p>RDV: {format(new Date(receipt.appointment_date), 'dd/MM/yyyy', { locale: fr })}</p>
              </div>
            </div>

            {/* Amount */}
            <div className="bg-primary/5 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Montant payé</p>
              <p className="text-3xl font-bold text-primary">{receipt.amount.toLocaleString()} FCFA</p>
              <Badge className="bg-green-500 mt-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Paiement confirmé
              </Badge>
            </div>

            {/* Reference */}
            <div className="text-center text-xs text-muted-foreground">
              <p>Référence: {receipt.transaction_ref || 'N/A'}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={downloadReceipt}>
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={printReceipt}>
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
