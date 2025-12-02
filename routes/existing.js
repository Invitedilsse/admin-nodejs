
import  express  from "express";
import { register } from "../src/existing/controller.js";

const router = express.Router();



router.post('/register',register);

export default router;