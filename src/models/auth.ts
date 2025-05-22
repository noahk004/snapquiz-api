import db from "../db";
import bcrypt from "bcrypt";
import { signJwt } from "../utils/jwt";

export class AuthModel {
  static async login(
    username: string,
    password: string
  ): Promise<string | null> {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    const user = result.rows[0];

    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    const token = signJwt({ id: user.id, username: user.username });
    return token;
  }
}
