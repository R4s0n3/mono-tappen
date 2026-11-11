/**
 * M2 fills this in with Sign in with Apple only.
 * The identity token is verified on the play server, which issues the bearer
 * token `getAccessToken` returns. tRPC already attaches that header
 * (play/src/trpc/react.tsx). Discord and Google are not offered in this app.
 */
export async function getAccessToken(): Promise<string | null> {
  return null;
}

export async function signInWithApple(): Promise<void> {
  throw new Error("Sign in with Apple is not in this build.");
}
