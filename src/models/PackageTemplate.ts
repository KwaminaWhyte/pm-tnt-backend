import mongoose, { Schema } from "mongoose";

export interface PackageTemplateInterface {
  userId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  basePackageId: Schema.Types.ObjectId;
  customizations: {
    accommodations?: {
      hotelIds: Schema.Types.ObjectId[];
      preferences: {
        roomTypes: string[];
        amenities: string[];
        boardBasis: string[];
        location: string[];
      };
    };
    transportation?: {
      type: "Flight" | "Train" | "Bus" | "Private Car" | "None";
      preferences: {
        class: string;
        seatingPreference: string;
        specialAssistance: string[];
        luggageOptions: string[];
      };
    };
    activities?: {
      included: Schema.Types.ObjectId[];
      excluded: Schema.Types.ObjectId[];
      preferences: {
        difficulty: string[];
        duration: string[];
        type: string[];
        timeOfDay: string[];
      }[];
    };
    meals?: {
      included: {
        breakfast: boolean;
        lunch: boolean;
        dinner: boolean;
      };
      preferences: {
        dietary: string[];
        cuisine: string[];
        mealTimes: {
          breakfast?: string;
          lunch?: string;
          dinner?: string;
        };
      };
    };
    itinerary?: {
      pace: "Relaxed" | "Moderate" | "Fast";
      flexibility: "Fixed" | "Flexible" | "Very Flexible";
      focusAreas: string[];
      customDays: Array<{
        day: number;
        title: string;
        description: string;
        activities: Schema.Types.ObjectId[];
        meals: {
          breakfast?: Schema.Types.ObjectId;
          lunch?: Schema.Types.ObjectId;
          dinner?: Schema.Types.ObjectId;
        };
      }>;
    };
    accessibility?: {
      wheelchairAccess: boolean;
      mobilityAssistance: boolean;
      dietaryRestrictions: string[];
      medicalRequirements: string[];
    };
    budget?: {
      maxBudget: number;
      priorityAreas: string[];
      flexibleAreas: string[];
    };
  };
  pricingAdjustments?: {
    extraCost: number;
    discountPercentage: number;
  };
  status: "Pending" | "InReview" | "Approved" | "Rejected" | "Published";
  adminFeedback?: string;
  adminId?: Schema.Types.ObjectId;
  reviewDate?: Date;
  estimatedPrice?: number;
  version: number;
  previousVersions?: Array<{
    templateData: Record<string, any>;
    version: number;
    timestamp: Date;
    feedback?: string;
  }>;
  resultingPackageId?: Schema.Types.ObjectId;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const packageTemplateSchema = new Schema<PackageTemplateInterface>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    basePackageId: {
      type: Schema.Types.ObjectId,
      ref: "packages",
      required: true,
    },
    customizations: {
      accommodations: {
        hotelIds: [{ type: Schema.Types.ObjectId, ref: "hotels" }],
        preferences: {
          roomTypes: [String],
          amenities: [String],
          boardBasis: [String],
          location: [String],
        },
      },
      transportation: {
        type: {
          type: String,
          enum: ["Flight", "Train", "Bus", "Private Car", "None"],
        },
        preferences: {
          class: String,
          seatingPreference: String,
          specialAssistance: [String],
          luggageOptions: [String],
        },
      },
      activities: {
        included: [{ type: Schema.Types.ObjectId, ref: "activities" }],
        excluded: [{ type: Schema.Types.ObjectId, ref: "activities" }],
        preferences: {
          type: [
            {
              difficulty: { type: [String], default: [] },
              duration: { type: [String], default: [] },
              type: { type: [String], default: [] },
              timeOfDay: { type: [String], default: [] },
            },
          ],
          default: [],
        },
      },
      meals: {
        included: {
          breakfast: Boolean,
          lunch: Boolean,
          dinner: Boolean,
        },
        preferences: {
          dietary: [String],
          cuisine: [String],
          mealTimes: {
            breakfast: String,
            lunch: String,
            dinner: String,
          },
        },
      },
      itinerary: {
        pace: {
          type: String,
          enum: ["Relaxed", "Moderate", "Fast"],
        },
        flexibility: {
          type: String,
          enum: ["Fixed", "Flexible", "Very Flexible"],
        },
        focusAreas: [String],
        customDays: [
          {
            day: Number,
            title: String,
            description: String,
            activities: [{ type: Schema.Types.ObjectId, ref: "activities" }],
            meals: {
              breakfast: { type: Schema.Types.ObjectId, ref: "restaurants" },
              lunch: { type: Schema.Types.ObjectId, ref: "restaurants" },
              dinner: { type: Schema.Types.ObjectId, ref: "restaurants" },
            },
          },
        ],
      },
      accessibility: {
        wheelchairAccess: Boolean,
        mobilityAssistance: Boolean,
        dietaryRestrictions: [String],
        medicalRequirements: [String],
      },
      budget: {
        maxBudget: Number,
        priorityAreas: [String],
        flexibleAreas: [String],
      },
    },
    pricingAdjustments: {
      extraCost: {
        type: Number,
        default: 0,
      },
      discountPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    status: {
      type: String,
      enum: ["Pending", "InReview", "Approved", "Rejected", "Published"],
      default: "Pending",
    },
    adminFeedback: String,
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "admins",
    },
    reviewDate: Date,
    estimatedPrice: Number,
    version: {
      type: Number,
      default: 1,
    },
    previousVersions: [
      {
        templateData: Object,
        version: Number,
        timestamp: Date,
        feedback: String,
      },
    ],
    resultingPackageId: {
      type: Schema.Types.ObjectId,
      ref: "packages",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes
packageTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });
packageTemplateSchema.index({ tags: 1 });
packageTemplateSchema.index({ isPublic: 1 });
packageTemplateSchema.index({ createdAt: -1 });
packageTemplateSchema.index({ status: 1 });
packageTemplateSchema.index({ basePackageId: 1 });
packageTemplateSchema.index({ resultingPackageId: 1 });

