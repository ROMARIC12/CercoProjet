-- Étape 1 : Ajouter la politique RLS pour permettre aux médecins d'insérer leur propre rattachement
CREATE POLICY "Doctors can insert their own clinic association"
ON clinic_doctors
FOR INSERT
TO authenticated
WITH CHECK (
  doctor_id IN (
    SELECT id FROM doctors WHERE profile_id = auth.uid()
  )
);

-- Étape 2 : Rattacher le médecin Richmond Pierre à la Polyclinique Centrale Abobo
INSERT INTO clinic_doctors (clinic_id, doctor_id, is_active, role)
VALUES (
  'eb7cce80-0b63-4c59-b293-ccdd51631b8a',
  'b2ef3e3b-a42e-46d6-b574-c4a683c63c19',
  true,
  'titulaire'
);