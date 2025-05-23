import mongoose, { Model, Schema, Document } from "mongoose";
import { PackageInterface } from "~/utils/types";

/**
 * Destination Schema - Represents a destination in a package
 */
const destinationSchema = new Schema(
  {
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: "Destination",
      required: [true, "Destination ID is required"],
    },
    order: {
      type: Number,
      required: [true, "Order is required"],
      min: [1, "Order must be at least 1"],
    },
    stayDuration: {
      type: Number,
      required: [true, "Stay duration is required"],
      min: [1, "Stay duration must be at least 1 day"],
    },
  },
  { _id: true }
);

/**
 * Hotel Schema - Represents a hotel in a package
 */
const hotelSchema = new Schema(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
    },

    roomTypes: [
      {
        type: String,
        trim: true,
      },
    ],
    checkIn: {
      type: String,
      trim: true,
    },
    checkOut: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

/**
 * Activity Schema - Represents an activity in a package
 */
const activitySchema = new Schema(
  {
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
      required: [true, "Activity ID is required"],
    },
    day: {
      type: Number,
      required: [true, "Day is required"],
      min: [1, "Day must be at least 1"],
    },
    timeSlot: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

/**
 * Transportation Detail Schema - Represents transportation details in a package
 */
const transportationDetailSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
    },
    type: {
      type: String,
      required: [true, "Transportation type is required"],
      trim: true,
    },
    from: {
      type: String,
      required: [true, "Origin is required"],
      trim: true,
    },
    to: {
      type: String,
      required: [true, "Destination is required"],
      trim: true,
    },
    day: {
      type: Number,
      required: [true, "Day is required"],
      min: [1, "Day must be at least 1"],
    },
  },
  { _id: true }
);

/**
 * Package Schema - Represents a travel package in the system
 */
