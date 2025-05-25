import { Elysia, t } from "elysia";
import {
  getActiveSliders,
  getAllSliders,
  createSlider,
  updateSlider,
  deleteSlider,
  getSliderById,
} from "~/controllers/slider";

const sliderRoutes = new Elysia({ prefix: "/api/v1/sliders" })
  .guard({
    detail: {
      tags: ["Sliders"],
      security: [{ BearerAuth: [] }],
      description: "Routes for managing banner sliders.",
    },
  })
  // Public routes
  .get("/", async () => {
    return await getActiveSliders();
  })

  .get(
    "/admin",
    async ({ headers, set, jwt_auth }) => {
      return await getAllSliders();
    },
    {
      detail: {
        summary: "Get all sliders (admin)",
        description: "Get all sliders for admin access",
      },
    }
  )

  .get(
    "/:id",
    async ({ headers, params, set, jwt_auth }) => {
      return await getSliderById(params.id);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Get slider by ID",
        description: "Get a specific slider by its ID",
      },
    }
  )

  .post(
    "/",
    async ({ headers, body, set, jwt_auth }) => {
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
      detail: {
        summary: "Create slider",
        description: "Create a new slider",
      },
    }
  )

  .put(
    "/:id",
    async ({ headers, params, body, set, jwt_auth }) => {
      return await updateSlider(params.id, body);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        title: t.Optional(t.String()),
        description: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
        ctaText: t.Optional(t.String()),
        ctaLink: t.Optional(t.String()),
        order: t.Optional(t.Number()),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: {
        summary: "Update slider",
        description: "Update an existing slider",
      },
    }
  )

  .delete(
    "/:id",
    async ({ headers, params, set, jwt_auth }) => {
      return await deleteSlider(params.id);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Delete slider",
        description: "Delete an existing slider",
      },
    }
  );

export default sliderRoutes;
