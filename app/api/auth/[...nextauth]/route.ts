import { handlers } from "@/auth";

// next-auth 5 beta handler types don't match Next.js 16's route handler signature yet
export const GET = handlers.GET as (req: Request) => Promise<Response>;
export const POST = handlers.POST as (req: Request) => Promise<Response>;