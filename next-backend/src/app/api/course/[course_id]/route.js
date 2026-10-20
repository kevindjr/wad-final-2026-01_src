
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

async function getCourseContext(request, context) {
  const user = verifyJWT(request);

  if (!user) {
    return {
      response: NextResponse.json(
        { message: "Unauthorized." },
        { status: 401, headers: corsHeaders }
      ),
    };
  }

  const { course_id } = await context.params;

  if (!ObjectId.isValid(course_id)) {
    return {
      response: NextResponse.json(
        { message: "Invalid course ID." },
        { status: 400, headers: corsHeaders }
      ),
    };
  }

  const client = await getClientPromise();
  const db = process.env.MONGODB_DB
    ? client.db(process.env.MONGODB_DB)
    : client.db();

  const course = await db.collection("courses").findOne({
    _id: new ObjectId(course_id),
  });

  if (!course) {
    return {
      response: NextResponse.json(
        { message: "Course not found." },
        { status: 404, headers: corsHeaders }
      ),
    };
  }

  return { user, db, course };
}

export async function GET(request, context) {
  try {
    const result = await getCourseContext(request, context);
    if (result.response) return result.response;

    const { user, db, course } = result;

    if (user.role === "Student" && course.status === "Cancel") {
      return NextResponse.json(
        { message: "Course not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    if (user.role === "Teacher" &&
        course.teacher_id?.toString() !== user.id) {
      return NextResponse.json(
        { message: "You can only view your own courses." },
        { status: 403, headers: corsHeaders }
      );
    }

    const studentIds = course.enrolledStudents || [];
    const validStudentIds = studentIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const students = validStudentIds.length
      ? await db
          .collection("users")
          .find(
            { _id: { $in: validStudentIds }, role: "Student" },
            { projection: { username: 1, email: 1 } }
          )
          .toArray()
      : [];

    return NextResponse.json(
      {
        ...course,
        _id: course._id.toString(),
        teacher_id: course.teacher_id?.toString(),
        teacher_name: course.teacher_name || "Unknown teacher",
        enrolledStudents: students.map((student) => ({
          id: student._id.toString(),
          username: student.username,
          email: student.email,
        })),
        enrolledCount: studentIds.length,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Get course details error:", error);

    return NextResponse.json(
      { message: "Unable to retrieve course." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(request, context) {
  try {
    const result = await getCourseContext(request, context);
    if (result.response) return result.response;

    const { user, db, course } = result;

    if (user.role !== "Teacher") {
      return NextResponse.json(
        { message: "Only teachers can update courses." },
        { status: 403, headers: corsHeaders }
      );
    }

    if (course.teacher_id?.toString() !== user.id) {
      return NextResponse.json(
        { message: "You can only update your own courses." },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { name, duration, topics, price, maxStudents, status } = body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !Number.isInteger(duration) ||
      duration <= 0 ||
      !Array.isArray(topics) ||
      topics.length === 0 ||
      topics.some(
        (topic) => typeof topic !== "string" || !topic.trim()
      ) ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(maxStudents) ||
      maxStudents <= 0 ||
      !["Open", "Close", "Cancel"].includes(status)
    ) {
      return NextResponse.json(
        { message: "Please provide valid course details." },
        { status: 400, headers: corsHeaders }
      );
    }

    const enrolledCount = (course.enrolledStudents || []).length;

    if (maxStudents < enrolledCount) {
      return NextResponse.json(
        {
          message:
            "Maximum students cannot be fewer than current enrollment.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const updatedCourse = {
      name: name.trim(),
      duration,
      topics: topics.map((topic) => topic.trim()),
      price,
      maxStudents,
      status,
      updatedAt: new Date(),
    };

    await db.collection("courses").updateOne(
      { _id: course._id },
      { $set: updatedCourse }
    );

    return NextResponse.json(
      {
        message: "Course updated successfully.",
        course: {
          ...course,
          ...updatedCourse,
          _id: course._id.toString(),
          teacher_id: course.teacher_id?.toString(),
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Update course error:", error);

    return NextResponse.json(
      { message: "Unable to update course." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const result = await getCourseContext(request, context);
    if (result.response) return result.response;

    const { user, db, course } = result;

    if (user.role !== "Teacher") {
      return NextResponse.json(
        { message: "Only teachers can delete courses." },
        { status: 403, headers: corsHeaders }
      );
    }

    if (course.teacher_id?.toString() !== user.id) {
      return NextResponse.json(
        { message: "You can only delete your own courses." },
        { status: 403, headers: corsHeaders }
      );
    }

    if ((course.enrolledStudents || []).length > 0) {
      return NextResponse.json(
        {
          message: "Cannot delete a course with enrolled students.",
        },
        { status: 409, headers: corsHeaders }
      );
    }

    await db.collection("courses").deleteOne({
      _id: course._id,
    });

    return NextResponse.json(
      { message: "Course deleted successfully." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Delete course error:", error);

    return NextResponse.json(
      { message: "Unable to delete course." },
      { status: 500, headers: corsHeaders }
    );
  }
}
