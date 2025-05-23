import { NotFoundError } from "elysia";
import Slider from "~/models/Slider";

// Get all active sliders
export const getActiveSliders = async () => {
  try {
    const sliders = await Slider.find({ isActive: true }).sort({ order: 1 });
    return { success: true, data: sliders };
  } catch (error) {
    console.error("Error fetching sliders:", error);
    throw error;
  }
};

// Get all sliders (admin)
export const getAllSliders = async () => {
  try {
    const sliders = await Slider.find().sort({ order: 1 });
    return { success: true, data: sliders };
  } catch (error) {
    console.error("Error fetching all sliders:", error);
    throw error;
  }
};

// Create a new slider
export const createSlider = async (data: any) => {
  try {
    const slider = new Slider(data);
    await slider.save();
    return { success: true, data: slider };
  } catch (error) {
    console.error("Error creating slider:", error);
    throw error;
  }
};

// Update a slider
export const updateSlider = async (id: string, data: any) => {
  try {
    const slider = await Slider.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!slider) {
      throw new NotFoundError("Slider not found");
    }

    return { success: true, data: slider };
  } catch (error) {
    console.error("Error updating slider:", error);
    throw error;
  }
};

// Delete a slider
export const deleteSlider = async (id: string) => {
  try {
    const slider = await Slider.findByIdAndDelete(id);

    if (!slider) {
      throw new NotFoundError("Slider not found");
    }

    return { success: true, data: slider };
  } catch (error) {
    console.error("Error deleting slider:", error);
    throw error;
  }
};

// Get slider by ID
export const getSliderById = async (id: string) => {
  try {
    const slider = await Slider.findById(id);

    if (!slider) {
      throw new NotFoundError("Slider not found");
    }

    return { success: true, data: slider };
  } catch (error) {
    console.error("Error fetching slider:", error);
    throw error;
  }
};
