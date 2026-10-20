
import { NextResponse } from "next/server";
import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request) {
  try {
    const user = verifyJWT(request);

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401, headers: corsHeaders }
      );
    }

    if (user.role !== "Student") {
      return NextResponse.json(
        { message: "Only students can view their enrollments." },
        { status: 403, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const db = process.env.MONGODB_DB
      ? client.db(process.env.MONGODB_DB)
      : client.db();

    const courses = await db
      .collection("courses")
      .find({ enrolledStudents: user.id })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      courses.map((course) => ({
        ...course,
        _id: course._id.toString(),
        teacher_id: course.teacher_id?.toString(),
        enrolledStudents: (course.enrolledStudents || []).length,
      })),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Get enrolled courses error:", error);

    return NextResponse.json(
      { message: "Unable to retrieve enrolled courses." },
      { status: 500, headers: corsHeaders }
    );
  }
}
