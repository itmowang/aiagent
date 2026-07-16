import bcrypt from "bcryptjs";
import { sign, verify } from "hono/jwt";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "dev-secret-change-me";

export interface JwtPayload {
    sub: string; // userId
    username: string;
    role: "admin" | "user";
    exp: number;
    [key: string]: unknown;
}

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
    plain: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

export async function signToken(user: {
    id: string;
    username: string;
    role: "admin" | "user";
}): Promise<string> {
    const payload: JwtPayload = {
        sub: user.id,
        username: user.username,
        role: user.role,
        // 7 天有效期
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    };
    return sign(payload, JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
    return (await verify(token, JWT_SECRET, "HS256")) as JwtPayload;
}
