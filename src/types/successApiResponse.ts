export type SuccessApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};
