export type Ok<T> = { readonly _tag: "Ok"; readonly value: T };
export type Fail<E = string> = { readonly _tag: "Fail"; readonly error: E };
export type Result<T, E = string> = Ok<T> | Fail<E>;

export const ok = <T>(value: T): Result<T> => ({ _tag: "Ok", value });
export const fail = (error: string): Result<never> => ({ _tag: "Fail", error });
export const isOk = <T>(r: Result<T>): r is Ok<T> => r._tag === "Ok";
export const isFail = <T, E = string>(r: Result<T, E>): r is Fail<E> =>
  r._tag === "Fail";

export type ID = string & { readonly __brand: "ID" };
export const ID = (v?: string): ID => (v ?? crypto.randomUUID()) as ID;
