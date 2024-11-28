import { ActionFunction } from "react-router";
import UserController from "~/controllers/UserController";

export const action: ActionFunction = async ({ request }) => {
  const userController = new UserController(request);

  const payloed = await request.json();

  return await userController.loginUser({
    email: payloed.email as string,
    password: payloed.password as string,
  });
};
