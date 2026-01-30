import { z } from "zod";
import { hashPassword, verifyPassword } from "./service";

export default async function authRoutes(app: any) {
  // Register (USER only)
  const RegisterSchema = z
    .object({
      email: z.string().trim().toLowerCase().email().optional(),
      phone: z.string().trim().min(6).optional(),
      password: z.string().min(6),
      firstName: z.string().trim().min(1).optional(),
      lastName: z.string().trim().min(1).optional(),
    })
    .refine((v) => v.email || v.phone, { message: "email or phone required" });

  app.post("/auth/register", async (req: any, reply: any) => {
    const body = RegisterSchema.parse(req.body);

    const password_hash = await hashPassword(body.password);

    try {
      const inserted = await app.db
        .insertInto("users")
        .values({
          role: "USER",
          email: body.email ?? null,
          phone: body.phone ?? null,
          password_hash,
          first_name: body.firstName ?? null,
          last_name: body.lastName ?? null,
          status: "ACTIVE",
        })
        .returning(["id", "role", "email", "phone", "first_name", "last_name"])
        .executeTakeFirst();

      const token = app.jwt.sign(
        { id: String(inserted.id), role: inserted.role },
        { expiresIn: "7d" },
      );

      return reply.code(201).send({
        user: {
          id: String(inserted.id),
          role: inserted.role,
          email: inserted.email,
          phone: inserted.phone,
          firstName: inserted.first_name,
          lastName: inserted.last_name,
        },
        accessToken: token,
      });
    } catch (e: any) {
      // unique constraint conflict (email/phone)
      return reply.conflict("Email/phone already exists");
    }
  });

  // Login (by email or phone)
  const LoginSchema = z.object({
    identifier: z.string().trim().min(3),
    password: z.string().min(6),
  });

  app.post("/auth/login", async (req: any, reply: any) => {
    const body = LoginSchema.parse(req.body);
    const ident = body.identifier.trim();
    const emailIdent = ident.includes("@") ? ident.toLowerCase() : ident;
    const user = await app.db
      .selectFrom("users")
      .select(["id", "role", "email", "phone", "password_hash", "status"])
      .where((eb: any) =>
        eb.or([
          eb("email", "=", emailIdent),
          eb("phone", "=", body.identifier),
        ]),
      )
      .executeTakeFirst();

    if (!user) return reply.unauthorized("Invalid credentials");
    if (user.status !== "ACTIVE")
      return reply.forbidden("Account is not active");

    const ok = await verifyPassword(body.password, user.password_hash);
    if (!ok) return reply.unauthorized("Invalid credentials");

    const token = app.jwt.sign(
      { id: String(user.id), role: user.role },
      { expiresIn: "7d" },
    );

    return reply.send({
      user: {
        id: String(user.id),
        role: user.role,
        email: user.email,
        phone: user.phone,
      },
      accessToken: token,
    });
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req: any) => {
    return { user: req.user };
  });
}
