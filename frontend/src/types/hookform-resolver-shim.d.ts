// Tipagem do adaptador Zod ausente no pacote distribuído para Windows.
declare module "@hookform/resolvers/zod" {
  import type { Resolver } from "react-hook-form";
  import { z, type ZodTypeAny } from "zod";
  export function zodResolver<TSchema extends ZodTypeAny>(schema: TSchema): Resolver<z.infer<TSchema>>;
}
