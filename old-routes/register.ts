import { ActionFunction } from "react-router";
import UserController from "~/controllers/UserController";

export const action: ActionFunction = async ({ request }) => {
  const userController = new UserController(request);

  const payload = await request.json();

  return await userController.register({
    firstName: payload.firstName as string,
    lastName: payload.lastName as string,
    phone: payload.phone as string,
    email: payload.email as string,
    password: payload.password as string,
    photo: payload.photo as string,
  });
};
