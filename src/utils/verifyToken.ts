import jwt from "jsonwebtoken";

const verifyToken = async (request: Request) => {
  try {
    const bearerToken = request.headers.get("Authorization") as string;
    const decoded = jwt.verify(
      bearerToken.split(" ")[1],
      process.env.JWT_SECRET as string
    );
    const userId = decoded?._id;

    if (!userId) {
      return {
        status: "error",
        message: "Unauthorized access",
      };
    }

    return true;
  } catch (error) {
    return {
      status: "error",
      code: 400,
      message:
        error?.message == "jwt expired" ? "Token Expired!" : "Invalid Token",
    };
  }
};

export default verifyToken;
