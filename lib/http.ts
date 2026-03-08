import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json(
    {
      code,
      message,
    },
    { status },
  );
}
