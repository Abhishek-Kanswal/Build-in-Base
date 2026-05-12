export interface AppUser {
  name: string;
  email: string;
  avatar: string;
}

type UserLike = {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
  emailAddresses?: Array<{ emailAddress: string }>;
};

export function toAppUser(user: UserLike | null | undefined): AppUser | null {
  if (!user) {
    return null;
  }

  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    "";

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const fallbackName = email ? email.split("@")[0] : "User";

  return {
    name: fullName || user.username || fallbackName,
    email,
    avatar: user.imageUrl ?? "",
  };
}
