import { Request, Response } from "express";
import mongoose from "mongoose";
import PackageTemplate from "../models/PackageTemplate";
import Package from "../models/Package";
import { successResponse, errorResponse } from "../utils/responses";
import logger from "../utils/logger";

class PackageTemplateController {
  // Create a new package template
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        errorResponse(res, 401, "User not authenticated");
        return;
      }

      const templateData = {
        ...req.body,
        userId: new mongoose.Types.ObjectId(userId),
      };

      // Validate base package exists
      if (!templateData.basePackageId) {
        errorResponse(res, 400, "Base package ID is required");
        return;
      }

      const basePackage = await Package.findById(templateData.basePackageId);
      if (!basePackage) {
        errorResponse(res, 404, "Base package not found");
        return;
      }

      const newTemplate = new PackageTemplate(templateData);
      await newTemplate.save();

      successResponse(
        res,
        201,
        "Package template created successfully",
        newTemplate
      );
    } catch (error) {
      logger.error("Error creating package template:", error);
      errorResponse(res, 500, "Failed to create package template");
    }
  }

  // Get all package templates for the current user
  public async getAllForUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        errorResponse(res, 401, "User not authenticated");
        return;
      }

      const templates = await PackageTemplate.find({ userId })
        .sort({ updatedAt: -1 })
        .populate("basePackageId", "name images price");

      successResponse(
        res,
        200,
        "User templates retrieved successfully",
        templates
      );
    } catch (error) {
      logger.error("Error fetching user's package templates:", error);
      errorResponse(res, 500, "Failed to fetch package templates");
    }
  }

  // Get template by ID
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const template = await PackageTemplate.findById(id)
        .populate(
          "basePackageId",
          "name images price duration startDates status"
        )
        .populate("resultingPackageId", "name status");

      if (!template) {
        errorResponse(res, 404, "Package template not found");
        return;
      }

      // Check if the template belongs to the user or is public
      if (
        template.userId.toString() !== userId &&
        !template.isPublic &&
        !req.user?.isAdmin
      ) {
        errorResponse(
          res,
          403,
          "You don't have permission to view this template"
        );
        return;
      }

      successResponse(
        res,
        200,
        "Package template retrieved successfully",
        template
      );
    } catch (error) {
      logger.error("Error fetching package template:", error);
      errorResponse(res, 500, "Failed to fetch package template");
    }
  }

  // Update a template
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const template = await PackageTemplate.findById(id);
      if (!template) {
        errorResponse(res, 404, "Package template not found");
        return;
      }

      // Check if the template belongs to the user
      if (template.userId.toString() !== userId && !req.user?.isAdmin) {
        errorResponse(
          res,
          403,
          "You don't have permission to update this template"
        );
        return;
      }

      // Prevent updates to templates in certain states
      if (
        ["Published", "Approved"].includes(template.status) &&
        !req.user?.isAdmin
      ) {
        errorResponse(
          res,
          400,
          `Cannot update a template with status: ${template.status}`
        );
        return;
      }

      // Don't allow changing the basePackageId
      if (
        req.body.basePackageId &&
        template.basePackageId.toString() !== req.body.basePackageId
      ) {
        errorResponse(
          res,
          400,
          "Cannot change the base package of an existing template"
        );
        return;
      }

      // Update the template
      const updatedTemplate = await PackageTemplate.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true, runValidators: true }
      );

      successResponse(
        res,
        200,
        "Package template updated successfully",
        updatedTemplate
      );
    } catch (error) {
      logger.error("Error updating package template:", error);
      errorResponse(res, 500, "Failed to update package template");
    }
  }

  // Delete a template
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const template = await PackageTemplate.findById(id);
      if (!template) {
        errorResponse(res, 404, "Package template not found");
        return;
      }

      // Check if the template belongs to the user
      if (template.userId.toString() !== userId && !req.user?.isAdmin) {
        errorResponse(
          res,
          403,
          "You don't have permission to delete this template"
        );
        return;
      }

      // Prevent deletion if published
      if (template.status === "Published" && !req.user?.isAdmin) {
        errorResponse(res, 400, "Cannot delete a published template");
        return;
      }

      await PackageTemplate.findByIdAndDelete(id);
      successResponse(res, 200, "Package template deleted successfully");
    } catch (error) {
      logger.error("Error deleting package template:", error);
      errorResponse(res, 500, "Failed to delete package template");
    }
  }

  // Submit template for review
  public async submitForReview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const template = await PackageTemplate.findById(id);
      if (!template) {
        errorResponse(res, 404, "Package template not found");
        return;
      }

      // Check if the template belongs to the user
      if (template.userId.toString() !== userId) {
        errorResponse(
          res,
          403,
          "You don't have permission to submit this template for review"
        );
        return;
      }

      // Check if already submitted
      if (["InReview", "Approved", "Published"].includes(template.status)) {
        errorResponse(
          res,
          400,
          `Template is already in ${template.status} status`
        );
        return;
      }

      // Submit for review
      await template.submitForReview();

      successResponse(
        res,
        200,
        "Package template submitted for review successfully",
        template
      );
    } catch (error) {
      logger.error("Error submitting package template for review:", error);
      errorResponse(res, 500, "Failed to submit package template for review");
    }
  }

  // Admin: Approve a template
  public async approveTemplate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.isAdmin) {
        errorResponse(res, 403, "Only administrators can approve templates");
        return;
      }

      const { id } = req.params;
      const { feedback } = req.body;
      const adminId = req.user.id;

      const template = await PackageTemplate.findById(id);
      if (!template) {
        errorResponse(res, 404, "Package template not found");
        return;
      }

      if (template.status !== "InReview") {
        errorResponse(res, 400, "Only templates in review can be approved");
        return;
      }

      await template.approve(adminId, feedback);

      successResponse(
        res,
        200,
        "Package template approved successfully",
        template
      );
    } catch (error) {
      logger.error("Error approving package template:", error);
      errorResponse(res, 500, "Failed to approve package template");
    }
  }

  // Admin: Reject a template
  public async rejectTemplate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.isAdmin) {
        errorResponse(res, 403, "Only administrators can reject templates");
        return;
      }

      const { id } = req.params;
      const { feedback } = req.body;
      const adminId = req.user.id;

      if (!feedback) {
        errorResponse(
          res,
          400,
          "Feedback is required when rejecting a template"
        );
        return;
      }

      const template = await PackageTemplate.findById(id);
      if (!template) {
        errorResponse(res, 404, "Package template not found");
        return;
      }

      if (template.status !== "InReview") {
        errorResponse(res, 400, "Only templates in review can be rejected");
        return;
      }

      await template.reject(adminId, feedback);

      successResponse(
        res,
        200,
        "Package template rejected successfully",
        template
      );
    } catch (error) {
      logger.error("Error rejecting package template:", error);
      errorResponse(res, 500, "Failed to reject package template");
    }
  }

  // Admin: Publish a template as a package
  public async publishAsPackage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.isAdmin) {
        errorResponse(
          res,
          403,
          "Only administrators can publish templates as packages"
        );
        return;
      }

      const { id } = req.params;
      const adminId = req.user.id;

      const template = await PackageTemplate.findById(id);
      if (!template) {
        errorResponse(res, 404, "Package template not found");
        return;
      }

      if (template.status !== "Approved") {
        errorResponse(res, 400, "Only approved templates can be published");
        return;
      }

      // Create a new package from the template
      const newPackage = await template.publishAsPackage(adminId);

      successResponse(res, 200, "Template published as package successfully", {
        template,
        package: newPackage,
      });
    } catch (error) {
      logger.error("Error publishing template as package:", error);
      errorResponse(res, 500, "Failed to publish template as package");
    }
  }

  // Admin: Get all templates
  public async getAllForAdmin(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.isAdmin) {
        errorResponse(res, 403, "Only administrators can access all templates");
        return;
      }

      const { status, sortBy = "createdAt", sortDir = "desc" } = req.query;

      const query: any = {};
      if (status) {
        query.status = status;
      }

      const sort: any = {};
      sort[sortBy as string] = sortDir === "asc" ? 1 : -1;

      const templates = await PackageTemplate.find(query)
        .sort(sort)
        .populate("userId", "name email")
        .populate("basePackageId", "name")
        .populate("adminId", "name email");

      successResponse(
        res,
        200,
        "All templates retrieved successfully",
        templates
      );
    } catch (error) {
      logger.error("Error fetching all templates for admin:", error);
      errorResponse(res, 500, "Failed to fetch templates");
    }
  }

  // Get public templates
  public async getPublicTemplates(req: Request, res: Response): Promise<void> {
    try {
      const {
        limit = 10,
        page = 1,
        sortBy = "createdAt",
        sortDir = "desc",
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const sort: any = {};
      sort[sortBy as string] = sortDir === "asc" ? 1 : -1;

      const templates = await PackageTemplate.find({
        isPublic: true,
        status: "Published",
      })
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate("userId", "name")
        .populate("basePackageId", "name images price duration");

      const total = await PackageTemplate.countDocuments({
        isPublic: true,
        status: "Published",
      });

      successResponse(res, 200, "Public templates retrieved successfully", {
        templates,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error("Error fetching public templates:", error);
      errorResponse(res, 500, "Failed to fetch public templates");
    }
  }

  // Check template availability
  public async checkAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { date, participants } = req.query;

      if (!date) {
        errorResponse(res, 400, "Date is required to check availability");
        return;
      }

      const template = await PackageTemplate.findById(id);
      if (!template) {
        errorResponse(res, 404, "Package template not found");
        return;
      }

      const checkDate = new Date(date as string);
      const numParticipants = parseInt(participants as string) || 1;

      const isAvailable = await template.checkAvailability(
        checkDate,
        numParticipants
      );

      successResponse(res, 200, "Availability checked successfully", {
        isAvailable,
        date: checkDate,
        participants: numParticipants,
      });
    } catch (error) {
      logger.error("Error checking template availability:", error);
      errorResponse(res, 500, "Failed to check template availability");
    }
  }
}

export default new PackageTemplateController();
