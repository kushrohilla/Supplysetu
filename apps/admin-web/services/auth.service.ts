import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from "@/services/session.constants";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return sessionCookie === AUTH_COOKIE_VALUE;
}
