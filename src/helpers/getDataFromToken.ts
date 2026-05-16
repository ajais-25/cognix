import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

interface DecodedToken {
  _id: string;
}

export function getDataFromToken(request: NextRequest): string | null {
  try {
    const token = request.cookies.get("token")?.value || "";
    const secret = process.env.JWT_SECRET!;

    if (!token || !secret) {
      return null;
    }

    const decodedToken = jwt.verify(token, secret) as DecodedToken;

    if (!decodedToken._id) {
      return null;
    }

    return decodedToken._id;
  } catch (error) {
    return null;
  }
}
