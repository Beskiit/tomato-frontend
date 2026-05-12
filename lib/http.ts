import { NextRequest, NextResponse } from "next/server";

export function ok(data: unknown, status = 200): NextResponse {
  return withCors(NextResponse.json(data, { status }));
}

export function fail(
  message: string,
  status: number,
  errors?: Record<string, string[]>
): NextResponse {
  return withCors(NextResponse.json({ message, ...(errors ? { errors } : {}) }, { status }));
}

export function parsePagination(request: NextRequest, defaultPerPage: number) {
  const page = Math.max(Number(request.nextUrl.searchParams.get("page") ?? 1), 1);
  const perPageRaw = Number(request.nextUrl.searchParams.get("per_page") ?? defaultPerPage);
  const perPage = Math.max(1, Math.min(perPageRaw, 200));
  return { page, perPage };
}

export function toPaginated<T>(
  data: T[],
  page: number,
  perPage: number,
  total: number
): { data: T[]; current_page: number; last_page: number; per_page: number; total: number } {
  return {
    data,
    current_page: page,
    last_page: Math.max(Math.ceil(total / perPage), 1),
    per_page: perPage,
    total,
  };
}

export function getIpAddress(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  return response;
}

export function optionsResponse(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}
