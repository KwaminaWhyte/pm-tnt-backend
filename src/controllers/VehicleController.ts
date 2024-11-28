import Joi from 'joi';
import { redirect } from 'react-router';
import Vehicle from '~/models/Vehicle';
import { commitFlashSession, getFlashSession } from '~/utils/flash-session';
import { ApiResponse, createResponse } from '~/utils/responseHelper';
import { VehicleInterface } from '~/utils/types';

export default class VehicleController {
  private request: Request;
  private path: string;

  constructor(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    this.request = request;
    this.path = path;
  }

  private isApiRequest(): boolean {
    return this.path.startsWith('/api/');
  }

  /**
   * Retrieve all vehicles with pagination and filtering
   */
  public async getVehicles({
    page,
    searchTerm,
    limit = 10,
    isAvailable,
    priceRange,
  }: {
    page: number;
    searchTerm?: string;
    limit?: number;
    isAvailable?: boolean;
    priceRange?: { min: number; max: number };
  }): Promise<
    ApiResponse<{ vehicles: VehicleInterface[]; totalPages: number }>
  > {
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
          { vehicleType: buildRegex(searchTerm) },
          { make: buildRegex(searchTerm) },
          { model: buildRegex(searchTerm) },
        ];
      }

      if (isAvailable !== undefined) {
        searchFilter['availability.isAvailable'] = isAvailable;
      }

      if (priceRange) {
        searchFilter.pricePerDay = {
          $gte: priceRange.min,
          $lte: priceRange.max,
        };
      }

      const [vehicles, totalVehiclesCount] = await Promise.all([
        Vehicle.find(searchFilter)
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        Vehicle.countDocuments(searchFilter).exec(),
      ]);

      const totalPages = Math.ceil(totalVehiclesCount / limit);
      return createResponse(true, 200, 'Vehicles retrieved successfully', {
        vehicles,
        totalPages,
      });
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      return createResponse(false, 500, 'Error fetching vehicles', undefined, [
        {
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      ]);
    }
  }

  /**
   * Retrieve a single vehicle by ID
   */
  public async getVehicle(id: string): Promise<ApiResponse<VehicleInterface>> {
    try {
      const vehicle = await Vehicle.findById(id);

      if (!vehicle) {
        return createResponse(false, 404, 'Vehicle not found');
      }

      return createResponse(
        true,
        200,
        'Vehicle retrieved successfully',
        vehicle,
      );
    } catch (error) {
      console.error('Error retrieving vehicle:', error);
      return createResponse(false, 500, 'Error fetching vehicle', undefined, [
        {
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      ]);
    }
  }

  /**
   * Create a new vehicle
   */
  public async createVehicle(vehicleData: Partial<VehicleInterface>) {
    const session = await getFlashSession(this.request.headers.get('Cookie'));

    const schema = Joi.object({
      vehicleType: Joi.string().required().label('Vehicle Type'),
      make: Joi.string().required().label('Make'),
      model: Joi.string().required().label('Model'),
      year: Joi.number()
        .integer()
        .min(1900)
        .max(new Date().getFullYear())
        .label('Year'),
      features: Joi.array().items(Joi.string()).label('Features'),
      capacity: Joi.number().integer().min(1).required().label('Capacity'),
      pricePerDay: Joi.number().positive().required().label('Price Per Day'),
      // availability: Joi.object({
      //   isAvailable: Joi.boolean().default(true).label('Availability Status'),
      //   location: Joi.object({
      //     city: Joi.string().required().label('City'),
      //     country: Joi.string().required().label('Country'),
      //   }).required(),
      // }).required(),
      images: Joi.array().items(Joi.string().uri()).label('Images'),
      policies: Joi.string().max(2000).label('Policies'),
    });

    try {
      const { error, value } = schema.validate(vehicleData, {
        abortEarly: false,
      });

      if (error) {
        console.log(error.details);

        return createResponse(
          false,
          400,
          'Validation failed',
          undefined,
          error.details.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        );
      }

      const vehicle = new Vehicle({
        ...value,
        availability: {
          isAvailable: true,
          location: {
            city: 'Winneba',
            country: 'Ghana',
          },
        },
      });
      const savedVehicle = await vehicle.save();
      session.flash('message', {
        title: 'Vehicle created successfully',
        status: 'success',
      });

      return redirect('/console/services/vehicles', {
        headers: {
          'Set-Cookie': await commitFlashSession(session),
        },
      });
      // return createResponse(
      //   true,
      //   201,
      //   'Vehicle created successfully',
      //   savedVehicle,
      // );
    } catch (error) {
      console.error('Error creating vehicle:', error);

      session.flash('message', {
        title: 'Error creating vehicle',
        status: 'error',
      });
      return redirect('/console/services/vehicles', {
        headers: {
          'Set-Cookie': await commitFlashSession(session),
        },
      });
      // return createResponse(false, 500, 'Error creating vehicle', undefined, [
      //   {
      //     message:
      //       error instanceof Error ? error.message : 'Unknown error occurred',
      //   },
      // ]);
    }
  }

  /**
   * Update an existing vehicle
   */
  public async updateVehicle(
    id: string,
    updateData: Partial<VehicleInterface>,
  ): Promise<ApiResponse<VehicleInterface>> {
    const session = await getFlashSession(this.request.headers.get('Cookie'));
    try {
      const schema = Joi.object({
        vehicleType: Joi.string().label('Vehicle Type'),
        make: Joi.string().label('Make'),
        model: Joi.string().label('Model'),
        year: Joi.number()
          .integer()
          .min(1900)
          .max(new Date().getFullYear())
          .label('Year'),
        features: Joi.array().items(Joi.string()).label('Features'),
        capacity: Joi.number().integer().min(1).label('Capacity'),
        pricePerDay: Joi.number().positive().label('Price Per Day'),
        // availability: Joi.object({
        //   isAvailable: Joi.boolean().label('Availability Status'),
        //   location: Joi.object({
        //     city: Joi.string().required().label('City'),
        //     country: Joi.string().required().label('Country'),
        //   }),
        // }),
        images: Joi.array().items(Joi.string().uri()).label('Images'),
        policies: Joi.string().max(2000).label('Policies'),
      });

      const { error, value } = schema.validate(updateData, {
        abortEarly: false,
      });

      if (error) {
        session.flash('message', {
          title: 'Validation failed',
          status: 'error',
        });
        return redirect('/console/services/vehicles', {
          headers: {
            'Set-Cookie': await commitFlashSession(session),
          },
        });
        // return createResponse(
        //   false,
        //   400,
        //   'Validation failed',
        //   undefined,
        //   error.details.map((err) => ({
        //     field: err.path.join('.'),
        //     message: err.message,
        //   })),
        // );
      }

      const updated = await Vehicle.findByIdAndUpdate(
        id,
        { $set: value },
        { new: true, runValidators: true },
      );

      if (!updated) {
        return createResponse(false, 404, 'Vehicle not found');
      }

      return createResponse(true, 200, 'Vehicle updated successfully', updated);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      return createResponse(false, 500, 'Error updating vehicle', undefined, [
        {
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      ]);
    }
  }

  /**
   * Delete a vehicle
   */
  public async deleteVehicle(id: string) {
    const session = await getFlashSession(this.request.headers.get('Cookie'));
    try {
      const deleted = await Vehicle.findByIdAndDelete(id);

      if (!deleted) {
        return createResponse(false, 404, 'Vehicle not found');
      }

      session.flash('message', {
        title: 'Vehicle deleted successfully',
        status: 'success',
      });
      return redirect('/console/services/vehicles', {
        headers: {
          'Set-Cookie': await commitFlashSession(session),
        },
      });

      // return createResponse(true, 200, 'Vehicle deleted successfully');
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      session.flash('message', {
        title: 'Error deleting vehicle',
        status: 'error',
      });
      return redirect('/console/services/vehicles', {
        headers: {
          'Set-Cookie': await commitFlashSession(session),
        },
      });

      // return createResponse(false, 500, 'Error deleting vehicle', undefined, [
      //   {
      //     message:
      //       error instanceof Error ? error.message : 'Unknown error occurred',
      //   },
      // ]);
    }
  }
}
