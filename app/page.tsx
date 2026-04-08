import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/access";

export default async function HomePage() {
  const session = await getSessionContext();
  if (session) {
    redirect("/plataforma/dashboard");
  }

  redirect("/entrar");
}
