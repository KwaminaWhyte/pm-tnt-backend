import mongoose from "mongoose";
import TripperPost from "../models/TripperPost";

export const seedTripperPosts = async () => {
  try {
    // Check if we already have tripper posts
    const count = await TripperPost.countDocuments();
    if (count > 0) {
      console.log(
        `Skipping tripper posts seeding. ${count} posts already exist.`
      );
      return;
    }

    // Create fake user IDs for demo
    const fakeUserIds = [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ];

    // Sample post data
    const posts = [
      {
        userId: fakeUserIds[0],
        userName: "Alex Morgan",
        userAvatar: "https://randomuser.me/api/portraits/men/32.jpg",
        caption:
          "Amazing sunset at Santorini! One of the most beautiful views I've ever seen. #greece #travel #sunset",
        mediaUrl:
          "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        mediaType: "image",
        location: "Santorini, Greece",
        likes: 235,
        dislikes: 5,
        comments: [
          {
            userId: fakeUserIds[1],
            userName: "Sophia Chen",
            userAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
            text: "Absolutely stunning! I'm planning to visit next month",
            likes: 12,
          },
          {
            userId: fakeUserIds[2],
            userName: "Emma Davis",
            userAvatar: "https://randomuser.me/api/portraits/women/22.jpg",
            text: "The colors are incredible! Great shot!",
            likes: 8,
          },
        ],
      },
      {
        userId: fakeUserIds[1],
        userName: "Sophia Chen",
        userAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
        caption:
          "Street food in Bangkok is an experience everyone should have at least once. So many flavors! #thailand #foodie #streetfood",
        mediaUrl:
          "https://images.unsplash.com/photo-1516211881327-e5120a941edc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        mediaType: "image",
        location: "Bangkok, Thailand",
        likes: 412,
        dislikes: 2,
        comments: [
          {
            userId: fakeUserIds[2],
            userName: "James Wilson",
            userAvatar: "https://randomuser.me/api/portraits/men/46.jpg",
            text: "The Pad Thai there is amazing!",
            likes: 15,
          },
        ],
      },
      {
        userId: fakeUserIds[2],
        userName: "James Wilson",
        userAvatar: "https://randomuser.me/api/portraits/men/46.jpg",
        caption:
          "Hiking in the Swiss Alps is an unforgettable experience. The views are worth every step! #switzerland #hiking #mountains",
        mediaUrl:
          "https://images.unsplash.com/photo-1527683363561-06b471966154?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        mediaType: "image",
        location: "Swiss Alps, Switzerland",
        likes: 567,
        dislikes: 1,
        comments: [
          {
            userId: fakeUserIds[0],
            userName: "Alex Morgan",
            userAvatar: "https://randomuser.me/api/portraits/men/32.jpg",
            text: "What trail is this? I'm visiting next month!",
            likes: 4,
          },
          {
            userId: fakeUserIds[3],
            userName: "Emma Davis",
            userAvatar: "https://randomuser.me/api/portraits/women/22.jpg",
            text: "The scenery is breathtaking! Great photo!",
            likes: 7,
          },
        ],
      },
      {
        userId: fakeUserIds[3],
        userName: "Emma Davis",
        userAvatar: "https://randomuser.me/api/portraits/women/22.jpg",
        caption:
          "Luxury stay at the heart of Bali. Pure bliss and relaxation. #bali #luxury #travel",
        mediaUrl:
          "https://images.unsplash.com/photo-1537640538966-79f369143f8f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        mediaType: "image",
        location: "Ubud, Bali",
        likes: 823,
        dislikes: 0,
        comments: [
          {
            userId: fakeUserIds[1],
            userName: "Sophia Chen",
            userAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
            text: "Which resort is this? Looks amazing!",
            likes: 19,
          },
        ],
      },
      {
        userId: fakeUserIds[0],
        userName: "Alex Morgan",
        userAvatar: "https://randomuser.me/api/portraits/men/32.jpg",
        caption:
          "City lights of Tokyo. The perfect blend of tradition and modernity. #japan #tokyo #cityscape",
        mediaUrl:
          "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2336&q=80",
        mediaType: "image",
        location: "Tokyo, Japan",
        likes: 651,
        dislikes: 7,
        comments: [
          {
            userId: fakeUserIds[2],
            userName: "James Wilson",
            userAvatar: "https://randomuser.me/api/portraits/men/46.jpg",
            text: "Tokyo at night is magical!",
            likes: 11,
          },
        ],
      },
    ];

    // Insert the tripper posts
    await TripperPost.insertMany(posts);
    console.log(`${posts.length} Tripper posts seeded successfully.`);
  } catch (error) {
    console.error("Error seeding tripper posts:", error);
  }
};
