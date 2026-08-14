import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import { ADMIN_ROLES } from "@/lib/roles";
import User from "@/models/User";
import OtpCode from "@/models/OtpCode";

const OTP_TENTATIVES_MAX = 5;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/connexion",
  },
  providers: [
    // Administrateur : email + mot de passe (section 7.1).
    CredentialsProvider({
      id: "admin-credentials",
      name: "Administration",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await dbConnect();
        const email = credentials.email.toLowerCase().trim();
        const user = await User.findOne({ email }).select("+passwordHash");
        if (!user?.passwordHash || !(ADMIN_ROLES as readonly string[]).includes(user.role)) {
          return null;
        }

        const valide = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valide) return null;

        return { id: String(user._id), name: user.nom, email: user.email, role: user.role };
      },
    }),
    // Client : code à usage unique envoyé par email (section 7.1, adapté SMS → email —
    // voir la mémoire de session sur ce choix). Le compte doit déjà exister (créé à la
    // première commande) ; la demande de code se fait via POST /api/auth/otp/request.
    CredentialsProvider({
      id: "client-otp",
      name: "Code de connexion",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null;

        await dbConnect();
        const email = credentials.email.toLowerCase().trim();
        const otp = await OtpCode.findOne({ identifiant: email });
        if (!otp || otp.consomme || otp.expiresAt.getTime() < Date.now()) return null;
        if (otp.tentatives >= OTP_TENTATIVES_MAX) return null;

        const valide = await bcrypt.compare(credentials.code, otp.codeHash);
        if (!valide) {
          otp.tentatives += 1;
          await otp.save();
          return null;
        }

        const user = await User.findOne({ email });
        if (!user) return null;

        otp.consomme = true;
        await otp.save();

        return { id: String(user._id), name: user.nom, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
