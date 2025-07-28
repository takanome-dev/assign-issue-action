/**
 * Utility function to get a date string in the format YYYY-MM-DD
 * @param days - The number of days to subtract from the current date
 * @returns A date string in the format YYYY-MM-DD
 */
export function since(days: number) {
  const totalDaysInMilliseconds = days * 24 * 60 * 60 * 1000;
  const date = new Date(+new Date() - totalDaysInMilliseconds);

  return new Date(date).toISOString().substring(0, 10);
}

/**
 * Utility function to split array into chunks
 * @param array - The array to split
 * @param chunkSize - The size of each chunk
 * @returns An array of arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Utility function to calculate days between dates
 * @param start - The start date
 * @param end - The end date
 * @returns The number of days between the two dates
 */
export function getDaysBetween(start: Date, end: Date) {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
