import Link from "next/link";
import { AlasCredit } from "@/components/layout/alas-credit";
import { APP_NAME, OWNER } from "@/lib/brand";

/** Marco de las pantallas sin sesión (ingresar, registrarse, recuperar la contraseña). */
export function AuthScreen({
  title,
  intro,
  notice,
  children,
  footer,
}: {
  title: string;
  intro?: React.ReactNode;
  notice?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-amanecer px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center text-nube">
          <Link href="/ingresar" className="font-display text-4xl leading-none tracking-wide uppercase">
            {APP_NAME}
          </Link>
          <p className="text-sm text-lavanda">
            de {OWNER} · costos, precios y presupuestos para tu emprendimiento
          </p>
        </div>
        <div className="rounded-2xl bg-card p-6 text-card-foreground">
          <h1 className="mb-1 text-lg font-semibold">{title}</h1>
          {intro && <p className="mb-4 text-sm text-muted-foreground">{intro}</p>}
          {notice && <p className="mb-4 rounded-md bg-halo/25 px-3 py-2 text-sm text-foreground">{notice}</p>}
          {children}
        </div>
        {footer && <div className="mt-4 grid gap-1 text-center text-sm text-nube">{footer}</div>}
        <AlasCredit className="mt-8 justify-items-center text-center text-lavanda" linkClassName="text-nube" />
      </div>
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-halo underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
