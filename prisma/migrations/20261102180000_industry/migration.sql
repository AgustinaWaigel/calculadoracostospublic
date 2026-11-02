-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('PAPELERIA', 'GASTRONOMIA', 'TALLER', 'MANUALIDADES', 'OTRO');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "industry" "Industry" NOT NULL DEFAULT 'OTRO';


-- Las cuentas que ya existen son de papelería (la calculadora nació para eso).
UPDATE "Business" SET "industry" = 'PAPELERIA';
