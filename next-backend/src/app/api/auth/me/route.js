
import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request) {
  const user = verifyJWT(request);

  if (!user) {
    return NextResponse.json(
      { message: "Not authenticated." },
      { status: 401, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
    { status: 200, headers: corsHeaders }
  );
}
