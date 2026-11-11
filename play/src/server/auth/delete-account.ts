export type ErasurePlan = {
  user: {
    name: null;
    email: null;
    emailVerified: null;
    image: null;
    paymentId: null;
    deletedAt: Date;
    last_newName: null;
  };
  scrubOrderIds: string[];
};

export function erasurePlan(
  user: { email: string | null },
  orders: { id: string; email: string | null; amount: number }[],
  now: Date,
): ErasurePlan {
  const email = user.email?.trim().toLowerCase() ?? "";
  return {
    user: {
      name: null,
      email: null,
      emailVerified: null,
      image: null,
      paymentId: null,
      deletedAt: now,
      last_newName: null,
    },
    scrubOrderIds: email
      ? orders.filter((order) => order.email?.trim().toLowerCase() === email).map((order) => order.id)
      : [],
  };
}

/**
 * Revoke the Apple refresh token when the server has a Sign in with Apple key,
 * then erase the account either way. A missing key or a failed revoke does not
 * keep the account.
 */
export async function deleteNativeAccount(input: {
  refreshToken: string | null;
  revoke: (refreshToken: string | null) => Promise<"revoked" | "skipped" | "failed">;
  erase: () => Promise<void>;
}): Promise<"revoked" | "skipped" | "failed"> {
  let result: "revoked" | "skipped" | "failed";
  try {
    result = await input.revoke(input.refreshToken);
  } catch {
    result = "failed";
  }
  await input.erase();
  return result;
}
