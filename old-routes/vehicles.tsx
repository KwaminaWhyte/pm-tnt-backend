import { ActionFunction, LoaderFunction } from 'react-router';
import VehicleController from '~/controllers/VehicleController';

export const action: ActionFunction = async ({ request }) => {
  // const payload = await request.json();
  // const hotelCTRL = new HotelController(request);
  // const userId = getUserId(request);

  return {
    status: 'error',
    message: 'Action not allowed!',
    code: 401,
  };
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') as string) || 1;
  const searchTerm = (url.searchParams.get('searchTerm') as string) || '';
  const limit = parseInt(url.searchParams.get('limit') as string) || 10;

  const vehicleCTR = new VehicleController(request);

  return await vehicleCTR.getVehicles({
    page,
    searchTerm,
    limit,
  });
};
