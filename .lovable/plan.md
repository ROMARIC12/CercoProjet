

# Plan complet : Rendre l'application fonctionnelle pour la presentation

## Contexte

L'audit revele plusieurs problemes critiques a corriger avant le test de demain :
- 11 medecins sur 16 ne sont rattaches a aucun centre de sante
- 7 medecins n'ont aucune disponibilite configuree (donc pas de creneaux possibles)
- Des boutons non-fonctionnels ("Mot de passe oublie", "Voir details", "Reprogrammer")
- Des donnees fictives affichees meme quand il n'y a pas de vraies donnees
- La section Ordonnances utilise uniquement des donnees mock
- Les sections Messages et Aide & Support sont vides

## Etapes du plan

### 1. Corriger les donnees en base : Rattacher tous les medecins aux centres

Distribuer les 11 medecins non-rattaches equitablement dans les 6 cliniques, en s'assurant que chaque clinique a au moins un generaliste et une autre specialite :

| Clinique | Medecins a ajouter |
|---|---|
| Clinique Sainte Rita de Cascia | Rihanatou Savadogo (Cardio), Romaric Romaric (Med Gen) |
| Grande Clinique du Dokui | julien herve (Cardio), Olivier Ehoussou (Med Gen) |
| Centre Medical Sainte Famille | Cedric Jesus (Dermato), Felix Azoah (Gyneco) |
| Clinique Medicale La Chrysalide | george bruno (Cardio), Laurent Kouassi (Med Gen) |
| Hopital General de Grand-Bassam | Richmond KOUASSI (Ophtalmo), Cedric Jesus (Psychiatrie) |
| Polyclinique Centrale Abobo | romaric koffi (Med Gen), ff250914 |

Insertion via migration SQL dans `clinic_doctors`.

### 2. Configurer la disponibilite des medecins manquants

Ajouter la disponibilite lundi-vendredi 08h-17h pour les 7 medecins qui n'en ont pas :
- julien herve, george bruno, Richmond pierre, junior aboudi, saint cedric jesus N'dri, Romaric Romaric, Laurent Kouassi

Insertion via migration SQL dans `doctor_availability`.

### 3. Corriger le bouton "Mot de passe oublie"

Dans `Login.tsx` : ajouter un dialog toast qui informe l'utilisateur de contacter le support ou implementer un flux `resetPasswordForEmail` via Supabase Auth. Pour la demo, afficher un toast "Contactez le secretariat de votre centre de sante".

### 4. Corriger les boutons "Voir details" et "Reprogrammer" (RDV patient)

- **PatientDashboard.tsx** : remplacer `console.log` par des handlers fonctionnels
- **"Voir details"** : ouvrir un dialog/sheet avec les informations completes du RDV (medecin, date, heure, centre, statut)
- **"Reprogrammer"** : ouvrir le flux de reservation pre-rempli ou un dialog de reprogrammation simple

### 5. Corriger le bouton "Voir details" de la file d'attente

Dans `WaitingQueueSection` : ne plus afficher la section si le patient n'a pas de RDV a venir. Si un RDV existe, le bouton "Voir details" bascule sur l'onglet "Mes Rendez-vous".

### 6. Supprimer les donnees fictives du carousel

Dans `PatientDashboard.tsx` : supprimer les consultations mock "Dr. Sophie Lefebvre" et "Dr. Martin". Si aucun RDV n'existe, masquer le carousel ou afficher un etat vide propre.

### 7. Connecter les Ordonnances aux vraies donnees

Modifier `OrdonnancesView.tsx` pour :
- Recuperer les prescriptions depuis la table `prescriptions` (si elle existe) ou `consultation_notes`
- Si aucune table d'ordonnances n'existe, afficher un etat vide elegant au lieu de donnees mock

### 8. Rendre les sections Messages et Aide fonctionnelles

- **Messages** : afficher un message clair "Fonctionnalite bientot disponible" avec un design soigne
- **Aide & Support** : ajouter une FAQ basique avec les questions courantes (Comment prendre RDV ? Comment annuler ? Comment fonctionne la teleconsultation ?)

### 9. Remplacer les couleurs hardcodees

Dans `Login.tsx`, `Register.tsx`, `RoleSelect.tsx`, `MyAppointmentsView.tsx`, `OrdonnancesView.tsx` : remplacer les `#1a5fb4` et `#f5f7fa` par les tokens Tailwind du design system (`bg-primary`, `text-primary`, `bg-secondary`).

### 10. Verifier la teleconsultation de bout en bout

Le flux est structurellement en place :
- Les medecins en ligne (`is_online = true`) apparaissent bien dans `TeleconsultationView`
- Les edge functions `agora-token` et la logique video sont connectees
- S'assurer que le composant `TeleconsultationDoctorCard` appelle correctement `handleStartFreeSession` pour les consultations gratuites

### 11. Verifier le systeme vocal

Le flux vocal est complet (`useVoiceBookingFlow.ts`) :
- TTS/STT via ElevenLabs (edge functions deployees, API key configuree)
- Fallback sur browser SpeechSynthesis si ElevenLabs echoue
- Le secret `ELEVENLABS_API_KEY` est present
- Aucune modification necessaire, mais tester pendant la demo pour s'assurer que le Free Tier ElevenLabs fonctionne

## Details techniques

### Migration SQL (etapes 1 et 2)

Fichier de migration a creer pour :
1. INSERT INTO `clinic_doctors` pour les 11 medecins non-rattaches
2. INSERT INTO `doctor_availability` (jours 1-5, 08:00-17:00) pour les 7 medecins sans disponibilite

### Fichiers a modifier

| Fichier | Modification |
|---|---|
| `src/pages/Login.tsx` | Bouton "Mot de passe oublie" + couleurs |
| `src/pages/Register.tsx` | Couleurs hardcodees |
| `src/pages/dashboard/PatientDashboard.tsx` | Handlers "Voir details"/"Reprogrammer", supprimer mock data, masquer queue vide |
| `src/components/patient/MyAppointmentsView.tsx` | Dialog details RDV, couleurs |
| `src/components/patient/WaitingQueueSection.tsx` | Conditionner l'affichage |
| `src/components/patient/OrdonnancesView.tsx` | Vraies donnees ou etat vide, couleurs |
| `src/components/patient/ConsultationsCarousel.tsx` | Gerer etat vide |
| Migration SQL | Rattachement medecins + disponibilites |

### Risques identifies

- **ElevenLabs Free Tier** : peut retourner 401 si le quota est depasse. Le fallback browser est deja en place.
- **MoneyFusion** : necessite que l'API soit active et accessible. Le secret `MONEYFUSION_API_URL` est configure.
- **Agora** : les secrets `AGORA_APP_ID` et `AGORA_APP_CERTIFICATE` sont presents.