const packageSchema = new Schema<PackageInterface & Document>(
  {
    name: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be non-negative"],
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Base price must be non-negative"],
    },
    images: [
      {
        type: String,
        trim: true,
        validate: {
          validator: function (v: string) {
            return /^https?:\/\/.+/.test(v);
          },
          message: "Image URL must be a valid URL",
        },
      },
    ],
    videos: [
      {
        type: String,
        trim: true,
        validate: {
          validator: function (v: string) {
            return /^https?:\/\/.+/.test(v);
          },
          message: "Video URL must be a valid URL",
        },
      },
    ],
    duration: {
      days: {
        type: Number,
        required: [true, "Duration days is required"],
        min: [1, "Duration must be at least 1 day"],
      },
      nights: {
        type: Number,
        required: [true, "Duration nights is required"],
        min: [0, "Nights cannot be negative"],
      },
    },
    destinations: [destinationSchema],
    hotels: [hotelSchema],
    activities: [activitySchema],
    transportation: {
      type: {
        type: String,
        enum: {
          values: ["Flight", "Train", "Bus", "RentalCar", "Mixed"],
          message: "{VALUE} is not a valid transportation type",
        },
        required: [true, "Transportation type is required"],
      },
      details: [transportationDetailSchema],
    },
    /**
     * Itinerary Schema - Represents a day in the package itinerary
     */
    itinerary: [
      {
        day: {
          type: Number,
          required: [true, "Day number is required"],
          min: [1, "Day must be at least 1"],
        },
        title: {
          type: String,
          required: [true, "Title is required"],
          trim: true,
        },
        description: {
          type: String,
          required: [true, "Description is required"],
          trim: true,
        },
        meals: {
          breakfast: {
            type: Boolean,
            default: false,
          },
          lunch: {
            type: Boolean,
            default: false,
          },
          dinner: {
            type: Boolean,
            default: false,
          },
        },
      },
    ],
    included: [
      {
        type: String,
        trim: true,
      },
    ],
    excluded: [
      {
        type: String,
        trim: true,
      },
    ],
    terms: [
      {
        type: String,
        trim: true,
      },
    ],
    maxParticipants: {
      type: Number,
      min: [1, "Maximum participants must be at least 1"],
    },
    minParticipants: {
      type: Number,
      min: [1, "Minimum participants must be at least 1"],
      validate: {
        validator: function (this: PackageInterface, v: number) {
          return !this.maxParticipants || v <= this.maxParticipants;
        },
        message:
          "Minimum participants cannot be greater than maximum participants",
      },
    },
    spotsPerDay: {
      type: Number,
      min: [1, "Spots per day must be at least 1"],
    },

    /**
     * Availability configuration for the package
     */
    availability: {
      startDate: {
        type: Date,
        validate: {
          validator: function (value: Date) {
            // Start date should be today or in the future
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return value >= today;
          },
          message: "Start date cannot be in the past",
        },
      },
      endDate: {
        type: Date,
        validate: {
          validator: function (this: any, value: Date) {
            return !this.startDate || value > this.startDate;
          },
          message: "End date must be after start date",
        },
      },
      blackoutDates: [
        {
          type: Date,
          validate: {
            validator: function (value: Date) {
              return value >= new Date();
            },
            message: "Blackout dates cannot be in the past",
          },
        },
      ],
      availableWeekdays: [
        {
          type: Number,
          min: [0, "Weekday must be between 0 and 6"],
          max: [6, "Weekday must be between 0 and 6"],
        },
      ],
    },

    /**
     * Specific start dates for the package
     */
    startDates: [
      {
        type: Date,
        validate: {
          validator: function (value: Date) {
            return value > new Date();
          },
          message: "Start date must be in the future",
        },
      },
    ],

    /**
     * Seasonal pricing configuration
     */
    seasonalPricing: [
      {
        startDate: {
          type: Date,
          required: [true, "Season start date is required"],
        },
        endDate: {
          type: Date,
          required: [true, "Season end date is required"],
          validate: {
            validator: function (this: any, value: Date) {
              return value > this.startDate;
            },
            message: "Season end date must be after start date",
          },
        },
        priceMultiplier: {
          type: Number,
          required: [true, "Price multiplier is required"],
          min: [0, "Price multiplier must be non-negative"],
        },
      },
    ],

    /**
     * Weekend pricing configuration
     */
    weekendPricing: {
      enabled: {
        type: Boolean,
        default: false,
      },
      multiplier: {
        type: Number,
        default: 1,
        min: [0, "Multiplier must be non-negative"],
      },
      weekendDays: [
        {
          type: Number,
          enum: {
            values: [0, 1, 2, 3, 4, 5, 6],
            message: "{VALUE} is not a valid day of week (0-6)",
          },
          default: [5, 6], // Default to Friday and Saturday
        },
      ],
    },
    /**
     * Booking policies configuration
     */
    bookingPolicies: {
      minDaysBeforeBooking: {
        type: Number,
        min: [0, "Minimum days before booking cannot be negative"],
        default: 0,
      },
      maxDaysInAdvance: {
        type: Number,
        min: [1, "Maximum days in advance must be at least 1"],
        default: 365,
      },
      cancellationPolicy: {
        fullRefundDays: {
          type: Number,
          min: [0, "Full refund days cannot be negative"],
          default: 7,
        },
        partialRefundDays: {
          type: Number,
          min: [0, "Partial refund days cannot be negative"],
          default: 3,
        },
        partialRefundPercentage: {
          type: Number,
          min: [0, "Refund percentage must be between 0 and 100"],
          max: [100, "Refund percentage must be between 0 and 100"],
          default: 50,
        },
      },
      paymentOptions: {
        fullPayment: {
          type: Boolean,
          default: true,
        },
        partialPayment: {
          type: Boolean,
          default: false,
        },
        minDepositPercentage: {
          type: Number,
          min: [0, "Deposit percentage must be between 0 and 100"],
          max: [100, "Deposit percentage must be between 0 and 100"],
          default: 20,
        },
      },
    },

    /**
     * Package status
     */
    status: {
      type: String,
      enum: {
        values: ["Draft", "Active", "Inactive", "SoldOut"],
        message: "{VALUE} is not a valid package status",
      },
      default: "Draft",
      index: true,
    },

    /**
     * Sharing configuration
     */
    sharing: {
      isPublic: {
        type: Boolean,
        default: false,
      },
      sharedWith: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },

    /**
     * Additional notes
     */
    notes: {
      type: String,
      trim: true,
    },

    /**
     * Budget breakdown
     */
    budget: {
      estimatedTotal: {
        type: Number,
        required: [true, "Estimated total budget is required"],
        min: [0, "Budget must be non-negative"],
      },
      breakdown: {
        accommodation: {
          type: Number,
          default: 0,
          min: [0, "Accommodation budget must be non-negative"],
        },
        transportation: {
          type: Number,
          default: 0,
          min: [0, "Transportation budget must be non-negative"],
        },
        activities: {
          type: Number,
          default: 0,
          min: [0, "Activities budget must be non-negative"],
        },
        meals: {
          type: Number,
          default: 0,
          min: [0, "Meals budget must be non-negative"],
        },
        others: {
          type: Number,
        },
        breakdown: {
          accommodation: {
            type: Number,
            default: 0,
            min: [0, "Accommodation budget must be non-negative"],
          },
          transportation: {
            type: Number,
            default: 0,
            min: [0, "Transportation budget must be non-negative"],
          },
          activities: {
            type: Number,
            default: 0,
            min: [0, "Activities budget must be non-negative"],
          },
          meals: {
            type: Number,
            default: 0,
            min: [0, "Meals budget must be non-negative"],
          },
          others: {
            type: Number,
            default: 0,
            min: [0, "Other expenses budget must be non-negative"],
          },
        },
      },
      /**
       * Meals included in the package
       */
      meals: [
        {
          type: {
            type: String,
            enum: {
              values: ["Breakfast", "Lunch", "Dinner"],
              message: "{VALUE} is not a valid meal type",
            },
            required: [true, "Meal type is required"],
          },
          date: {
            type: Date,
            required: [true, "Meal date is required"],
          },
          venue: {
            type: String,
            required: [true, "Venue is required"],
            trim: true,
          },
          isIncluded: {
            type: Boolean,
            default: true,
          },
          preferences: [
            {
              type: String,
              trim: true,
            },
          ],
        },
      ],
      createdFromTemplate: {
        type: Schema.Types.ObjectId,
        ref: "PackageTemplate",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
packageSchema.index({ price: 1 });
packageSchema.index({ price: 1, "duration.days": 1 });
packageSchema.index({ status: 1, "seasonalPricing.startDate": 1 });
packageSchema.index({ "availability.startDate": 1, "availability.endDate": 1 });
packageSchema.index({ createdFromTemplate: 1 });
packageSchema.index({ name: "text", description: "text" }); // Text search index

// Virtuals
packageSchema.virtual("durationInDays").get(function () {
  return this.duration?.days || 0;
});

packageSchema.virtual("isActive").get(function () {
  return this.status === "Active";
});

packageSchema.virtual("totalMeals").get(function () {
  return this.meals?.length || 0;
});

/**
 * Check if package is available for a specific date
 * @param date - The date to check availability for
 * @returns Whether the package is available on the specified date
 */
packageSchema.methods.isAvailableForDate = function (date: Date): boolean {
  const pkg = this as PackageInterface;

  // Check if package is active
  if (pkg.status !== "Active") return false;

  // Check if date is within overall availability
  if (
    pkg.availability?.startDate &&
    date < new Date(pkg.availability.startDate)
  )
    return false;
  if (pkg.availability?.endDate && date > new Date(pkg.availability.endDate))
    return false;

  // Check if date is in blackout dates
  if (pkg.availability?.blackoutDates) {
    for (const blackoutDate of pkg.availability.blackoutDates) {
      const bd = new Date(blackoutDate);
      if (
        date.getFullYear() === bd.getFullYear() &&
        date.getMonth() === bd.getMonth() &&
        date.getDate() === bd.getDate()
      ) {
        return false;
      }
    }
  }

  // Check if day of week is available
  if (pkg.availability?.availableWeekdays?.length) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (!pkg.availability.availableWeekdays.includes(dayOfWeek)) {
      return false;
    }
  }

  // Check if date is in start dates (if specified)
  if (pkg.startDates && pkg.startDates.length > 0) {
    let isInStartDates = false;
    for (const startDate of pkg.startDates) {
      const sd = new Date(startDate);
      if (
        date.getFullYear() === sd.getFullYear() &&
        date.getMonth() === sd.getMonth() &&
        date.getDate() === sd.getDate()
      ) {
        isInStartDates = true;
        break;
      }
    }
    if (!isInStartDates) return false;
  }

  return true;
};

/**
 * Calculate price for a package based on date and participants
 * @param date - The date for the package
 * @param participants - Number of participants
 * @returns The calculated price
 */
packageSchema.methods.calculatePrice = function (
  date: Date,
  participants: number
): number {
  const pkg = this as PackageInterface;
  let finalPrice = pkg.price;

  // Apply seasonal pricing if applicable
  if (pkg.seasonalPricing && pkg.seasonalPricing.length > 0) {
    for (const season of pkg.seasonalPricing) {
      if (date >= season.startDate && date <= season.endDate) {
        finalPrice *= season.priceMultiplier;
        break;
      }
    }
  }

  // Apply weekend pricing if applicable
  if (
    pkg.weekendPricing?.enabled &&
    pkg.weekendPricing.weekendDays.includes(date.getDay())
  ) {
    finalPrice *= pkg.weekendPricing.multiplier;
  }

  return finalPrice * participants;
};

/**
 * Create a package from a template
 * @param templateId - The ID of the template to use
 * @param options - Optional configuration
 * @returns The newly created package
 */
packageSchema.statics.createFromTemplate = async function (
  templateId: Schema.Types.ObjectId,
  options: {
    approved?: boolean;
    comments?: string;
  } = {}
): Promise<any> {
  try {
    // Get the template
    const PackageTemplate = mongoose.model("PackageTemplate");
    const template = await PackageTemplate.findById(templateId)
      .populate("basePackageId")
      .exec();

    if (!template) {
      throw new Error("Template not found");
    }

    // Get the base package
    const basePackage = template.basePackageId;
    if (!basePackage) {
      throw new Error("Base package not found");
    }

    // Create a new package based on the base package and template customizations
    const newPackage = new this({
      name: `${template.name} (from template)`,
      description: template.description || basePackage.description,
      status: options.approved ? "Active" : "Pending",
      price: template.estimatedPrice || basePackage.price,
      startDates: [...basePackage.startDates],
      maxParticipants: basePackage.maxParticipants,
      images: [...basePackage.images],
      location: { ...basePackage.location },
      duration: basePackage.duration,
      includes: [...basePackage.includes],
      excludes: [...basePackage.excludes],
      isActive: options.approved || false,

      // Add the new availability fields if they exist on the basePackage
      basePrice: basePackage.basePrice,
      availability: basePackage.availability
        ? { ...basePackage.availability }
        : undefined,
      spotsPerDay: basePackage.spotsPerDay,
      seasonalPricing: basePackage.seasonalPricing
        ? { ...basePackage.seasonalPricing }
        : undefined,
      bookingPolicies: basePackage.bookingPolicies
        ? { ...basePackage.bookingPolicies }
        : undefined,

      // Store references to template and base package
      templateId: template._id,
      basePackageId: basePackage._id,

      // Record customizations from template
      customizations: template.customizations,

      // Add admin notes
      adminNotes: options.comments || "Created from user template",

      // Track origin
      createdFromTemplate: true,

      // For custom itinerary from template
      itinerary: template.customizations.itinerary?.customDays?.length
        ? {
            days: template.customizations.itinerary.customDays.map((day) => ({
              day: day.day,
              title: day.title,
              description: day.description,
              activities: day.activities,
              meals: day.meals,
            })),
          }
        : basePackage.itinerary
        ? { ...basePackage.itinerary }
        : undefined,
    });

    // Apply any customizations from the template that should override the base package
    if (template.customizations.accommodations?.hotelIds?.length) {
      newPackage.accommodations =
        template.customizations.accommodations.hotelIds;
    }

    if (template.customizations.activities?.included?.length) {
      newPackage.activities = template.customizations.activities.included;
    }

    // Apply pricing adjustments
    if (template.pricingAdjustments) {
      if (template.pricingAdjustments.extraCost) {
        newPackage.price += template.pricingAdjustments.extraCost;
      }

      if (template.pricingAdjustments.discountPercentage > 0) {
        newPackage.price = Math.round(
          newPackage.price *
            (1 - template.pricingAdjustments.discountPercentage / 100)
        );
      }
    }

    // Save the new package
    await newPackage.save();

    return newPackage;
  } catch (error) {
    console.error("Error creating package from template:", error);
    throw error;
  }
};

// Create or retrieve the model
let Package: Model<PackageInterface & Document>;
try {
  Package = mongoose.model<PackageInterface & Document>("Package");
} catch (error) {
  Package = mongoose.model<PackageInterface & Document>(
    "Package",
    packageSchema
  );
}

export default Package;
