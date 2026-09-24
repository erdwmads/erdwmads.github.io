import type { APIRoute } from "astro";
import { stylesheetBundle } from "../../../lib/stylesheet-bundle";

export const GET: APIRoute = async () =>
  new Response((await stylesheetBundle()).css, {
    headers: { "Content-Type": "text/css; charset=utf-8" }
  });
