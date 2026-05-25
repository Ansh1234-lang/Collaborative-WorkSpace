import jwt,{Secret,SignOptions} from 'jsonwebtoken'


const JWT_SECRET = process.env.JWT_SECRET as string;

interface TokenPayload {
  userId: string
  email: string
}

export function signToken(payload: TokenPayload): string {
  const option : SignOptions={
    expiresIn:"7d",
  };
  return jwt.sign(payload,JWT_SECRET,option)
}


export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload
}