export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta: {
    page?: number;
    pageSize?: number;
    total?: number;
    [key: string]: unknown;
  } | null;
}
