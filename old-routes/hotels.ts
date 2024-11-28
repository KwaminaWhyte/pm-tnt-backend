import { ActionFunction, LoaderFunction } from 'react-router';
import HotelController from '~/controllers/HotelController';

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

  const packageCTR = new HotelController(request);

  return await packageCTR.getHotels({
    page,
    searchTerm,
    limit,
  });
};
