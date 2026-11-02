-- Un solo plan con todo: las suscripciones del plan Simple pasan al plan único.
UPDATE "Business" SET "plan" = 'COMPLETE' WHERE "plan" = 'SIMPLE';
