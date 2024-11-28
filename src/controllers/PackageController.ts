import Package from '~/models/Package';
import { PackageInterface } from '~/utils/types';
import { createResponse, ApiResponse } from '~/utils/responseHelper';
import Joi from 'joi';

export default class PackageController {
  private request: Request;
  private path: string;

  constructor(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    this.request = request;
    this.path = path;
  }

  /**
   * Retrieve all packages with pagination and filtering
   */
  public async getPackages({
    page,
    searchTerm,
    limit = 10,
  }: {
    page: number;
    searchTerm?: string;
    limit?: number;
  }): Promise<ApiResponse<{ packages: PackageInterface[]; totalPages: number }>> {
    try {
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
          { description: buildRegex(searchTerm) },
        ];
      }

      const [packages, totalPackagesCount] = await Promise.all([
        Package.find(searchFilter)
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        Package.countDocuments(searchFilter).exec(),
      ]);

      const totalPages = Math.ceil(totalPackagesCount / limit);
      return createResponse(true, 200, 'Packages retrieved successfully', { packages, totalPages });
    } catch (error) {
      console.error('Error fetching packages:', error);
      return createResponse(false, 500, 'Error fetching packages', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Retrieve a single package by ID
   */
  public async getPackage(id: string): Promise<ApiResponse<PackageInterface>> {
    try {
      const packageItem = await Package.findById(id);

      if (!packageItem) {
        return createResponse(false, 404, 'Package not found');
      }

      return createResponse(true, 200, 'Package retrieved successfully', packageItem);
    } catch (error) {
      console.error('Error retrieving package:', error);
      return createResponse(false, 500, 'Error fetching package', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Create a new package
   */
  public async createPackage(packageData: Partial<PackageInterface>): Promise<ApiResponse<PackageInterface>> {
    const schema = Joi.object({
      name: Joi.string().required().label('Name'),
      price: Joi.number().positive().required().label('Price'),
      description: Joi.string().label('Description'),
      images: Joi.array().items(Joi.string().uri()).label('Images'),
      videos: Joi.array().items(Joi.string().uri()).label('Videos'),
      duration: Joi.object({
        days: Joi.number().integer().min(1).required().label('Days'),
        nights: Joi.number().integer().min(0).required().label('Nights'),
      }).required().label('Duration'),
      accommodations: Joi.array().items(Joi.string()).min(1).required().label('Accommodations'),
      transportation: Joi.string().valid('Flight', 'Train', 'Bus', 'Private Car', 'None').required().label('Transportation'),
      activities: Joi.array().items(Joi.string()).label('Activities'),
      itinerary: Joi.array().items(
        Joi.object({
          day: Joi.number().integer().min(1).required(),
          title: Joi.string().required(),
          description: Joi.string().required(),
          activities: Joi.array().items(Joi.string()),
        })
      ).label('Itinerary'),
    });

    try {
      const { error, value } = schema.validate(packageData, { abortEarly: false });

      if (error) {
        return createResponse(false, 400, 'Validation failed', undefined,
          error.details.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }

      const existingPackage = await Package.findOne({ name: value.name });

      if (existingPackage) {
        return createResponse(false, 400, 'Package already exists', undefined, [
          { field: 'name', message: 'A package with this name already exists' },
        ]);
      }

      const packageItem = new Package(value);
      const savedPackage = await packageItem.save();

      return createResponse(true, 201, 'Package created successfully', savedPackage);
    } catch (error) {
      console.error('Error creating package:', error);
      return createResponse(false, 500, 'Error creating package', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Update an existing package
   */
  public async updatePackage(
    id: string,
    updateData: Partial<PackageInterface>
  ): Promise<ApiResponse<PackageInterface>> {
    try {
      const schema = Joi.object({
        name: Joi.string().label('Name'),
        price: Joi.number().positive().label('Price'),
        description: Joi.string().label('Description'),
        images: Joi.array().items(Joi.string().uri()).label('Images'),
        videos: Joi.array().items(Joi.string().uri()).label('Videos'),
        duration: Joi.object({
          days: Joi.number().integer().min(1).label('Days'),
          nights: Joi.number().integer().min(0).label('Nights'),
        }).label('Duration'),
        accommodations: Joi.array().items(Joi.string()).min(1).label('Accommodations'),
        transportation: Joi.string().valid('Flight', 'Train', 'Bus', 'Private Car', 'None').label('Transportation'),
        activities: Joi.array().items(Joi.string()).label('Activities'),
        itinerary: Joi.array().items(
          Joi.object({
            day: Joi.number().integer().min(1).required(),
            title: Joi.string().required(),
            description: Joi.string().required(),
            activities: Joi.array().items(Joi.string()),
          })
        ).label('Itinerary'),
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
        const existingPackage = await Package.findOne({
          name: value.name,
          _id: { $ne: id },
        });

        if (existingPackage) {
          return createResponse(false, 400, 'Package already exists', undefined, [
            { field: 'name', message: 'A package with this name already exists' },
          ]);
        }
      }

      const updated = await Package.findByIdAndUpdate(
        id,
        { $set: value },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return createResponse(false, 404, 'Package not found');
      }

      return createResponse(true, 200, 'Package updated successfully', updated);
    } catch (error) {
      console.error('Error updating package:', error);
      return createResponse(false, 500, 'Error updating package', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Delete a package
   */
  public async deletePackage(id: string): Promise<ApiResponse<void>> {
    try {
      const deleted = await Package.findByIdAndDelete(id);
      
      if (!deleted) {
        return createResponse(false, 404, 'Package not found');
      }

      return createResponse(true, 200, 'Package deleted successfully');
    } catch (error) {
      console.error('Error deleting package:', error);
      return createResponse(false, 500, 'Error deleting package', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }
}
