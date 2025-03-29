import { ApiResponse, error } from "~/utils/apiResponse";
import Notification from "../models/Notification";

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
}

export default class NotificationController {
  /**
   * Create a new notification
   */
  public async createNotification(
    data: NotificationData
  ): Promise<ApiResponse<any>> {
    try {
      const notification = new Notification(data);
      await notification.save();

      return {
        success: true,
        data: notification,
      };
    } catch (err) {
      console.error("Error creating notification:", err);
      return error(500, {
        message: "Error creating notification",
        error: err,
      });
    }
  }

  /**
   * Get notifications for a user
   */
  public async getUserNotifications(userId: string): Promise<ApiResponse<any>> {
    try {
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .lean();

      return {
        success: true,
        data: notifications,
      };
    } catch (err) {
      console.error("Error fetching notifications:", err);
      return error(500, {
        message: "Error fetching notifications",
        error: err,
      });
    }
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<ApiResponse<any>> {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true },
        { new: true }
      );

      if (!notification) {
        return error(404, { message: "Notification not found" });
      }

      return {
        success: true,
        data: notification,
      };
    } catch (err) {
      console.error("Error marking notification as read:", err);
      return error(500, {
        message: "Error marking notification as read",
        error: err,
      });
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  public async markAllAsRead(userId: string): Promise<ApiResponse<any>> {
    try {
      const result = await Notification.updateMany(
        { userId, read: false },
        { read: true }
      );

      return {
        success: true,
        data: {
          modifiedCount: result.modifiedCount,
          message: "All notifications marked as read",
        },
      };
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      return error(500, {
        message: "Error marking all notifications as read",
        error: err,
      });
    }
  }

  /**
   * Create a booking confirmation notification
   */
  public async createBookingConfirmation(
    userId: string,
    bookingDetails: { name: string; type: string; reference: string }
  ): Promise<void> {
    try {
      const notificationData: NotificationData = {
        userId,
        type: "booking_confirmed",
        title: "Booking Confirmed",
        message: `Your booking for ${bookingDetails.name} has been confirmed. Reference: ${bookingDetails.reference}`,
      };

      await this.createNotification(notificationData);
    } catch (error) {
      console.error("Error creating booking confirmation notification:", error);
    }
  }

  /**
   * Create a payment success notification
   */
  public async createPaymentNotification(
    userId: string,
    paymentDetails: any
  ): Promise<void> {
    try {
      const notificationData: NotificationData = {
        userId,
        type: "payment_success",
        title: "Payment Successful",
        message: `Your payment of $${paymentDetails.amount} was successful.`,
      };

      await this.createNotification(notificationData);
    } catch (error) {
      console.error("Error creating payment notification:", error);
    }
  }
}
