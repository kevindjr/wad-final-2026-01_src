
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request, context) {
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
        { message: "Only students can enroll." },
        { status: 403, headers: corsHeaders }
      );
    }

    const { course_id } = await context.params;

    if (!ObjectId.isValid(course_id)) {
      return NextResponse.json(
        { message: "Invalid course ID." },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const db = process.env.MONGODB_DB
      ? client.db(process.env.MONGODB_DB)
      : client.db();

    const courses = db.collection("courses");
    const id = new ObjectId(course_id);

    const course = await courses.findOne({ _id: id });

    if (!course) {
      return NextResponse.json(
        { message: "Course not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    if (course.status !== "Open") {
      return NextResponse.json(
        { message: "This course is not open for enrollment." },
        { status: 409, headers: corsHeaders }
      );
    }

    const enrolledStudents = course.enrolledStudents || [];

    if (enrolledStudents.includes(user.id)) {
      return NextResponse.json(
        { message: "You are already enrolled in this course." },
        { status: 409, headers: corsHeaders }
      );
    }

    if (enrolledStudents.length >= course.maxStudents) {
      return NextResponse.json(
        { message: "This course is full." },
        { status: 409, headers: corsHeaders }
      );
    }

    // Atomic update prevents duplicate enrollment and overfilling.
    const result = await courses.updateOne(
      {
        _id: id,
        status: "Open",
        enrolledStudents: { $ne: user.id },
        $expr: {
          $lt: [
            { $size: { $ifNull: ["$enrolledStudents", []] } },
            "$maxStudents",
          ],
        },
      },
      {
        $addToSet: { enrolledStudents: user.id },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.modifiedCount !== 1) {
      return NextResponse.json(
        {
          message:
            "Enrollment failed. The course may be full, closed, or you may already be enrolled.",
        },
        { status: 409, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { message: "Enrolled successfully." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Enroll course error:", error);

    return NextResponse.json(
      { message: "Unable to enroll in this course." },
      { status: 500, headers: corsHeaders }
    );
  }
}
