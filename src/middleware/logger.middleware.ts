import { Elysia } from "elysia";
// import { config } from "../config";

export const loggerMiddleware = new Elysia().onRequest(({ request, set }) => {
  const start = Date.now();
  const method = request.method;
  const url = new URL(request.url).pathname;
  const timestamp = new Date().toISOString();
  // Store start time for duration calculation
  set.headers["x-request-start"] = start.toString();

  // if (config.isDevelopment) {
  // console.log(`📝 ${method} ${url} - Started`);
  console.log(`[${timestamp}] ${method} ${url}`);

  // }
});
// .onResponse(({ request, set }) => {
//   const method = request.method;
//   const url = new URL(request.url).pathname;
//   const status = set.status || 200;
//   const start = parseInt(set.headers["x-request-start"] as string);
//   const duration = Date.now() - start;

//   // if (config.isDevelopment) {
//   //   const statusColor = status >= 400 ? "🔴" : status >= 300 ? "🟡" : "🟢";
//   //   console.log(
//   //     `${statusColor} ${method} ${url} - ${status} (${duration}ms)`
//   //   );
//   // }
// });
