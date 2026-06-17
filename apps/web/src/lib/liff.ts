// LIFF wrapper. With a real VITE_LIFF_ID it initialises the LINE LIFF SDK and
// returns the user's id_token. Without one (Phase 0 dev), it returns a dev token
// string that the API's stub verifier accepts — so the LINE button works end to
// end locally without a LINE channel.
const LIFF_ID = import.meta.env.VITE_LIFF_ID;

export const liffConfigured = Boolean(LIFF_ID);

export async function getLineIdToken(): Promise<string> {
  if (!LIFF_ID) {
    // Dev stub token — the stub verifier turns this into lineUserId "stub:<token>".
    return `dev-${Date.now()}`;
  }

  const { default: liff } = await import('@line/liff');
  await liff.init({ liffId: LIFF_ID });
  if (!liff.isLoggedIn()) {
    liff.login();
    // login() redirects; this resolves only after the redirect round-trip.
    return new Promise<string>(() => {});
  }
  const idToken = liff.getIDToken();
  if (!idToken) throw new Error('LIFF returned no id_token');
  return idToken;
}
