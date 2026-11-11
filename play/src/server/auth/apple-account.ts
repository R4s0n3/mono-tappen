export type KnownAppleUser = {
  id: string;
  email: string | null;
  name: string | null;
  appleSub: string | null;
};

export type AppleSignInPlan =
  | {
      kind: "existing";
      userId: string;
      setEmail: string | null;
      setName: string | null;
      attachSub: boolean;
    }
  | { kind: "create"; email: string | null; name: string | null };

export function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase() ?? "";
  return trimmed === "" ? null : trimmed;
}

export function displayName(givenName?: string | null, familyName?: string | null): string | null {
  const name = [givenName, familyName]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part !== "")
    .join(" ");
  return name === "" ? null : name;
}

/**
 * Find the account for an Apple `sub`, or link a verified email (including
 * privaterelay addresses) to an existing user. Emails are compared lowercase.
 * An unverified email never links and is not stored.
 */
export function planAppleSignIn(input: {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  bySub: KnownAppleUser | null;
  byEmail: KnownAppleUser | null;
}): AppleSignInPlan {
  const email = input.emailVerified ? normalizeEmail(input.email) : null;
  const fill = (user: KnownAppleUser, attachSub: boolean): AppleSignInPlan => {
    const emailOwnedByOther = input.byEmail !== null && input.byEmail.id !== user.id;
    return {
      kind: "existing",
      userId: user.id,
      setEmail: user.email !== null || emailOwnedByOther ? null : email,
      setName: user.name ? null : input.name,
      attachSub,
    };
  };

  if (input.bySub) return fill(input.bySub, false);

  if (email && input.byEmail && (!input.byEmail.appleSub || input.byEmail.appleSub === input.sub)) {
    return fill(input.byEmail, input.byEmail.appleSub === null);
  }

  const emailTaken = Boolean(email && input.byEmail?.appleSub && input.byEmail.appleSub !== input.sub);
  return { kind: "create", email: emailTaken ? null : email, name: input.name };
}
