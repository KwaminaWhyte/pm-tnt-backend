import mongoose from "mongoose";
import User from "../models/User";
import Hotel from "../models/Hotel";
import Activity from "../models/Activity";
import Package from "../models/Package";
import PackageTemplate from "../models/PackageTemplate";
import Booking from "../models/Booking";
import Review from "../models/Review";
import Destination from "../models/Destination";

export async function seedSampleData() {
  try {
    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Hotel.deleteMany({}),
      Activity.deleteMany({}),
      Package.deleteMany({}),
      PackageTemplate.deleteMany({}),
      Booking.deleteMany({}),
      Review.deleteMany({}),
      Destination.deleteMany({}),
    ]);

    // Create User
    const user = await User.create({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      password: "hashedPassword123", // In production, this should be properly hashed
      phone: "+12345678901", // Updated to match the required format
      preferences: {
        language: "English",
        currency: "USD",
        notifications: {
          email: true,
          sms: true,
          push: true,
        },
      },
    });

    // Create Destination
    const destination = await mongoose.model("destinations").create({
      name: "Phuket",
      country: "Thailand",
      city: "Phuket City",
      description:
        "Beautiful island destination in Thailand with pristine beaches and vibrant culture",
      highlights: [
        "Phi Phi Islands",
        "Big Buddha",
        "Old Phuket Town",
        "Phang Nga Bay",
      ],
      price: 1000, // Base price for the destination
      location: {
        type: "Point",
        coordinates: [98.3923, 7.8804], // [longitude, latitude]
      },
      bestTimeToVisit: {
        startMonth: 11, // November
        endMonth: 4, // April
      },
      climate: "Tropical",
      popularActivities: [
        "Island Hopping",
        "Scuba Diving",
        "Thai Cooking Classes",
        "Temple Tours",
      ],
      localCuisine: ["Tom Yum Goong", "Pad Thai", "Som Tum", "Massaman Curry"],
      culturalEvents: [
        {
          name: "Loy Krathong",
          description: "Festival of Light",
          date: {
            month: 11,
          },
        },
        {
          name: "Songkran",
          description: "Thai New Year Water Festival",
          date: {
            month: 4,
            day: 13,
          },
        },
      ],
      seasonalPricing: [
        {
          startMonth: 11,
          endMonth: 4,
          priceMultiplier: 1.3, // High season
        },
        {
          startMonth: 5,
          endMonth: 10,
          priceMultiplier: 0.8, // Low season
        },
      ],
      travelTips: [
        "Best to visit during dry season (November to April)",
        "Book island tours in advance",
        "Respect local customs and dress codes at temples",
      ],
      visaRequirements: "Visa-free for many countries up to 30 days",
      languages: ["Thai", "English"],
      currency: "THB",
      timeZone: "Asia/Bangkok",
      status: "Active",
    });

    // Create Hotel
    const hotel = await Hotel.create({
      name: "Grand Ocean Resort & Spa",
      description: "Luxury beachfront resort with world-class amenities",
      location: {
        address: "123 Coastal Drive",
        city: "Phuket",
        country: "Thailand",
        geo: {
          type: "Point",
          coordinates: [98.3923, 7.8804], // [longitude, latitude]
        },
      },
      contactInfo: {
        phone: "+12345678903",
        email: "info@grandocean.com",
        website: "https://grandocean.com",
      },
      starRating: 5,
      amenities: [
        "Swimming Pool",
        "Spa",
        "Beach Access",
        "Free WiFi",
        "Restaurant",
        "Room Service",
      ],
      checkInTime: "14:00",
      checkOutTime: "12:00",
      images: [
        "https://example.com/hotel/grand-ocean/1.jpg",
        "https://example.com/hotel/grand-ocean/2.jpg",
      ],
      policies: {
        checkIn: "14:00",
        checkOut: "12:00",
        cancellation: "24 hours before check-in",
        payment: "Credit card required for booking",
        houseRules: ["No smoking", "No pets", "Quiet hours 10 PM - 7 AM"],
      },
      rooms: [
        {
          type: "Deluxe Ocean View",
          description: "Spacious room with panoramic ocean views",
          capacity: 2,
          amenities: ["King Bed", "Ocean View", "Mini Bar", "Private Balcony"],
          basePrice: 350,
          size: "45m²",
        },
      ],
    });

    // Create Activities
    const activities = await Activity.create([
      {
        name: "Island Hopping Tour",
        description: "Visit the most beautiful islands around Phuket",
        destination: destination._id,
        duration: 480,
        price: 120,
        category: "Adventure",
        availability: [
          {
            dayOfWeek: 1, // Monday
            startTime: "08:00",
            endTime: "16:00",
          },
          {
            dayOfWeek: 3, // Wednesday
            startTime: "08:00",
            endTime: "16:00",
          },
          {
            dayOfWeek: 5, // Friday
            startTime: "08:00",
            endTime: "16:00",
          },
        ],
        location: {
          name: "Phuket Marina",
          coordinates: [98.3923, 7.8804], // [longitude, latitude]
        },
        maxParticipants: 15,
        minParticipants: 4,
        requirements: ["Swimming ability", "Sunscreen", "Beach wear"],
        included: ["Boat Trip", "Lunch", "Snorkeling Equipment"],
        excluded: ["Hotel pickup", "Travel insurance"],
        images: ["https://example.com/activities/island-hopping/1.jpg"],
      },
      {
        name: "Thai Cooking Class",
        description: "Learn to cook authentic Thai dishes",
        destination: destination._id,
        duration: 240,
        price: 80,
        category: "Cultural",
        availability: [
          {
            dayOfWeek: 2, // Tuesday
            startTime: "09:00",
            endTime: "13:00",
          },
          {
            dayOfWeek: 4, // Thursday
            startTime: "09:00",
            endTime: "13:00",
          },
        ],
        maxParticipants: 12,
        minParticipants: 2,
        requirements: ["No cooking experience needed"],
        included: ["Ingredients", "Cookbook", "Certificate"],
        excluded: ["Hotel transfer"],
        images: ["https://example.com/activities/cooking-class/1.jpg"],
      },
    ]);

    // Create Package
    const travelPackage = await Package.create({
      name: "Phuket Paradise Escape",
      description: "5-day luxury escape in Phuket",
      price: 1200,
      duration: {
        days: 5,
        nights: 4,
      },
      destinations: [
        {
          destinationId: destination._id,
          order: 1,
          stayDuration: 5,
        },
      ],
      hotels: [
        {
          hotelId: hotel._id,
          roomTypes: ["Deluxe Ocean View"],
          checkIn: "14:00",
          checkOut: "12:00",
        },
      ],
      activities: activities.map((activity, index) => ({
        activityId: activity._id,
        day: index + 2, // Starting activities from day 2
        timeSlot: "09:00",
      })),
      transportation: {
        type: "RentalCar",
        details: [
          {
            type: "SUV",
            from: "Phuket International Airport",
            to: "Grand Ocean Resort & Spa",
            day: 1,
          },
        ],
      },
      itinerary: [
        {
          day: 1,
          title: "Arrival & Relaxation",
          description:
            "Arrive at Phuket International Airport, transfer to hotel, and free time at beach",
          meals: {
            breakfast: false,
            lunch: false,
            dinner: true,
          },
        },
        {
          day: 2,
          title: "Island Adventure",
          description: "Full-day island hopping tour exploring Phi Phi Islands",
          meals: {
            breakfast: true,
            lunch: true,
            dinner: false,
          },
        },
      ],
      included: [
        "Hotel accommodation",
        "Daily breakfast",
        "Airport transfers",
        "Island hopping tour",
      ],
      excluded: [
        "International flights",
        "Travel insurance",
        "Personal expenses",
      ],
      terms: [
        "Cancellation policy applies",
        "Passport required",
        "Minimum 2 participants required",
      ],
      maxParticipants: 15,
      minParticipants: 2,
      startDates: [
        new Date("2024-12-20"),
        new Date("2024-12-27"),
        new Date("2025-01-03"),
      ],
      seasonalPricing: [
        {
          startDate: new Date("2024-12-01"),
          endDate: new Date("2025-02-28"),
          priceMultiplier: 1.3,
        },
      ],
      status: "Active",
      sharing: {
        isPublic: true,
        sharedWith: [],
      },
      budget: {
        estimatedTotal: 1500,
        breakdown: {
          accommodation: 600,
          transportation: 200,
          activities: 400,
          meals: 200,
          others: 100,
        },
      },
      meals: [
        {
          type: "Breakfast",
          date: new Date("2024-12-21"),
          venue: "Hotel Restaurant",
          isIncluded: true,
          preferences: ["Vegetarian available", "Halal available"],
        },
        {
          type: "Lunch",
          date: new Date("2024-12-21"),
          venue: "Beach Restaurant",
          isIncluded: true,
          preferences: ["Seafood", "Local cuisine"],
        },
      ],
    });

    // Create Package Template
    const packageTemplate = await PackageTemplate.create({
      userId: user._id,
      name: "Family Beach Vacation",
      description: "Customized family-friendly beach package",
      basePackageId: travelPackage._id,
      customizations: {
        accommodations: {
          preferences: {
            roomTypes: ["Family Suite", "Connecting Rooms"],
            amenities: ["Kids Club", "Children's Pool"],
          },
        },
        activities: {
          included: [],
          excluded: [],
          preferences: [
            {
              difficulty: ["Easy"],
              duration: ["2-3 hours", "Half-day"],
              type: ["Family", "Educational"],
              timeOfDay: ["Morning", "Afternoon"],
            },
          ],
        },
        meals: {
          included: {
            breakfast: true,
            lunch: false,
            dinner: true,
          },
          preferences: {
            dietary: ["Child-Friendly", "Vegetarian Options"],
            mealTimes: {
              breakfast: "07:30",
              dinner: "18:30",
            },
          },
        },
      },
      isPublic: true,
      tags: ["Family", "Beach", "Kid-Friendly"],
    });

    // Create Booking
    const booking = await Booking.create({
      userId: user._id,
      bookingType: "package",
      bookingReference: "BK1702600123XYZ",
      startDate: new Date("2024-12-20"),
      endDate: new Date("2024-12-25"),
      status: "Confirmed",
      contactInfo: {
        name: "John Doe",
        email: "john@example.com",
        phone: "+12345678901"
      },
      packageBooking: {
        packageId: travelPackage._id,
        participants: [
          {
            type: "adult",
            count: 2,
          },
          {
            type: "child",
            count: 2,
          },
        ],
        customizations: {
          hotelId: hotel._id,
          roomTypes: ["Deluxe Ocean View"],
          activities: activities.map((a) => a._id),
        }
      },
      pricing: {
        basePrice: 1200,
        taxes: 120,
        totalPrice: 1320,
        currency: "USD"
      },
      itinerary: {
        currentDestination: "Phuket",
        progress: {
          completedActivities: [],
          nextActivity: activities[0]._id,
        },
        status: "NotStarted",
      },
      payment: {
        status: "Paid",
        breakdown: {
          basePrice: 1200,
          seasonalAdjustment: 360,
          taxes: 120,
          fees: 80,
        },
        method: "Credit Card",
        paidAt: "2024-12-15T01:29:00Z",
      },
      specialRequests: [
        "Early check-in requested",
        "Child seats for airport transfer",
      ],
      createdAt: "2024-12-15T01:29:00Z",
      updatedAt: "2024-12-15T01:29:00Z",
    });

    // Create Review
    const review = await Review.create({
      userId: user._id,
      itemType: "package",
      itemId: travelPackage._id,
      rating: 5,
      title: "Amazing family vacation!",
      content: "Had a wonderful time with my family. The activities were perfect for kids and adults alike.",
      ratings: {
        accommodation: 5,
        activities: 5,
        transportation: 4,
        valueForMoney: 5,
      },
      photos: ["https://example.com/user-reviews/657b3e1f/1.jpg"],
      verified: true,
      createdAt: "2025-01-05T12:00:00Z",
      helpfulVotes: 12,
    });

    console.log("Sample data seeded successfully!");
    return {
      user,
      hotel,
      activities,
      package: travelPackage,
      packageTemplate,
      booking,
      review,
      destination,
    };
  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
}
