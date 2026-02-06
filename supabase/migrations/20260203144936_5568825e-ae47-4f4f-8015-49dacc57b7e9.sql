-- Mettre à jour tous les médecins existants pour activer la téléconsultation et la vérification
UPDATE doctors 
SET 
  teleconsultation_enabled = true, 
  is_verified = true 
WHERE teleconsultation_enabled = false OR is_verified = false;