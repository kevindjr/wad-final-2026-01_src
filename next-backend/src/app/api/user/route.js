//src/app/api/user/route.js


import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Create a Student account.
// Teacher accounts should be created through trusted setup/seed code.
export async function POST(request) {
  try {
    const body = await request.json();
    const { username, email, password, role } = body;

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !email.trim() ||
      password.length < 8
    ) {
      return NextResponse.json(
        {
          message:
            "Username, email, and a password of at least 8 characters are required.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Never allow public registration to create a Teacher.
    if (role && role !== "Student") {
      return NextResponse.json(
        { message: "Public registration is only available for Students." },
        { status: 403, headers: corsHeaders }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    const client = await getClientPromise();
    const db = process.env.MONGODB_DB
      ? client.db(process.env.MONGODB_DB)
      : client.db();

    const users = db.collection("users");

    const existingUser = await users.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409, headers: corsHeaders }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await users.insertOne({
      username: normalizedUsername,
      email: normalizedEmail,
      password: passwordHash,
      role: "Student",
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        message: "Student account created successfully.",
        user: {
          id: result.insertedId.toString(),
          username: normalizedUsername,
          email: normalizedEmail,
          role: "Student",
        },
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Create user error:", error);

    return NextResponse.json(
      { message: "Unable to create user." },
      { status: 500, headers: corsHeaders }
    );
  }
}

// List users only for authenticated Teachers.
// This endpoint never returns password hashes.
export async function GET(request) {
  try {
    const currentUser = verifyJWT(request);

    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401, headers: corsHeaders }
      );
    }

    if (currentUser.role !== "Teacher") {
      return NextResponse.json(
        { message: "Forbidden." },
        { status: 403, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const db = process.env.MONGODB_DB
      ? client.db(process.env.MONGODB_DB)
      : client.db();

    const users = await db
      .collection("users")
      .find(
        {},
        {
          projection: {
            password: 0,
          },
        }
      )
      .toArray();

    return NextResponse.json(
      users.map((user) => ({
        ...user,
        _id: user._id.toString(),
      })),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("List users error:", error);

    return NextResponse.json(
      { message: "Unable to retrieve users." },
      { status: 500, headers: corsHeaders }
    );
  }
}
