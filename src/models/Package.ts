import mongoose, { Model, Schema } from "mongoose";

export interface PackageInterface {
  name: string;
  description?: string;
  price: number;
  basePrice: number; // Base price before any add-ons or seasonal adjustments
  images: string[];
  videos?: string[];
  duration: {
    days: number;
    nights: number;
  };
  destinations: Array<{
    destinationId: Schema.Types.ObjectId;
    order: number;
    stayDuration: number; // in days
  }>;
  hotels: Array<{
    hotelId: Schema.Types.ObjectId;
    roomTypes: string[];
    checkIn?: string;
    checkOut?: string;
  }>;
  activities: Array<{
    activityId: Schema.Types.ObjectId;
    day: number;
    timeSlot?: string;
  }>;
  transportation: {
    type: "Flight" | "Train" | "Bus" | "RentalCar" | "Mixed";
    details: Array<{
      vehicleId?: Schema.Types.ObjectId;
      type: string;
      from: string;
      to: string;
      day: number;
    }>;
  };
  itinerary: Array<{
    day: number;
    title: string;
    description: string;
    meals: {
      breakfast?: boolean;
      lunch?: boolean;
      dinner?: boolean;
    };
  }>;
  included: string[];
  excluded: string[];
  terms: string[];
  maxParticipants?: number;
  minParticipants?: number;
  spotsPerDay?: number; // Maximum number of bookings per day
  availability: {
    startDate?: Date; // Overall availability start
    endDate?: Date; // Overall availability end
    blackoutDates?: Date[]; // Dates when package is not available
    availableWeekdays?: number[]; // 0 = Sunday, 6 = Saturday
  };
  startDates?: Date[];
  seasonalPricing?: Array<{
    startDate: Date;
    endDate: Date;
    priceMultiplier: number;
  }>;
  weekendPricing?: {
    enabled: boolean;
    multiplier: number;
    weekendDays: number[]; // 0 = Sunday, 6 = Saturday
  };
  bookingPolicies: {
    minDaysBeforeBooking?: number;
    maxDaysInAdvance?: number;
    cancellationPolicy?: {
      fullRefundDays: number; // Number of days before for full refund
      partialRefundDays: number; // Number of days before for partial refund
      partialRefundPercentage: number; // Percentage for partial refund
    };
    paymentOptions?: {
      fullPayment: boolean;
      partialPayment: boolean;
      minDepositPercentage?: number;
    };
  };
  status: "Draft" | "Active" | "Inactive" | "SoldOut";
  sharing: {
    isPublic: boolean;
    sharedWith: Schema.Types.ObjectId[];
  };
  notes?: string;
  budget: {
    estimatedTotal: number;
    breakdown: {
      accommodation: number;
      transportation: number;
      activities: number;
      meals: number;
      others: number;
    };
  };
  meals: Array<{
    type: "Breakfast" | "Lunch" | "Dinner";
    date: Date;
    venue: string;
    isIncluded: boolean;
    preferences: string[];
  }>;
  createdFromTemplate?: Schema.Types.ObjectId; // Reference to PackageTemplate if created from one
  createdAt: Date;
  updatedAt: Date;
}

