"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ActionResult } from "@/lib/action-result";

/**
 * Ejecuta una Server Action con toast de éxito/error y, si se pasa `setError`,
 * vuelca los errores por campo que devolvió Zod en el servidor al formulario.
 */
export function useAction<TForm extends FieldValues = FieldValues>(setError?: UseFormSetError<TForm>) {
  const [pending, startTransition] = useTransition();

  function run<T>(action: () => Promise<ActionResult<T>>, onSuccess?: (data: T) => void) {
    startTransition(async () => {
      try {
        const res = await action();
        if (res.ok) {
          if (res.message) toast.success(res.message);
          onSuccess?.(res.data);
        } else {
          toast.error(res.error);
          if (setError && res.fieldErrors) {
            for (const [field, message] of Object.entries(res.fieldErrors)) {
              setError(field as Path<TForm>, { message });
            }
          }
        }
      } catch {
        toast.error("No pudimos guardar. Probá de nuevo.");
      }
    });
  }

  return { pending, run };
}
