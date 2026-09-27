export function toPublicUser(
  user
) {
  return {
    id: user._id,

    name: user.name,

    email: user.email,

    globalRoles:
      user.globalRoles,

    accountType:
      user.requestedAccountType,

    emailVerified:
      user.emailVerified,

    accountStatus:
      user.accountStatus,

    onboardingCompleted:
      user.onboardingCompleted,
    academicProfile: user.academicProfile,
    profile: user.profile,
    facultyProfile: user.facultyProfile,
  };
}
