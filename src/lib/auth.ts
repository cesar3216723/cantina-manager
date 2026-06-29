import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compareSync } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const adminUsername = process.env.ADMIN_USERNAME ?? "";
        const adminHash = process.env.ADMIN_PASSWORD_HASH ?? "";

        // Comparar usuario (case-insensitive) y contraseña (bcrypt)
        const usernameMatch =
          credentials.username.trim().toUpperCase() ===
          adminUsername.trim().toUpperCase();

        const passwordMatch = compareSync(credentials.password, adminHash);

        if (!usernameMatch || !passwordMatch) return null;

        return {
          id: "1",
          name: adminUsername,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          name: token.name ?? null,
          email: token.email ?? null,
          image: token.picture ?? null,
        };
      }
      return session;
    },
  },
};
