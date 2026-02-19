import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { RoleScope } from "@/lib/generated/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) {
          return null
        }

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email },
            include: {
              userRole: {
                include: {
                  region: true,
                  university: true,
                  smallGroup: true,
                  graduateSmallGroup: true,
                }
              }
            }
          })

          if (!user) {
            return null
          }

          // Check if user has a password (some users might be OAuth only)
          if (!user.password) {
            return null
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, user.password)

          if (!isValidPassword) {
            return null
          }

          // User is valid (no status field in schema)

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            image: user.image,
            roles: user.userRole?.map(role => ({
              scope: role.scope,
              regionId: role.regionId,
              universityId: role.universityId,
              smallGroupId: role.smallGroupId,
              graduateGroupId: role.graduateGroupId,
              region: role.region,
              university: role.university,
              smallGroup: role.smallGroup,
              graduateSmallGroup: role.graduateSmallGroup,
            })) || []
          }
        } catch (error) {
          console.error("Auth error:", error)
          // Don't expose database errors to client
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles
        token.username = user.username
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.username = token.username as string
        session.user.roles = token.roles as Array<{
          scope: RoleScope;
          regionId?: number | null;
          universityId?: number | null;
          smallGroupId?: number | null;
          graduateGroupId?: number | null;
          region?: { id: number; name: string } | null;
          university?: { id: number; name: string } | null;
          smallGroup?: { id: number; name: string } | null;
          graduateSmallGroup?: { id: number; name: string } | null;
        }>
      }
      return session
    }
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  trustHost: process.env.NODE_ENV === "production" ? false : true,
})
