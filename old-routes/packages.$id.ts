import { ActionFunction, LoaderFunction } from "react-router";
import PackageController from "~/controllers/PackageController";

export const action: ActionFunction = async ({ request }) => {
  return {
    status: "error",
    message: "Action not allowed!",
    code: 401,
  };
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { id } = params;
  const packageCTR = new PackageController(request);
  return await packageCTR.getPackage(id as string);
};
