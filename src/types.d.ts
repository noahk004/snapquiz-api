import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

interface UserPayload {
    id: number;
    username: string;
    iat: number;
    exp: number;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}
