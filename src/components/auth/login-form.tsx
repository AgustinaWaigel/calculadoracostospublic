"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/ui-bits";
import { Captcha } from "./captcha";
import { INDUSTRIES, industries } from "@/lib/industries";
import { login, requestPasswordReset, signup, updatePassword, type AuthState } from "@/actions/auth";

function Feedback({ state }: { state: AuthState }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state?.notice) {
    return (
      <p role="status" className="rounded-md bg-menta/25 px-3 py-2 text-sm text-foreground">
        {state.notice}
      </p>
    );
  }
  return null;
}

function Submit({ pending, idle, busy }: { pending: boolean; idle: string; busy: string }) {
  return (
    <Button type="submit" size="lg" disabled={pending} className="mt-1">
      {pending && <Loader2Icon className="animate-spin" />}
      {pending ? busy : idle}
    </Button>
  );
}

function EmailField({ id, defaultValue }: { id: string; defaultValue?: string }) {
  return (
    <Field label="Mail" htmlFor={id}>
      <Input id={id} name="email" type="email" autoComplete="email" required defaultValue={defaultValue} autoFocus />
    </Field>
  );
}

function NewPasswordFields({ prefix }: { prefix: string }) {
  return (
    <>
      <Field label="Contraseña" htmlFor={`${prefix}-clave`} hint="Al menos 8 caracteres">
        <Input id={`${prefix}-clave`} name="clave" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Repetí la contraseña" htmlFor={`${prefix}-clave2`}>
        <Input id={`${prefix}-clave2`} name="clave2" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
    </>
  );
}

export function LoginForm({ back }: { back?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="volver" value={back ?? "/"} />
      <EmailField id="login-email" defaultValue={state?.email} />
      <Field label="Contraseña" htmlFor="login-clave">
        <Input id="login-clave" name="clave" type="password" autoComplete="current-password" required />
      </Field>
      <Link href="/recuperar" className="-mt-2 justify-self-end text-xs text-muted-foreground underline-offset-4 hover:underline">
        Me olvidé la contraseña
      </Link>
      <Captcha resetKey={state} />
      <Feedback state={state} />
      <Submit pending={pending} idle="Entrar" busy="Entrando…" />
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);
  if (state?.notice) return <Feedback state={state} />;
  return (
    <form action={action} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">¿A qué te dedicás?</legend>
        <div className="grid gap-1.5">
          {industries.map((i, n) => (
            <label
              key={i}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 has-checked:border-primary has-checked:bg-primary/5"
            >
              <input type="radio" name="rubro" value={i} required defaultChecked={n === 0} className="mt-1 accent-primary" />
              <span className="text-sm">
                <span className="block font-medium">{INDUSTRIES[i].label}</span>
                <span className="block text-muted-foreground">{INDUSTRIES[i].hint}</span>
              </span>
            </label>
          ))}
        </div>
        <Input name="rubroNombre" aria-label="Si elegiste Otro, ¿cuál?" placeholder="Si elegiste Otro, ¿cuál? (ej: Cerámica)" maxLength={60} />
      </fieldset>
      <EmailField id="signup-email" defaultValue={state?.email} />
      <NewPasswordFields prefix="signup" />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="acepto" required className="mt-1 accent-primary" />
        <span>
          Acepto los{" "}
          <Link href="/terminos" target="_blank" className="font-semibold underline underline-offset-4">
            términos y condiciones
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" target="_blank" className="font-semibold underline underline-offset-4">
            política de privacidad
          </Link>
          .
        </span>
      </label>
      <Captcha resetKey={state} />
      <Feedback state={state} />
      <Submit pending={pending} idle="Crear cuenta" busy="Creando…" />
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="grid gap-4">
      <EmailField id="reset-email" defaultValue={state?.email} />
      <Captcha resetKey={state} />
      <Feedback state={state} />
      <Submit pending={pending} idle="Mandame el link" busy="Enviando…" />
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="grid gap-4">
      <NewPasswordFields prefix="new" />
      <Feedback state={state} />
      <Submit pending={pending} idle="Guardar contraseña" busy="Guardando…" />
    </form>
  );
}
