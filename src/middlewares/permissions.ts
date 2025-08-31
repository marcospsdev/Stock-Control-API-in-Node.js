import { Request, Response, NextFunction } from "express";
import { verify } from "jsonwebtoken";

export const USER_TYPES = {
  ADMIN: "af77c7f3-c5b9-4a99-b145-c6328a6f8745",
  OPERATOR: "e88d7f1d-f8f8-4e8c-8a24-2c6c1a8a25c3",
  SELLER: "f88d7f1d-f8f8-4e8c-8a24-2c6c1a8a25c3",
};

interface Payload {
  sub: string;
}

export interface AuthenticatedRequest extends Request {
  user_type_id?: string;
}

export function isAuthenticated(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authToken = req.headers.authorization;

  if (!authToken) {
    return res.status(401).json({ error: "Token is missing" });
  }

  const [, token] = authToken.split(" ");

  try {
    const { sub } = verify(token, process.env.JWT_SECRET as string) as Payload;

    req.user_type_id = sub;

    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function can(...allowedTypes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userType = req.user_type_id;

    if (!userType) {
      return res
        .status(403)
        .json({ error: "Permission denied. Authentication missing." });
    }

    const hasPermission = allowedTypes.includes(userType);

    if (hasPermission) {
      return next();
    }

    return res.status(403).json({
      error: "You do not have the required permissions for this action.",
    });
  };
}
