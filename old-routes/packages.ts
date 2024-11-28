import { ActionFunction, LoaderFunction } from "react-router";
import PackageController from "~/controllers/PackageController";

export const action: ActionFunction = async ({ request }) => {
  // const payload = await request.json();
  // const locationController = new DestinationController(request);

  return {
    status: "error",
    message: "Action not allowed!",
    code: 401,
  };

  // switch (request.method) {
  //   case "POST":
  //     return await locationController.createLocation({
  //       name: payload.name as string,
  //       price: payload.price as string,
  //       description: payload.description as string,
  //     });

  //   case "PUT":
  //     return await locationController.updateLocation({
  //       _id: payload._id as string,
  //       name: payload.name as string,
  //       price: payload.price as string,
  //       description: payload.description as string,
  //     });
  //   case "DELETE":
  //     return await locationController.deleteLocation(payload._id as string);
  //   default:
  //     return {
  //       status: "error",
  //       message: "Action not allowed!",
  //       code: 401,
  //     };
  // }
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") as string) || 1;
  const searchTerm = (url.searchParams.get("searchTerm") as string) || "";
  const limit = parseInt(url.searchParams.get("limit") as string) || 10;

  const packageCTR = new PackageController(request);

  return await packageCTR.getPackages({
    page,
    searchTerm,
    limit,
  });
};