const packageSchema = new Schema<PackageInterface>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: String,
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    images: [
      {
        type: String,
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
        validate: {
          validator: function (v: string) {
            return /^https?:\/\/.+/.test(v);
          },
          message: "Video URL must be a valid URL",
        },
      },
    ],
    duration: {
      days: { type: Number, required: true, min: 1 },
      nights: { type: Number, required: true, min: 0 },
    },
    destinations: [
      {
        destinationId: {
          type: Schema.Types.ObjectId,
          ref: "destinations",
          required: true,
        },
        order: {
          type: Number,
          required: true,
          min: 1,
        },
        stayDuration: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    hotels: [
      {
        hotelId: {
          type: Schema.Types.ObjectId,
          ref: "hotels",
          required: true,
        },
        roomTypes: [
          {
            type: String,
            required: true,
          },
        ],
        checkIn: String,
        checkOut: String,
      },
    ],
    activities: [
      {
        activityId: {
          type: Schema.Types.ObjectId,
          ref: "activities",
          required: true,
        },
        day: {
          type: Number,
          required: true,
          min: 1,
        },
        timeSlot: String,
      },
    ],
    transportation: {
      type: {
        type: String,
        enum: ["Flight", "Train", "Bus", "RentalCar", "Mixed"],
        required: true,
      },
      details: [
        {
          vehicleId: {
            type: Schema.Types.ObjectId,
            ref: "vehicles",
          },
          type: {
            type: String,
            required: true,
          },
          from: {
            type: String,
            required: true,
          },
          to: {
            type: String,
            required: true,
          },
          day: {
            type: Number,
            required: true,
            min: 1,
          },
        },
      ],
    },
    itinerary: [
      {
        day: {
          type: Number,
          required: true,
          min: 1,
        },
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        meals: {
          breakfast: Boolean,
          lunch: Boolean,
          dinner: Boolean,
        },
      },
    ],
    included: [String],
    excluded: [String],
    terms: [String],
    maxParticipants: {
      type: Number,
      min: 1,
    },
    minParticipants: {
      type: Number,
      min: 1,
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
      min: 1,
    },
    availability: {
      startDate: Date,
      endDate: Date,
      blackoutDates: [Date],
      availableWeekdays: [
        {
          type: Number,
          min: 0,
          max: 6,
        },
      ],
    },
    startDates: [
      {
        type: Date,
        validate: {
          validator: function (v: Date) {
            return v >= new Date();
          },
          message: "Start date must be in the future",
        },
      },
    ],
    seasonalPricing: [
      {
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        priceMultiplier: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    weekendPricing: {
      enabled: {
        type: Boolean,
        default: false,
      },
      multiplier: {
        type: Number,
        default: 1,
        min: 0,
      },
      weekendDays: [
        {
          type: Number,
          enum: [0, 1, 2, 3, 4, 5, 6],
          default: [5, 6], // Default to Friday and Saturday
        },
      ],
    },
    bookingPolicies: {
      minDaysBeforeBooking: {
        type: Number,
        min: 0,
      },
      maxDaysInAdvance: {
        type: Number,
        min: 1,
      },
      cancellationPolicy: {
        fullRefundDays: {
          type: Number,
          min: 0,
        },
        partialRefundDays: {
          type: Number,
          min: 0,
        },
        partialRefundPercentage: {
          type: Number,
          min: 0,
          max: 100,
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
          min: 0,
          max: 100,
          default: 20,
        },
      },
    },
    status: {
      type: String,
      enum: ["Draft", "Active", "Inactive", "SoldOut"],
      default: "Draft",
    },
    sharing: {
      isPublic: { type: Boolean, default: false },
      sharedWith: [{ type: Schema.Types.ObjectId, ref: "users" }],
    },
    notes: String,
    budget: {
      estimatedTotal: { type: Number, required: true },
      breakdown: {
        accommodation: { type: Number, default: 0 },
        transportation: { type: Number, default: 0 },
        activities: { type: Number, default: 0 },
        meals: { type: Number, default: 0 },
        others: { type: Number, default: 0 },
      },
    },
    meals: [
      {
        type: { type: String, enum: ["Breakfast", "Lunch", "Dinner"] },
        date: Date,
        venue: String,
        isIncluded: { type: Boolean, default: false },
        preferences: [String],
      },
    ],
    createdFromTemplate: {
      type: Schema.Types.ObjectId,
      ref: "PackageTemplate",
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
packageSchema.index({ name: "text", description: "text" });
packageSchema.index({ "destinations.destinationId": 1 });
packageSchema.index({ price: 1, "duration.days": 1 });
packageSchema.index({ status: 1, "seasonalPricing.startDate": 1 });
packageSchema.index({ "availability.startDate": 1, "availability.endDate": 1 });
packageSchema.index({ createdFromTemplate: 1 });

// Add method to check if package is available for a date
packageSchema.methods.isAvailableForDate = function (date: Date): boolean {
  const pkg = this as PackageInterface;

  // Check if package is active
  if (pkg.status !== "Active") return false;

  const checkDate = new Date(date);

  // Check overall availability period
  if (pkg.availability?.startDate && pkg.availability.endDate) {
    if (
      checkDate < pkg.availability.startDate ||
      checkDate > pkg.availability.endDate
    ) {
      return false;
    }
  }

  // Check blackout dates
  if (
    pkg.availability?.blackoutDates &&
    pkg.availability.blackoutDates.length > 0
  ) {
    const isBlackout = pkg.availability.blackoutDates.some(
      (blackoutDate) => blackoutDate.toDateString() === checkDate.toDateString()
    );
    if (isBlackout) return false;
  }

  // Check available weekdays
  if (
    pkg.availability?.availableWeekdays &&
    pkg.availability.availableWeekdays.length > 0
  ) {
    const dayOfWeek = checkDate.getDay();
    if (!pkg.availability.availableWeekdays.includes(dayOfWeek)) return false;
  }

  // Check specific start dates if defined
  if (pkg.startDates && pkg.startDates.length > 0) {
    const isValidStartDate = pkg.startDates.some(
      (startDate) => startDate.toDateString() === checkDate.toDateString()
    );
    if (!isValidStartDate) return false;
  }

  return true;
};

// Calculate price for a package based on date and participants
packageSchema.methods.calculatePrice = function (
  date: Date,
  participants: number
): number {
  const pkg = this as PackageInterface;

  let finalPrice = pkg.basePrice;
  const checkDate = new Date(date);

  // Apply seasonal pricing if applicable
  if (pkg.seasonalPricing && pkg.seasonalPricing.length > 0) {
    for (const season of pkg.seasonalPricing) {
      if (checkDate >= season.startDate && checkDate <= season.endDate) {
        finalPrice *= season.priceMultiplier;
        break;
      }
    }
  }

  // Apply weekend pricing if applicable
  if (pkg.weekendPricing?.enabled) {
    const dayOfWeek = checkDate.getDay();
    if (pkg.weekendPricing.weekendDays.includes(dayOfWeek)) {
      finalPrice *= pkg.weekendPricing.multiplier;
    }
  }

  return finalPrice * participants;
};

// Static method to create a package from a template
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

let Package: Model<PackageInterface>;
try {
  Package = mongoose.model("packages");
} catch (error) {
  Package = mongoose.model("packages", packageSchema);
}

export default Package;
