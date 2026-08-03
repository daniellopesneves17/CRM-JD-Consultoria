// Proteção server-side: somente o e-mail proprietário acessa qualquer rota admin.
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
export default async function AdminLayout({children}:{children:React.ReactNode}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) redirect("/dashboard");
  return children;
}

