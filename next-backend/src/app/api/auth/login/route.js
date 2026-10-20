//src/app/api/auth/login/route.js

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getClientPromise } from "@/lib/mongodb";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check server configuration
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured.");

      return NextResponse.json(
        { message: "Server configuration error." },
        { status: 500, headers: corsHeaders }
      );
    }

    // Connect to MongoDB
    const client = await getClientPromise();
    const db = process.env.MONGODB_DB
      ? client.db(process.env.MONGODB_DB)
      : client.db();

    // Find user by email
    const normalizedEmail = email.trim().toLowerCase();

    const user = await db.collection("users").findOne({
      email: normalizedEmail,
    });

    // Reject invalid credentials without revealing which field failed
    if (!user || typeof user.password !== "string") {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401, headers: corsHeaders }
      );
    }

    // Compare submitted password with stored bcrypt hash
    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401, headers: corsHeaders }
      );
    }

    // Validate the user record
    if (
      !user.username ||
      !user.email ||
      !["Student", "Teacher"].includes(user.role)
    ) {
      return NextResponse.json(
        { message: "User account is not configured correctly." },
        { status: 403, headers: corsHeaders }
      );
    }

    // Create JWT
    const token = jwt.sign(
      {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    // Return public user information and set the authentication cookie
    const response = NextResponse.json(
      {
        message: "Login successful.",
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { message: "Unable to process login." },
      { status: 500, headers: corsHeaders }
    );
  }
}
