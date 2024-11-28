import { ActionFunction, LoaderFunction } from 'react-router';
import DestinationController from '~/controllers/DestinationController';

export const action: ActionFunction = async ({ request }) => {
  return {
    status: 'error',
    message: 'Action not allowed!',
    code: 401,
  };
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { id } = params;
  const destinationCTR = new DestinationController(request);
  return await destinationCTR.getDestination(id as string);
};
