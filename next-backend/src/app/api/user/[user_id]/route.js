//src/app/api/user/[user_id]/route.js


import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

function jsonResponse(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

function isValidId(id) {
  return typeof id === "string" && ObjectId.isValid(id);
}

// GET /api/user/:user_id
// A user can view their own profile.
// Teachers can also view student details.
export async function GET(request, context) {
  try {
    const currentUser = verifyJWT(request);

    if (!currentUser) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    const { user_id } = await context.params;

    if (!isValidId(user_id)) {
      return jsonResponse({ message: "Invalid user ID." }, 400);
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    const targetUser = await db.collection("users").findOne(
      { _id: new ObjectId(user_id) },
      { projection: { password: 0 } }
    );

    if (!targetUser) {
      return jsonResponse({ message: "User not found." }, 404);
    }

    const isSelf = currentUser.id === targetUser._id.toString();
    const isTeacherViewingStudent =
      currentUser.role === "Teacher" && targetUser.role === "Student";

    if (!isSelf && !isTeacherViewingStudent) {
      return jsonResponse({ message: "Forbidden." }, 403);
    }

    return jsonResponse({
      user: {
        id: targetUser._id.toString(),
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error) {
    console.error("Get user failed:", error.message);
    return jsonResponse({ message: "Failed to retrieve user." }, 500);
  }
}

// PUT /api/user/:user_id
// Users can update their own username and email.
// Role and password changes are not allowed here.
export async function PUT(request, context) {
  try {
    const currentUser = verifyJWT(request);

    if (!currentUser) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    const { user_id } = await context.params;

    if (!isValidId(user_id)) {
      return jsonResponse({ message: "Invalid user ID." }, 400);
    }

    if (currentUser.id !== user_id) {
      return jsonResponse(
        { message: "You can only update your own profile." },
        403
      );
    }

    const body = await request.json();
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!username || username.length > 80) {
      return jsonResponse(
        { message: "Username is required and must be at most 80 characters." },
        400
      );
    }

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return jsonResponse({ message: "A valid email is required." }, 400);
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);
    const users = db.collection("users");
    const id = new ObjectId(user_id);

    const duplicateEmail = await users.findOne({
      email,
      _id: { $ne: id },
    });

    if (duplicateEmail) {
      return jsonResponse(
        { message: "That email address is already in use." },
        409
      );
    }

    const result = await users.updateOne(
      { _id: id },
      {
        $set: {
          username,
          email,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return jsonResponse({ message: "User not found." }, 404);
    }

    return jsonResponse({
      message: "Profile updated successfully.",
      user: {
        id: user_id,
        username,
        email,
        role: currentUser.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return jsonResponse(
        { message: "That email address is already in use." },
        409
      );
    }

    console.error("Update user failed:", error.message);
    return jsonResponse({ message: "Failed to update user." }, 500);
  }
}

// OPTIONS for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
