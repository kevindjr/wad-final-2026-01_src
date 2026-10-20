import jwt from "jsonwebtoken";

export function verifyJWT(req) {
  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured.");
      return null;
    }

    const token = req.cookies.get("token")?.value;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, secret);

    // Reject tokens without the identity fields our APIs require.
    if (
      typeof decoded !== "object" ||
      !decoded.id ||
      !decoded.email ||
      !decoded.username ||
      !["Student", "Teacher"].includes(decoded.role)
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
