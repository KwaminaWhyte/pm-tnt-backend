import jwt from "jsonwebtoken";

const getUserId = (request: Request) => {
  const bearerToken = request.headers.get("Authorization") as string;

  if (!bearerToken) {
    return {
      status: "error",
      message: "You are not authorized to perform this action",
      code: 401,
    };
  }

  const token = bearerToken.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
  const userId = decoded?._id;

  return userId || "";
};

export default getUserId;
