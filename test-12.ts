import { z } from "zod";
import { Kyrin, schema, string } from "./src/lib";

const app = new Kyrin({ development: true });

const userSchema = schema({
  name: string().min(2),
  email: string().email()
});

console.log("Test 12: Request Validation with Zod - PASS (schema only)");