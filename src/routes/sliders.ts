import { Elysia, t } from "elysia";
import {
  getActiveSliders,
  getAllSliders,
  createSlider,
  updateSlider,
  deleteSlider,
  getSliderById,
} from "../controllers/slider";
import { isAuthenticated, isAdmin } from "../middlewares/auth";

const sliderRoutes = new Elysia({ prefix: "/api/v1/sliders" })
  // Public routes
  .get("/", async () => {
    return await getActiveSliders();
  })

  // Admin routes (protected)
  .get("/admin", isAuthenticated, isAdmin, async () => {
    return await getAllSliders();
  })

  .get("/:id", isAuthenticated, isAdmin, async ({ params: { id } }) => {
    return await getSliderById(id);
  })

  .post(
    "/",
    isAuthenticated,
    isAdmin,
    async ({ body }) => {
      return await createSlider(body);
    },
    {
      body: t.Object({
        title: t.String(),
        description: t.String(),
        imageUrl: t.String(),
        ctaText: t.String(),
        ctaLink: t.String(),
        order: t.Optional(t.Number()),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  .put(
    "/:id",
    isAuthenticated,
    isAdmin,
    async ({ params: { id }, body }) => {
      return await updateSlider(id, body);
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
        description: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
        ctaText: t.Optional(t.String()),
        ctaLink: t.Optional(t.String()),
        order: t.Optional(t.Number()),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  .delete("/:id", isAuthenticated, isAdmin, async ({ params: { id } }) => {
    return await deleteSlider(id);
  });

export default sliderRoutes;
