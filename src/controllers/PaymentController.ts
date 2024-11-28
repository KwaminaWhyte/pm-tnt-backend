import Payment from '~/models/Payment';
import type { PaymentInterface } from '../utils/types';
import { createResponse, ApiResponse } from '~/utils/responseHelper';
import Joi from 'joi';
import UserController from './UserController';

export default class PaymentController {
  private request: Request;
  private path: string;

  constructor(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    this.request = request;
    this.path = path;
  }

  /**
   * Retrieve all payments with pagination and filtering
   */
  public async getPayments({
    page,
    searchTerm,
    limit = 10,
  }: {
    page: number;
    searchTerm?: string;
    limit?: number;
  }): Promise<ApiResponse<{ payments: PaymentInterface[]; totalPages: number }>> {
    try {
      const skipCount = (page - 1) * limit;

      const searchFilter: Record<string, any> = {};
      if (searchTerm) {
        searchFilter.$or = [
          {
            invoiceId: {
              $regex: new RegExp(
                searchTerm
                  .split(' ')
                  .map((term) => `(?=.*${term})`)
                  .join(''),
                'i',
              ),
            },
          },
          {
            checkoutId: {
              $regex: new RegExp(
                searchTerm
                  .split(' ')
                  .map((term) => `(?=.*${term})`)
                  .join(''),
                'i',
              ),
            },
          },
        ];
      }

      const [payments, totalPaymentsCount] = await Promise.all([
        Payment.find(searchFilter)
          .skip(skipCount)
          .limit(limit)
          .populate('user')
          .sort({ createdAt: -1 })
          .exec(),
        Payment.countDocuments(searchFilter).exec(),
      ]);

      const totalPages = Math.ceil(totalPaymentsCount / limit);
      return createResponse(true, 200, 'Payments retrieved successfully', { payments, totalPages });
    } catch (error) {
      console.error('Error fetching payments:', error);
      return createResponse(false, 500, 'Error fetching payments', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Retrieve payments for the current user
   */
  public async getUserPayments({
    page,
    searchTerm,
    limit = 10,
  }: {
    page: number;
    searchTerm?: string;
    limit?: number;
  }): Promise<ApiResponse<{ payments: PaymentInterface[]; totalPages: number }>> {
    try {
      const userController = new UserController(this.request);
      const userId = userController.getUserId();

      const skipCount = (page - 1) * limit;
      const searchFilter: Record<string, any> = { user: userId };

      if (searchTerm) {
        searchFilter.$or = [
          {
            invoiceId: {
              $regex: new RegExp(
                searchTerm
                  .split(' ')
                  .map((term) => `(?=.*${term})`)
                  .join(''),
                'i',
              ),
            },
          },
          {
            checkoutId: {
              $regex: new RegExp(
                searchTerm
                  .split(' ')
                  .map((term) => `(?=.*${term})`)
                  .join(''),
                'i',
              ),
            },
          },
        ];
      }

      const [payments, totalPaymentsCount] = await Promise.all([
        Payment.find(searchFilter)
          .skip(skipCount)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        Payment.countDocuments(searchFilter).exec(),
      ]);

      const totalPages = Math.ceil(totalPaymentsCount / limit);
      return createResponse(true, 200, 'Your payments retrieved successfully', { payments, totalPages });
    } catch (error) {
      console.error('Error fetching user payments:', error);
      return createResponse(false, 500, 'Error fetching your payments', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Retrieve a single payment by ID
   */
  public async getPayment(id: string): Promise<ApiResponse<PaymentInterface>> {
    try {
      const payment = await Payment.findById(id).populate('user');

      if (!payment) {
        return createResponse(false, 404, 'Payment not found');
      }

      return createResponse(true, 200, 'Payment retrieved successfully', payment);
    } catch (error) {
      console.error('Error retrieving payment:', error);
      return createResponse(false, 500, 'Error fetching payment', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Initialize a new payment
   */
  public async initializePayment(paymentData: {
    amount: number;
    phone: string;
    invoiceId: string;
    userId: string;
  }): Promise<ApiResponse<PaymentInterface>> {
    const schema = Joi.object({
      amount: Joi.number().positive().required().label('Amount'),
      phone: Joi.string().required().label('Phone Number'),
      invoiceId: Joi.string().required().label('Invoice ID'),
      userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().label('User ID'),
    });

    try {
      const { error, value } = schema.validate(paymentData, { abortEarly: false });

      if (error) {
        return createResponse(false, 400, 'Validation failed', undefined,
          error.details.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }

      const payment = await Payment.create({
        invoiceId: value.invoiceId,
        amount: value.amount,
        user: value.userId,
        phoneNumber: value.phone,
        status: 'new',
      });

      return createResponse(true, 201, 'Payment initialized successfully', payment);
    } catch (error) {
      console.error('Error initializing payment:', error);
      return createResponse(false, 500, 'Error initializing payment', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Process a payment
   */
  public async processPayment(paymentId: string, checkoutData: {
    checkoutId: string;
    cardNumber?: string;
    paymentChannel: string;
    totalAmountCharged: number;
  }): Promise<ApiResponse<PaymentInterface>> {
    const schema = Joi.object({
      checkoutId: Joi.string().required().label('Checkout ID'),
      cardNumber: Joi.string().label('Card Number'),
      paymentChannel: Joi.string().required().label('Payment Channel'),
      totalAmountCharged: Joi.number().positive().required().label('Total Amount Charged'),
    });

    try {
      const { error, value } = schema.validate(checkoutData, { abortEarly: false });

      if (error) {
        return createResponse(false, 400, 'Validation failed', undefined,
          error.details.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }

      const payment = await Payment.findById(paymentId);

      if (!payment) {
        return createResponse(false, 404, 'Payment not found');
      }

      if (payment.status === 'paid') {
        return createResponse(false, 400, 'Payment has already been processed');
      }

      const updated = await Payment.findByIdAndUpdate(
        paymentId,
        {
          $set: {
            checkoutId: value.checkoutId,
            cardNumber: value.cardNumber,
            paymentChannel: value.paymentChannel,
            totalAmountCharged: value.totalAmountCharged,
            status: 'paid',
            credited: true,
          },
        },
        { new: true, runValidators: true }
      );

      return createResponse(true, 200, 'Payment processed successfully', updated);
    } catch (error) {
      console.error('Error processing payment:', error);
      return createResponse(false, 500, 'Error processing payment', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }

  /**
   * Cancel a payment
   */
  public async cancelPayment(id: string): Promise<ApiResponse<void>> {
    try {
      const payment = await Payment.findById(id);
      
      if (!payment) {
        return createResponse(false, 404, 'Payment not found');
      }

      if (payment.status === 'paid') {
        return createResponse(false, 400, 'Cannot cancel a completed payment');
      }

      if (payment.status === 'cancelled') {
        return createResponse(false, 400, 'Payment is already cancelled');
      }

      await Payment.findByIdAndUpdate(id, {
        $set: { status: 'cancelled' }
      });

      return createResponse(true, 200, 'Payment cancelled successfully');
    } catch (error) {
      console.error('Error cancelling payment:', error);
      return createResponse(false, 500, 'Error cancelling payment', undefined, [
        { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      ]);
    }
  }
}
