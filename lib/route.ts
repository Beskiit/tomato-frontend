import { NextResponse } from "next/server";
import { fail, withCors } from "./http";

export async function handleRoute<T>(fn: () => Promise<NextResponse<T>>): Promise<NextResponse> {
  try {
    return withCors(await fn());
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return fail("Unauthorized.", 401);
      if (error.message === "FORBIDDEN") return fail("Forbidden.", 403);
    }
    return fail("Server error.", 500);
  }
}