// Save previous version before updating
packageTemplateSchema.pre("findOneAndUpdate", async function (next) {
  try {
    // @ts-ignore
    const docToUpdate = await this.model.findOne(this.getQuery());

    if (!docToUpdate) return next();

    // Only save version history if meaningful changes are made
    const update = this.getUpdate();
    if (!update || Object.keys(update).length === 0) return next();

    // Don't create version for simple status changes
    if (
      Object.keys(update).length === 1 &&
      update.$set &&
      Object.keys(update.$set).length === 1 &&
      update.$set.status
    ) {
      return next();
    }

    // Create a snapshot of the current document before changes
    const currentVersion = docToUpdate.version || 1;
    const previousVersion = {
      templateData: docToUpdate.toObject(),
      version: currentVersion,
      timestamp: new Date(),
      feedback: docToUpdate.adminFeedback,
    };

    // Remove circular references
    delete previousVersion.templateData.previousVersions;

    // Increment version and add to previousVersions
    this.set("version", currentVersion + 1);
    this.set("previousVersions", [
      ...(docToUpdate.previousVersions || []),
      previousVersion,
    ]);

    next();
  } catch (error) {
    next(error);
  }
});

// Method to submit for review
packageTemplateSchema.methods.submitForReview =
  async function (): Promise<PackageTemplateInterface> {
    const template = this;
    template.status = "InReview";
    template.reviewDate = new Date();

    // Calculate estimated price based on base package and customizations
    // This would be a full implementation in production
    if (template.basePackageId) {
      try {
        const Package = mongoose.model("packages");
        const basePackage = await Package.findById(template.basePackageId);

        if (basePackage) {
          let estimatedPrice = basePackage.price;

          // Apply pricing adjustments
          if (template.pricingAdjustments) {
            estimatedPrice += template.pricingAdjustments.extraCost;

            if (template.pricingAdjustments.discountPercentage > 0) {
              estimatedPrice *=
                1 - template.pricingAdjustments.discountPercentage / 100;
            }
          }

          template.estimatedPrice = Math.round(estimatedPrice);
        }
      } catch (error) {
        console.error("Error calculating estimated price:", error);
      }
    }

    return template.save();
  };

// Method to approve template
packageTemplateSchema.methods.approve = async function (
  adminId: string,
  feedback?: string
): Promise<PackageTemplateInterface> {
  const template = this;
  template.status = "Approved";
  template.adminId = adminId;

  if (feedback) {
    template.adminFeedback = feedback;
  }

  return template.save();
};

// Method to reject template
packageTemplateSchema.methods.reject = async function (
  adminId: string,
  feedback: string
): Promise<PackageTemplateInterface> {
  const template = this;
  template.status = "Rejected";
  template.adminId = adminId;
  template.adminFeedback = feedback;

  return template.save();
};

// Method to publish as a package
packageTemplateSchema.methods.publishAsPackage = async function (
  adminId: string
): Promise<any> {
  try {
    const Package = mongoose.model("packages");

    // Use static method from Package model
    const newPackage = await Package.createFromTemplate(this._id, {
      approved: true,
      comments: "Automatically created from approved template",
    });

    if (newPackage) {
      this.status = "Published";
      this.resultingPackageId = newPackage._id;
      this.adminId = adminId;
      await this.save();
    }

    return newPackage;
  } catch (error) {
    console.error("Error publishing template as package:", error);
    throw error;
  }
};

// Method to check availability
packageTemplateSchema.methods.checkAvailability = async function (
  date: Date,
  participants: number
): Promise<boolean> {
  try {
    // Check if base package is available
    const Package = mongoose.model("packages");
    const basePackage = await Package.findById(this.basePackageId);

    if (!basePackage) return false;

    // Use package model's availability check
    return basePackage.isAvailableForDate(date);
  } catch (error) {
    console.error("Error checking template availability:", error);
    return false;
  }
};

const PackageTemplate = mongoose.model<PackageTemplateInterface>(
  "PackageTemplate",
  packageTemplateSchema
);

export default PackageTemplate;
