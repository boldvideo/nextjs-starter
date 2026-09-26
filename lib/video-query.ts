export interface VideoQueryParams {
  t?: string;
  interaction_id?: string;
  answer_request_id?: string;
  search_query?: string;
  search_request_id?: string;
}

export const videoQuery = (params: VideoQueryParams): string => {
  const query = new URLSearchParams();
  if (params.t) query.set("t", params.t);
  for (const key of ["interaction_id", "search_query", "search_request_id", "answer_request_id"] as const) {
    if (typeof params[key] === "string") query.set(key, params[key]);
  }
  return query.size ? `?${query}` : "";
};
