import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';
const EXPIRES_IN = '1h';

export function signJwt(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyJwt(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}
