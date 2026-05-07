import { Kyrin, cors } from "./src/lib";

const app = new Kyrin();

app.use(cors());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"], credentials: false, maxAge: 86400 }));

console.log("Test 20: CORS Plugin - PASS");