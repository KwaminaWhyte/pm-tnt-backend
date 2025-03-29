import mongoose from "mongoose";
import { ApiResponse, error } from "~/utils/apiResponse";
import PackageTemplate from "../models/PackageTemplate";
import Package from "../models/Package";

class PackageTemplateController {
  // Create a new package template
  public async create(body: any, userId: string): Promise<ApiResponse<any>> {
    try {
      if (!userId) {
        return error(401, { message: "User not authenticated" });
      }

      const templateData = {
        ...body,
        userId: new mongoose.Types.ObjectId(userId),
      };

      // Validate base package exists
      if (!templateData.basePackageId) {
        return error(400, { message: "Base package ID is required" });
      }

      const basePackage = await Package.findById(templateData.basePackageId);
      if (!basePackage) {
        return error(404, { message: "Base package not found" });
      }

      const newTemplate = new PackageTemplate(templateData);
      await newTemplate.save();

      return {
        success: true,
        data: newTemplate,
        message: "Package template created successfully",
      };
    } catch (err) {
      console.error("Error creating package template:", err);
      return error(500, {
        message: "Failed to create package template",
        error: err,
      });
    }
  }

  // Get all package templates for the current user
  public async getAllForUser(userId: string): Promise<ApiResponse<any>> {
    try {
      if (!userId) {
        return error(401, { message: "User not authenticated" });
      }

      const templates = await PackageTemplate.find({ userId })
        .sort({ updatedAt: -1 })
        .populate("basePackageId", "name images price");

      return {
        success: true,
        data: templates,
        message: "User templates retrieved successfully",
      };
    } catch (err) {
      console.error("Error fetching user's package templates:", err);
      return error(500, {
        message: "Failed to fetch package templates",
        error: err,
      });
    }
  }

