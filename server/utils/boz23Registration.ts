export const TEST_REGISTRATION_ONLY_MESSAGE =
  'Only test user registrations are currently being accepted.'

/** True when BOZ23 is exactly "1". Missing, empty, or "0" => false. */
export function isTestRegistrationOnly(boz23: string | undefined | null): boolean {
  return String(boz23 ?? '').trim() === '1'
}

export function usernameMeetsBoz23Requirement(username: string): boolean {
  return username.toLowerCase().includes('boz23')
}

export function assertRegistrationAllowed(
  username: string,
  boz23: string | undefined | null
): void {
  if (isTestRegistrationOnly(boz23) && !usernameMeetsBoz23Requirement(username)) {
    throw createError({
      statusCode: 403,
      message: TEST_REGISTRATION_ONLY_MESSAGE
    })
  }
}
