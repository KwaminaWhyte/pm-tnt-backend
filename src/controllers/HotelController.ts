import Hotel from '~/models/Hotel';
import { HotelInterface } from '~/utils/types';
import { createResponse, ApiResponse } from '~/utils/responseHelper';
import Joi from 'joi';

export default class HotelController {
  private request: Request;
  private path: string;

  constructor(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    this.request = request;
    this.path = path;
  }

  /**
   * Retrieve all hotels with pagination and filtering
   */
  public async getHotels({
    page,
    searchTerm,
    limit = 10,
  }: {
    page: number;
    searchTerm?: string;
    limit?: number;
  }): Promise<ApiResponse<{ hotels: HotelInterface[]; totalPages: number }>> {
    try {
      const skipCount = (page - 1) * limit;
      const buildRegex = (term: string): RegExp =>
        new RegExp(
          term
            .split(' ')
            .map((word) => `(?=.*${word})`)
            .join(''),
          'i',
        );

      const searchFilter: Record<string, any> = {};
      if (searchTerm) {
        searchFilter.$or = [
          { name: buildRegex(searchTerm) },
          { 'location.city': buildRegex(searchTerm) },
          { 'location.country': buildRegex(searchTerm) },
        ];
      }

      const [hotels, totalHotelsCount] = await Promise.all([
        Hotel.find(searchFilter)
          .skip(skipCount)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        Hotel.countDocuments(searchFilter).exec(),
      ]);

      const totalPages = Math.ceil(totalHotelsCount / limit);
      return createResponse(true, 200, 'Hotels retrieved successfully', { hotels, totalPages });
    } catch (error) {
      console.error('Error fetching hotels:', error);
      return createResponse(false, 500, 'Error fetching hotels', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Retrieve a single hotel by ID
   */
  public async getHotel(id: string): Promise<ApiResponse<HotelInterface>> {
    try {
      const hotel = await Hotel.findById(id);

      if (!hotel) {
        return createResponse(false, 404, 'Hotel not found');
      }

      return createResponse(true, 200, 'Hotel retrieved successfully', hotel);
    } catch (error) {
      console.error('Error retrieving hotel:', error);
      return createResponse(false, 500, 'Error fetching hotel', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Create a new hotel
   */
  public async createHotel(hotelData: Partial<HotelInterface>): Promise<ApiResponse<HotelInterface>> {
    const schema = Joi.object({
      name: Joi.string().required().label('Hotel Name'),
      location: Joi.object({
        address: Joi.string().required().label('Address'),
        city: Joi.string().required().label('City'),
        country: Joi.string().required().label('Country'),
        coordinates: Joi.object({
          latitude: Joi.number().required().label('Latitude'),
          longitude: Joi.number().required().label('Longitude'),
        }).required().label('Coordinates'),
      }).required().label('Location'),
      description: Joi.string().label('Description'),
      amenities: Joi.array().items(Joi.string()).label('Amenities'),
      rooms: Joi.array().items(Joi.object({
        roomType: Joi.string().required().label('Room Type'),
        pricePerNight: Joi.number().positive().required().label('Price Per Night'),
        capacity: Joi.number().integer().positive().required().label('Capacity'),
        features: Joi.array().items(Joi.string()).label('Features'),
        isAvailable: Joi.boolean().default(true).label('Availability'),
      })).label('Rooms'),
      images: Joi.array().items(Joi.string().uri()).label('Images'),
      policies: Joi.string().label('Policies'),
    });

    try {
      const { error, value } = schema.validate(hotelData, { abortEarly: false });

      if (error) {
        return createResponse(false, 400, 'Validation failed', undefined,
          error.details.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }

      const existingHotel = await Hotel.findOne({ 
        name: value.name,
        'location.address': value.location.address 
      });

      if (existingHotel) {
        return createResponse(false, 400, 'Hotel already exists', undefined, [
          { field: 'name', message: 'A hotel with this name and address already exists' },
        ]);
      }

      const hotel = new Hotel(value);
      const savedHotel = await hotel.save();

      return createResponse(true, 201, 'Hotel created successfully', savedHotel);
    } catch (error) {
      console.error('Error creating hotel:', error);
      return createResponse(false, 500, 'Error creating hotel', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Update an existing hotel
   */
  public async updateHotel(
    id: string,
    updateData: Partial<HotelInterface>
  ): Promise<ApiResponse<HotelInterface>> {
    try {
      const schema = Joi.object({
        name: Joi.string().label('Hotel Name'),
        location: Joi.object({
          address: Joi.string().label('Address'),
          city: Joi.string().label('City'),
          country: Joi.string().label('Country'),
          coordinates: Joi.object({
            latitude: Joi.number().label('Latitude'),
            longitude: Joi.number().label('Longitude'),
          }).label('Coordinates'),
        }).label('Location'),
        description: Joi.string().label('Description'),
        amenities: Joi.array().items(Joi.string()).label('Amenities'),
        rooms: Joi.array().items(Joi.object({
          roomType: Joi.string().required().label('Room Type'),
          pricePerNight: Joi.number().positive().required().label('Price Per Night'),
          capacity: Joi.number().integer().positive().required().label('Capacity'),
          features: Joi.array().items(Joi.string()).label('Features'),
          isAvailable: Joi.boolean().label('Availability'),
        })).label('Rooms'),
        images: Joi.array().items(Joi.string().uri()).label('Images'),
        policies: Joi.string().label('Policies'),
      });

      const { error, value } = schema.validate(updateData, { abortEarly: false });

      if (error) {
        return createResponse(false, 400, 'Validation failed', undefined,
          error.details.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }

      if (value.name) {
        const existingHotel = await Hotel.findOne({
          name: value.name,
          'location.address': value.location?.address,
          _id: { $ne: id },
        });

        if (existingHotel) {
          return createResponse(false, 400, 'Hotel already exists', undefined, [
            { field: 'name', message: 'A hotel with this name and address already exists' },
          ]);
        }
      }

      const updated = await Hotel.findByIdAndUpdate(
        id,
        { $set: value },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return createResponse(false, 404, 'Hotel not found');
      }

      return createResponse(true, 200, 'Hotel updated successfully', updated);
    } catch (error) {
      console.error('Error updating hotel:', error);
      return createResponse(false, 500, 'Error updating hotel', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Delete a hotel
   */
  public async deleteHotel(id: string): Promise<ApiResponse<void>> {
    try {
      const deleted = await Hotel.findByIdAndDelete(id);
      
      if (!deleted) {
        return createResponse(false, 404, 'Hotel not found');
      }

      return createResponse(true, 200, 'Hotel deleted successfully');
    } catch (error) {
      console.error('Error deleting hotel:', error);
      return createResponse(false, 500, 'Error deleting hotel', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }
}
