import type { AreaKey } from "@/lib/areas";
import type { DefaultSession } from "next-auth";

// Estende os tipos padrão do Auth.js com os campos que carregamos da sessão: perfil e áreas
// que o usuário pode editar (ver podeEditar() em src/lib/permissions.ts).
declare module "next-auth" {
  interface User {
    admin: boolean;
    areas: AreaKey[];
    perfilId: string;
    perfilNome: string;
  }

  interface Session {
    user: {
      admin: boolean;
      areas: AreaKey[];
      perfilId: string;
      perfilNome: string;
    } & DefaultSession["user"];
  }
}

// A interface JWT é declarada em @auth/core/jwt; "next-auth/jwt" só faz `export *` dali, e
// declaration merging via um módulo que só reexporta não pega (o TS não junta o augmentation
// com a interface original através de um re-export). Por isso o augmentation aqui aponta pro
// módulo de origem de verdade.
declare module "@auth/core/jwt" {
  interface JWT {
    admin?: boolean;
    areas?: AreaKey[];
    perfilId?: string;
    perfilNome?: string;
  }
}
