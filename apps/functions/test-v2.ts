import { onCall } from "firebase-functions/v2/https";
export const testV2 = onCall({ invoker: 'public' }, async (request) => {
  return { success: true };
});
