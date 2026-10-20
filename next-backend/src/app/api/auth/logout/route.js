//src/app/api/auth/logout/route.js

import { NextResponse } from "next/server";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST() {
  const response = NextResponse.json(
    { message: "Logout successful." },
    {
      status: 200,
      headers: corsHeaders,
    }
  );

  // Clear the authentication cookie
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
