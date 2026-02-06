
-- 1. Rattacher les médecins non-rattachés aux cliniques
-- Clinique Sainte Rita de Cascia: Rihanatou Savadogo (Cardio) + Romaric Romaric (Med Gen)
INSERT INTO clinic_doctors (clinic_id, doctor_id, is_active) VALUES
('e1b02b60-6860-4a2a-b561-7ef6ac7ec8c9', '5771d08e-adba-4290-91d8-70849099750e', true),
('e1b02b60-6860-4a2a-b561-7ef6ac7ec8c9', 'ab720ce9-493b-41bd-8e5e-2f6224cc7c45', true),

-- Grande Clinique du Dokui: julien herve (Cardio) + Olivier Ehoussou (Med Gen)
('2765d5eb-bf42-464a-b0c2-cadecc37c4d3', '858ecf30-662f-4448-ad14-174259a50881', true),
('2765d5eb-bf42-464a-b0c2-cadecc37c4d3', '7b2a9303-905a-4167-b723-e0212f0154f7', true),

-- Centre Médical Sainte Famille: Cedric Jesus (Dermato) + Felix Azoah (Gyneco)
('2b34d468-d154-4d69-a2ca-446ccea8093c', '73bd83e7-b070-408d-95da-8a2efc0a69bc', true),
('2b34d468-d154-4d69-a2ca-446ccea8093c', '36d81dba-ee78-491d-9898-a5fb3f441358', true),

-- Clinique Médicale La Chrysalide: george bruno (Cardio) + Laurent Kouassi (Med Gen)
('78feaab9-16bc-44eb-b960-4da690bd8a00', 'b82f1c83-398b-46be-8358-6608351f45a7', true),
('78feaab9-16bc-44eb-b960-4da690bd8a00', 'f7a4133c-fd6b-45d9-a2a6-a36b1b85e0c3', true),

-- Hôpital Général de Grand-Bassam: Richmond KOUASSI (Ophtalmo) + Cedric Jesus (Psychiatrie)
('e78e7c3b-18ac-42eb-b49d-662432e1f2eb', 'e1813c05-5d3f-4f07-8c17-88b31b0a6ec2', true),
('e78e7c3b-18ac-42eb-b49d-662432e1f2eb', 'e2c77ab3-364e-42a3-bba1-ac393ec37e16', true),

-- Polyclinique Centrale Abobo: romaric koffi (Med Gen) + ff250914
('eb7cce80-0b63-4c59-b293-ccdd51631b8a', 'ff250914-e554-413a-9130-0c73a7e79457', true)
ON CONFLICT DO NOTHING;

-- 2. Ajouter disponibilité lundi-vendredi 08h-17h pour les médecins sans disponibilité
-- julien herve
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_active, max_appointments) VALUES
('858ecf30-662f-4448-ad14-174259a50881', 1, '08:00', '17:00', true, 20),
('858ecf30-662f-4448-ad14-174259a50881', 2, '08:00', '17:00', true, 20),
('858ecf30-662f-4448-ad14-174259a50881', 3, '08:00', '17:00', true, 20),
('858ecf30-662f-4448-ad14-174259a50881', 4, '08:00', '17:00', true, 20),
('858ecf30-662f-4448-ad14-174259a50881', 5, '08:00', '17:00', true, 20),

-- george bruno
('b82f1c83-398b-46be-8358-6608351f45a7', 1, '08:00', '17:00', true, 20),
('b82f1c83-398b-46be-8358-6608351f45a7', 2, '08:00', '17:00', true, 20),
('b82f1c83-398b-46be-8358-6608351f45a7', 3, '08:00', '17:00', true, 20),
('b82f1c83-398b-46be-8358-6608351f45a7', 4, '08:00', '17:00', true, 20),
('b82f1c83-398b-46be-8358-6608351f45a7', 5, '08:00', '17:00', true, 20),

-- Richmond pierre
('b2ef3e3b-a42e-46d6-b574-c4a683c63c19', 1, '08:00', '17:00', true, 20),
('b2ef3e3b-a42e-46d6-b574-c4a683c63c19', 2, '08:00', '17:00', true, 20),
('b2ef3e3b-a42e-46d6-b574-c4a683c63c19', 3, '08:00', '17:00', true, 20),
('b2ef3e3b-a42e-46d6-b574-c4a683c63c19', 4, '08:00', '17:00', true, 20),
('b2ef3e3b-a42e-46d6-b574-c4a683c63c19', 5, '08:00', '17:00', true, 20),

-- junior aboudi
('7cdd6bbe-b9a4-48fd-b1a7-21ab361ee6f8', 1, '08:00', '17:00', true, 20),
('7cdd6bbe-b9a4-48fd-b1a7-21ab361ee6f8', 2, '08:00', '17:00', true, 20),
('7cdd6bbe-b9a4-48fd-b1a7-21ab361ee6f8', 3, '08:00', '17:00', true, 20),
('7cdd6bbe-b9a4-48fd-b1a7-21ab361ee6f8', 4, '08:00', '17:00', true, 20),
('7cdd6bbe-b9a4-48fd-b1a7-21ab361ee6f8', 5, '08:00', '17:00', true, 20),

-- saint cedric jesus N'dri
('6c3c3686-a6f7-4f32-960a-c6afc387b094', 1, '08:00', '17:00', true, 20),
('6c3c3686-a6f7-4f32-960a-c6afc387b094', 2, '08:00', '17:00', true, 20),
('6c3c3686-a6f7-4f32-960a-c6afc387b094', 3, '08:00', '17:00', true, 20),
('6c3c3686-a6f7-4f32-960a-c6afc387b094', 4, '08:00', '17:00', true, 20),
('6c3c3686-a6f7-4f32-960a-c6afc387b094', 5, '08:00', '17:00', true, 20),

-- Romaric Romaric
('ab720ce9-493b-41bd-8e5e-2f6224cc7c45', 1, '08:00', '17:00', true, 20),
('ab720ce9-493b-41bd-8e5e-2f6224cc7c45', 2, '08:00', '17:00', true, 20),
('ab720ce9-493b-41bd-8e5e-2f6224cc7c45', 3, '08:00', '17:00', true, 20),
('ab720ce9-493b-41bd-8e5e-2f6224cc7c45', 4, '08:00', '17:00', true, 20),
('ab720ce9-493b-41bd-8e5e-2f6224cc7c45', 5, '08:00', '17:00', true, 20),

-- Laurent Kouassi
('f7a4133c-fd6b-45d9-a2a6-a36b1b85e0c3', 1, '08:00', '17:00', true, 20),
('f7a4133c-fd6b-45d9-a2a6-a36b1b85e0c3', 2, '08:00', '17:00', true, 20),
('f7a4133c-fd6b-45d9-a2a6-a36b1b85e0c3', 3, '08:00', '17:00', true, 20),
('f7a4133c-fd6b-45d9-a2a6-a36b1b85e0c3', 4, '08:00', '17:00', true, 20),
('f7a4133c-fd6b-45d9-a2a6-a36b1b85e0c3', 5, '08:00', '17:00', true, 20)
ON CONFLICT DO NOTHING;
