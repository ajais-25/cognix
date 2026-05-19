import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json(
      {
        success: true,
        message: "Logout successful",
      },
      { status: 200 },
    );

    response.cookies.set("token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.log("Error in logout route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error occured during logout",
      },
      { status: 500 },
    );
  }
}
