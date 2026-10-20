
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();

    const client = await getClientPromise();
    const db = process.env.MONGODB_DB
      ? client.db(process.env.MONGODB_DB)
      : client.db();

    let filter = {};

    if (user.role === "Student") {
      filter.status = { $ne: "Cancel" };
    } else if (user.role === "Teacher") {
      filter.teacher_id = user.id;
    } else {
      return NextResponse.json(
        { message: "Invalid user role." },
        { status: 403, headers: corsHeaders }
      );
    }

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const matchingTeachers = await db
        .collection("users")
        .find(
          {
            role: "Teacher",
            username: { $regex: safeSearch, $options: "i" },
          },
          { projection: { _id: 1 } }
        )
        .toArray();

      const matchingTeacherIds = matchingTeachers.map((teacher) =>
        teacher._id.toString()
      );

      const searchConditions = [
        { name: { $regex: safeSearch, $options: "i" } },
        { teacher_name: { $regex: safeSearch, $options: "i" } },
        { teacher_id: { $in: matchingTeacherIds } },
      ];

      filter = { $and: [filter, { $or: searchConditions }] };
    }

    const courses = await db
      .collection("courses")
      .find(filter)
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
    console.error("Get courses error:", error);

    return NextResponse.json(
      { message: "Unable to retrieve courses." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request) {
  try {
    const user = verifyJWT(request);

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401, headers: corsHeaders }
      );
    }

    if (user.role !== "Teacher") {
      return NextResponse.json(
        { message: "Only teachers can create courses." },
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

    const client = await getClientPromise();
    const db = process.env.MONGODB_DB
      ? client.db(process.env.MONGODB_DB)
      : client.db();

    const course = {
      name: name.trim(),
      duration,
      topics: topics.map((topic) => topic.trim()),
      price,
      maxStudents,
      status,
      teacher_id: user.id,
      teacher_name: user.username,
      enrolledStudents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("courses").insertOne(course);

    return NextResponse.json(
      {
        message: "Course created successfully.",
        course: {
          ...course,
          _id: result.insertedId.toString(),
        },
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Create course error:", error);

    return NextResponse.json(
      { message: "Unable to create course." },
      { status: 500, headers: corsHeaders }
    );
  }
}
