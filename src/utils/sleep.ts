// Function to pause execution for a given timeout
export const sleep = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));
