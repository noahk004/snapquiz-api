import { Router } from "express";
import { UserModel } from "../models/user";
import { AuthRequest } from "../types";

const userRouter = Router();

// Get a list of all users
// userRouter.get("/", async (req, res) => {
//   const users = await UserModel.getUsers();
//   res.status(200).json(users);
// });

// Get a user by their id
userRouter.get("/:id", async (req: AuthRequest, res) => {
  if (!req.user || req.user.id != Number(req.params.id)) {
    res.status(401).json({ error: "Unauthorized: user not authenticated" });
    return;
  }

  const user = await UserModel.findById(Number(req.params.id));
  res.status(200).json(user);
});


export default userRouter;
