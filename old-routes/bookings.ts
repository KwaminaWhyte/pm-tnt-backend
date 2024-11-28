import { ActionFunction, LoaderFunction } from 'react-router';
import BookingController from '~/controllers/BookingController';
import getUserId from '~/utils/getUserId';

export const action: ActionFunction = async ({ request }) => {
  const payload = await request.json();
  const bookingCTRL = new BookingController(request);
  const userId = getUserId(request);

  switch (request.method) {
    case 'POST':
      return await bookingCTRL.createBooking({
        travelPackage: payload.travelPackage as string,
        hotel: payload.hotel as string,
        vehicle: payload.vehicle as string,
        bookingDate: payload.bookingDate as string,
        startDate: payload.startDate as string,
        endDate: payload.endDate as string,
      });
    case 'PUT':
      return await bookingCTRL.updateBooking(payload._id as string, {
        travelPackage: payload.travelPackage as string,
        hotel: payload.hotel as string,
        vehicle: payload.vehicle as string,
        bookingDate: payload.bookingDate as string,
        startDate: payload.startDate as string,
        endDate: payload.endDate as string,
      });
    case 'DELETE':
      return await bookingCTRL.cancelBooking(payload._id as string);
    default:
      return {
        status: 'error',
        message: 'Action not allowed!',
        code: 401,
      };
  }
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') as string) || 1;
  const searchTerm = (url.searchParams.get('searchTerm') as string) || '';
  const limit = parseInt(url.searchParams.get('limit') as string) || 10;

  const packageCTR = new BookingController(request);

  return await packageCTR.getMyBookings({
    page,
    searchTerm,
    limit,
  });
};
