"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/ui-bits";
import { Captcha } from "./captcha";
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
      <EmailField id="signup-email" defaultValue={state?.email} />
      <NewPasswordFields prefix="signup" />
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
