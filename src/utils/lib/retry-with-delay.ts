/**
 * Retry function with exponential backoff.
 * @param fn The function to retry.
 * @param retries Number of retry attempts.
 * @param delay Initial delay between retries in milliseconds.
 */
export async function retryWithDelay<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 2000,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // if (retries > 0) {
    //   console.warn(
    //     `Error occurred: ${JSON.stringify(err)}. Retrying in ${delay}ms...`,
    //   );
    //   await new Promise((resolve) => setTimeout(resolve, delay));
    //   return retryWithDelay(fn, retries - 1, delay * 2); // Exponential backoff
    // }
    if (
      (err as any)?.status === 403 &&
      (err as any)?.response?.headers?.['retry-after']
    ) {
      const retryAfter =
        parseInt((err as any)?.response?.headers?.['retry-after'], 10) || 1;
      console.warn(`Rate limit hit. Retrying after ${retryAfter} seconds.`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return retryWithDelay(fn, retries - 1, delay * 2); // Retry after waiting
    }
    throw err; // Throw error if retries are exhausted
  }
}
