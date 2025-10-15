-- Les deux colonnes sont soit NULL ensemble, soit NON NULL ensemble
ALTER TABLE "public"."User" ADD CONSTRAINT "chk_titulaire_both_or_none"
CHECK (
  ("titulaire_niveau_id" IS NULL AND "titulaire_section_id" IS NULL) OR
  ("titulaire_niveau_id" IS NOT NULL AND "titulaire_section_id" IS NOT NULL)
);

-- Si titularisé, le rôle doit être PROFESSEUR
ALTER TABLE "public"."User" ADD CONSTRAINT "chk_titulaire_only_prof"
CHECK (
  ("titulaire_niveau_id" IS NULL AND "titulaire_section_id" IS NULL) OR
  role = 'PROFESSEUR'
);
