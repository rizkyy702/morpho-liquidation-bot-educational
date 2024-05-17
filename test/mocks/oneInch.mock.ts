import nock from "nock";
import { readFileSync } from "fs";
import { join } from "path";
import { SwapOutput } from "../../src/utils/types";

// Function to load the fixture from a file
const loadFixture = (filename: string): SwapOutput => {
  const filePath = join(__dirname, filename);
  const fixture = readFileSync(filePath, "utf-8");
  return JSON.parse(fixture) as SwapOutput;
};

// Set up mocks for 1inch API calls
export const setup1InchMock = () => {
  // Load the fixture for the mock response
  const liquidateUser1 = loadFixture("liquidateUser.json");

  // Intercept 1inch API calls and return the fixture
  nock("https://api.1inch.dev")
    .persist()
    .get(/\/swap\/v6\.0\/1\/swap/)
    .reply(200, liquidateUser1);
};
