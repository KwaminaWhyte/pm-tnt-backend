import { Types } from "mongoose";
import Favorite from "~/models/Favorite";
import Hotel from "~/models/Hotel";
import Vehicle from "~/models/Vehicle";
import Package from "~/models/Package";
import Destination from "~/models/Destination";

export default class FavoriteController {
  async toggleFavorite(
    itemId: string,
    itemType: "hotel" | "vehicle" | "package" | "destination",
    userId: string
  ) {
    // Validate userId
    if (!userId) {
      console.error("userId is null or undefined");
      throw new Error("User authentication required");
    }

    // Validate that the item exists based on type
    try {
      const model = this.getModelByType(itemType);
      const item = await model?.findById(itemId);
      if (!item) {
        console.error(`${itemType} not found`);
        throw new Error(`${itemType} not found`);
      }

      const existingFavorite = await Favorite.findOne({
        user: userId, // Use 'user' field consistently
        itemId,
        itemType,
      });

      if (existingFavorite) {
        await Favorite.deleteOne({ _id: existingFavorite._id });
        return { isFavorite: false };
      } else {
        await Favorite.create({ user: userId, itemId, itemType });
        return { isFavorite: true };
      }
    } catch (error) {
      console.error("Error in toggleFavorite:", error);
      throw new Error("Failed to toggle favorite");
    }
  }

  async getUserFavorites(
    userId: string,
    itemType?: "hotel" | "vehicle" | "package" | "destination"
  ) {
    // Validate userId
    if (!userId) {
      console.error("userId is null or undefined");
      throw new Error("User authentication required");
    }

    const query = { user: userId }; // Use 'user' field consistently
    if (itemType) {
      Object.assign(query, { itemType });
    }

    const favorites = await Favorite.find(query).sort({ createdAt: -1 });

    // Group favorites by type and populate items
    const result = {
      hotels: [] as any[],
      vehicles: [] as any[],
      packages: [] as any[],
      destinations: [] as any[],
    };

    // Process each type separately to handle population
    const hotelFavorites = favorites.filter((f) => f.itemType === "hotel");
    if (hotelFavorites.length) {
      const hotelIds = hotelFavorites.map((f) => f.itemId);
      const hotels = await Hotel.find({ _id: { $in: hotelIds } });
      result.hotels = hotels.map((hotel) => ({
        ...hotel.toObject(),
        favoriteId: hotelFavorites.find((f) => f.itemId.equals(hotel._id))?._id,
      }));
    }

    const vehicleFavorites = favorites.filter((f) => f.itemType === "vehicle");
    if (vehicleFavorites.length) {
      const vehicleIds = vehicleFavorites.map((f) => f.itemId);
      const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } });
      result.vehicles = vehicles.map((vehicle) => ({
        ...vehicle.toObject(),
        favoriteId: vehicleFavorites.find((f) => f.itemId.equals(vehicle._id))
          ?._id,
      }));
    }

    const packageFavorites = favorites.filter((f) => f.itemType === "package");
    if (packageFavorites.length) {
      const packageIds = packageFavorites.map((f) => f.itemId);
      const packages = await Package.find({ _id: { $in: packageIds } });
      result.packages = packages.map((pkg) => ({
        ...pkg.toObject(),
        favoriteId: packageFavorites.find((f) => f.itemId.equals(pkg._id))?._id,
      }));
    }

    const destinationFavorites = favorites.filter(
      (f) => f.itemType === "destination"
    );
    if (destinationFavorites.length) {
      const destinationIds = destinationFavorites.map((f) => f.itemId);
      const destinations = await Destination.find({
        _id: { $in: destinationIds },
      });
      result.destinations = destinations.map((destination) => ({
        ...destination.toObject(),
        favoriteId: destinationFavorites.find((f) =>
          f.itemId.equals(destination._id)
        )?._id,
      }));
    }

    return result;
  }

  async isFavorited(
    userId: string,
    itemId: string,
    itemType: "hotel" | "vehicle" | "package" | "destination"
  ) {
    // Validate userId
    if (!userId) {
      console.error("userId is null or undefined");
      throw new Error("User authentication required");
    }

    const favorite = await Favorite.findOne({
      user: userId, // Use 'user' field consistently
      itemId,
      itemType,
    });

    return { isFavorite: !!favorite };
  }

  private getModelByType(itemType: string) {
    switch (itemType) {
      case "hotel":
        return Hotel;
      case "vehicle":
        return Vehicle;
      case "package":
        return Package;
      case "destination":
        return Destination;
      default:
        throw new Error("Invalid item type");
    }
  }
}
