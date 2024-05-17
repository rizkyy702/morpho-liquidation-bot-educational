import "dotenv/config";

// Validate and retrieve environment variables
export const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    console.error(`${key} not set. Exiting…`);
    process.exit(1);
  }
  return value;
};
