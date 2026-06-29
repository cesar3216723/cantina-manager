import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Proteger todas las rutas excepto el login, auth de next-auth, y assets/favicon.
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|logo.svg).*)",
  ],
};
