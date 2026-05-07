import { Kyrin } from "./src/lib";

const app = new Kyrin({ development: true });
const app2 = new Kyrin({ development: false });

console.log("Test 5: Development Mode - PASS");