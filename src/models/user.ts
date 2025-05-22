import bcrypt from "bcrypt";
import { QueryResultRow } from "pg";
import db from "../db"


export interface User {
  id: number;
  first: string;
  last: string;
  username: string;
  email: string;
  password_hash: string;
}

export class UserModel {

  // Return all users
  static async getUsers(): Promise<Array<QueryResultRow>> {
    const result = await db.query("SELECT * FROM users");
    return result.rows;
  }

  // Get a user by their ID
  static async findById(id: number): Promise<QueryResultRow | null> {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0] || null;
  }

  // Create a new user
  static async create(username: string, email: string, first: string, last: string, password: string): Promise<QueryResultRow> {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (first, last, username, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [first, last, username, email, passwordHash]
    );
    return result.rows[0];
  }

  // Checks whether the password entered matches the user
  static async validatePassword(
    user: User,
    password: string
  ): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }
}
