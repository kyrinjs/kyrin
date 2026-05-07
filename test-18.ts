import { Router } from "./src/lib";

export const userRouter = new Router();

userRouter.get('/', () => ({ message: "Hello User" }));
userRouter.get('/:id', () => ({ message: "User Found" }));
userRouter.post('/create', () => ({ message: "User Created" }));

console.log("Test 18: Router - PASS");