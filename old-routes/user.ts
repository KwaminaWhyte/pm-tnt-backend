import { LoaderFunction } from "react-router";
import UserController from "~/controllers/UserController";

export const action = async () => {
  return {
    status: "error",
    message: "Method Not Allowed!",
  };
};

export const loader: LoaderFunction = async ({ request }) => {
  const userController = new UserController(request);

  const bearerToken = request.headers.get("Authorization") as string;
  const token = bearerToken.split(" ")[1];

  return await userController.getCurrentUser(token);
};