  // Get template by ID
  public async getById(
    id: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      const template = await PackageTemplate.findById(id)
        .populate(
          "basePackageId",
          "name images price duration startDates status"
        )
        .populate("resultingPackageId", "name status");

      if (!template) {
        return error(404, { message: "Package template not found" });
      }

      // Check if the template belongs to the user or is public
      if (
        template.userId.toString() !== userId &&
        !template.isPublic &&
        !isAdmin
      ) {
        return error(403, {
          message: "You don't have permission to view this template",
        });
      }

      return {
        success: true,
        data: template,
        message: "Package template retrieved successfully",
      };
    } catch (err) {
      console.error("Error fetching package template:", err);
      return error(500, {
        message: "Failed to fetch package template",
        error: err,
      });
    }
  }

  // Update a template
  public async update(
    id: string,
    body: any,
    userId: string,
    isAdmin: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      const template = await PackageTemplate.findById(id);
      if (!template) {
        return error(404, { message: "Package template not found" });
      }

      // Check if the template belongs to the user
      if (template.userId.toString() !== userId && !isAdmin) {
        return error(403, {
          message: "You don't have permission to update this template",
        });
      }

      // Prevent updates to templates in certain states
      if (["Published", "Approved"].includes(template.status) && !isAdmin) {
        return error(400, {
          message: `Cannot update a template with status: ${template.status}`,
        });
      }

      // Don't allow changing the basePackageId
      if (
        body.basePackageId &&
        template.basePackageId.toString() !== body.basePackageId
      ) {
        return error(400, {
          message: "Cannot change the base package of an existing template",
        });
      }

      // Update the template
      const updatedTemplate = await PackageTemplate.findByIdAndUpdate(
        id,
        { $set: body },
        { new: true, runValidators: true }
      );

      return {
        success: true,
        data: updatedTemplate,
        message: "Package template updated successfully",
      };
    } catch (err) {
      console.error("Error updating package template:", err);
      return error(500, {
        message: "Failed to update package template",
        error: err,
      });
    }
  }

  // Delete a template
  public async delete(
    id: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      const template = await PackageTemplate.findById(id);
      if (!template) {
        return error(404, { message: "Package template not found" });
      }

      // Check if the template belongs to the user
      if (template.userId.toString() !== userId && !isAdmin) {
        return error(403, {
          message: "You don't have permission to delete this template",
        });
      }

      // Prevent deletion if published
      if (template.status === "Published" && !isAdmin) {
        return error(400, { message: "Cannot delete a published template" });
      }

      await PackageTemplate.findByIdAndDelete(id);
      return {
        success: true,
        message: "Package template deleted successfully",
      };
    } catch (err) {
      console.error("Error deleting package template:", err);
      return error(500, {
        message: "Failed to delete package template",
        error: err,
      });
    }
  }

  // Submit template for review
  public async submitForReview(
    id: string,
    userId: string
  ): Promise<ApiResponse<any>> {
    try {
      const template = await PackageTemplate.findById(id);
      if (!template) {
        return error(404, { message: "Package template not found" });
      }

      // Check if the template belongs to the user
      if (template.userId.toString() !== userId) {
        return error(403, {
          message:
            "You don't have permission to submit this template for review",
        });
      }

      // Check if already submitted
      if (["InReview", "Approved", "Published"].includes(template.status)) {
        return error(400, {
          message: `Template is already in ${template.status} status`,
        });
      }

      // Submit for review - update status
      template.status = "InReview";
      template.set("reviewDate", new Date());
      await template.save();

      return {
        success: true,
        data: template,
        message: "Package template submitted for review successfully",
      };
    } catch (err) {
      console.error("Error submitting package template for review:", err);
      return error(500, {
        message: "Failed to submit package template for review",
        error: err,
      });
    }
  }

  // Admin: Approve a template
  public async approveTemplate(id: string): Promise<ApiResponse<any>> {
    try {
      const template = await PackageTemplate.findById(id);
      if (!template) {
        return error(404, { message: "Package template not found" });
      }

      if (template.status !== "InReview") {
        return error(400, {
          message: "Only templates in review can be approved",
        });
      }

      // Approve the template
      template.status = "Approved";
      template.set("reviewDate", new Date());
      await template.save();

      return {
        success: true,
        data: template,
        message: "Package template approved successfully",
      };
    } catch (err) {
      console.error("Error approving package template:", err);
      return error(500, {
        message: "Failed to approve package template",
        error: err,
      });
    }
  }

  // Admin: Reject a template
  public async rejectTemplate(
    id: string,
    feedback: string
  ): Promise<ApiResponse<any>> {
    try {
      if (!feedback) {
        return error(400, {
          message: "Feedback is required when rejecting a template",
        });
      }

      const template = await PackageTemplate.findById(id);
      if (!template) {
        return error(404, { message: "Package template not found" });
      }

      if (template.status !== "InReview") {
        return error(400, {
          message: "Only templates in review can be rejected",
        });
      }

      // Reject the template
      template.status = "Rejected";
      template.adminFeedback = feedback;
      template.set("reviewDate", new Date());
      await template.save();

      return {
        success: true,
        data: template,
        message: "Package template rejected successfully",
      };
    } catch (err) {
      console.error("Error rejecting package template:", err);
      return error(500, {
        message: "Failed to reject package template",
        error: err,
      });
    }
  }

  // Admin: Publish a template as a package
  public async publishAsPackage(id: string): Promise<ApiResponse<any>> {
    try {
      const template = await PackageTemplate.findById(id);
      if (!template) {
        return error(404, { message: "Package template not found" });
      }

      if (template.status !== "Approved") {
        return error(400, {
          message: "Only approved templates can be published",
        });
      }

      // Create a new package from the template
      // This is a placeholder - actual implementation would create a new Package
      template.status = "Published";
      template.set("publishDate", new Date());
      await template.save();

      // Mock response for now
      return {
        success: true,
        data: {
          template,
          package: {
            _id: "new-package-id",
            name: template.name,
            status: "Active",
          },
        },
        message: "Template published as package successfully",
      };
    } catch (err) {
      console.error("Error publishing template as package:", err);
      return error(500, {
        message: "Failed to publish template as package",
        error: err,
      });
    }
  }

  // Admin: Get all templates
  public async getAllForAdmin(): Promise<ApiResponse<any>> {
    try {
      const templates = await PackageTemplate.find()
        .sort({ createdAt: -1 })
        .populate("userId", "name email")
        .populate("basePackageId", "name")
        .populate("adminId", "name email");

      return {
        success: true,
        data: templates,
        message: "All templates retrieved successfully",
      };
    } catch (err) {
      console.error("Error fetching all templates for admin:", err);
      return error(500, {
        message: "Failed to fetch templates",
        error: err,
      });
    }
  }

  // Get public templates
  public async getPublicTemplates(): Promise<ApiResponse<any>> {
    try {
      const limit = 10;
      const page = 1;

      const templates = await PackageTemplate.find({
        isPublic: true,
        status: "Published",
      })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("userId", "name")
        .populate("basePackageId", "name images price duration");

      const total = await PackageTemplate.countDocuments({
        isPublic: true,
        status: "Published",
      });

      return {
        success: true,
        data: {
          templates,
          pagination: {
            total,
            page: page,
            pages: Math.ceil(total / limit),
          },
        },
        message: "Public templates retrieved successfully",
      };
    } catch (err) {
      console.error("Error fetching public templates:", err);
      return error(500, {
        message: "Failed to fetch public templates",
        error: err,
      });
    }
  }

  // Check template availability
  public async checkAvailability(
    id: string,
    queryParams: any
  ): Promise<ApiResponse<any>> {
    try {
      const { date, participants } = queryParams;

      if (!date) {
        return error(400, {
          message: "Date is required to check availability",
        });
      }

      const template = await PackageTemplate.findById(id);
      if (!template) {
        return error(404, { message: "Package template not found" });
      }

      const checkDate = new Date(date as string);
      const numParticipants = parseInt(participants as string) || 1;

      // Assuming template.basePackageId has startDates array
      const basePackage = await Package.findById(template.basePackageId);
      if (!basePackage) {
        return error(404, { message: "Base package not found" });
      }

      // Check if date is in available start dates
      let isAvailable = false;
      if (basePackage.startDates && basePackage.startDates.length > 0) {
        isAvailable = basePackage.startDates.some((availableDate) => {
          const startDate = new Date(availableDate);
          return (
            startDate.getFullYear() === checkDate.getFullYear() &&
            startDate.getMonth() === checkDate.getMonth() &&
            startDate.getDate() === checkDate.getDate()
          );
        });
      }

      // Also check against min/max participants
      if (
        isAvailable &&
        basePackage.minParticipants &&
        numParticipants < basePackage.minParticipants
      ) {
        isAvailable = false;
      }

      if (
        isAvailable &&
        basePackage.maxParticipants &&
        numParticipants > basePackage.maxParticipants
      ) {
        isAvailable = false;
      }

      return {
        success: true,
        data: {
          isAvailable,
          date: checkDate,
          participants: numParticipants,
        },
        message: "Availability checked successfully",
      };
    } catch (err) {
      console.error("Error checking template availability:", err);
      return error(500, {
        message: "Failed to check template availability",
        error: err,
      });
    }
  }
}

export default new PackageTemplateController();
