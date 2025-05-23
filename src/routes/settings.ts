import { Elysia, t } from "elysia";
import { requireAdmin, requireAuth } from "~/middleware/auth";

// Placeholder for a future SettingsController
// This would be properly implemented with database storage
const settingsStore = {
  // Store settings in memory for now - in production this would be in a database
  adminSettings: new Map(),
  userSettings: new Map(),

  getAdminSettings(adminId: string) {
    if (!this.adminSettings.has(adminId)) {
      // Return default settings if none exist
      return {
        account: {
          firstName: "",
          lastName: "",
          email: "",
          jobTitle: "",
          bio: "",
        },
        security: {
          twoFactorEnabled: false,
          loginHistory: [],
        },
        notifications: {
          email: {
            marketing: true,
            security: true,
            account: true,
            updates: false,
          },
          push: {
            marketing: false,
            security: true,
            account: true,
            updates: false,
          },
        },
        appearance: {
          theme: "system",
          fontSize: "md",
          layout: "comfortable",
        },
        localization: {
          language: "en",
          timezone: "UTC",
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12",
        },
        payments: {
          providers: [],
          currency: "USD",
        },
      };
    }
    return this.adminSettings.get(adminId);
  },

  updateAdminSettings(adminId: string, settings: any) {
    const currentSettings = this.getAdminSettings(adminId);
    const updatedSettings = {
      ...currentSettings,
      ...settings,
      // Handle nested objects correctly
      ...(settings.account && {
        account: { ...currentSettings.account, ...settings.account },
      }),
      ...(settings.security && {
        security: { ...currentSettings.security, ...settings.security },
      }),
      ...(settings.notifications && {
        notifications: {
          ...currentSettings.notifications,
          ...(settings.notifications.email && {
            email: {
              ...currentSettings.notifications.email,
              ...settings.notifications.email,
            },
          }),
          ...(settings.notifications.push && {
            push: {
              ...currentSettings.notifications.push,
              ...settings.notifications.push,
            },
          }),
        },
      }),
      ...(settings.appearance && {
        appearance: { ...currentSettings.appearance, ...settings.appearance },
      }),
      ...(settings.localization && {
        localization: {
          ...currentSettings.localization,
          ...settings.localization,
        },
      }),
      ...(settings.payments && {
        payments: { ...currentSettings.payments, ...settings.payments },
      }),
    };
    this.adminSettings.set(adminId, updatedSettings);
    return updatedSettings;
  },

  getUserSettings(userId: string) {
    if (!this.userSettings.has(userId)) {
      // Return default settings if none exist
      return {
        account: {
          firstName: "",
          lastName: "",
          email: "",
          bio: "",
        },
        security: {
          twoFactorEnabled: false,
          loginHistory: [],
        },
        notifications: {
          email: {
            marketing: true,
            security: true,
            account: true,
            updates: false,
          },
          push: {
            marketing: false,
            security: true,
            account: true,
            updates: false,
          },
        },
        appearance: {
          theme: "system",
          fontSize: "md",
          layout: "comfortable",
        },
        localization: {
          language: "en",
          timezone: "UTC",
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12",
        },
      };
    }
    return this.userSettings.get(userId);
  },

  updateUserSettings(userId: string, settings: any) {
    const currentSettings = this.getUserSettings(userId);
    const updatedSettings = {
      ...currentSettings,
      ...settings,
      // Handle nested objects correctly
      ...(settings.account && {
        account: { ...currentSettings.account, ...settings.account },
      }),
      ...(settings.security && {
        security: { ...currentSettings.security, ...settings.security },
      }),
      ...(settings.notifications && {
        notifications: {
          ...currentSettings.notifications,
          ...(settings.notifications.email && {
            email: {
              ...currentSettings.notifications.email,
              ...settings.notifications.email,
            },
          }),
          ...(settings.notifications.push && {
            push: {
              ...currentSettings.notifications.push,
              ...settings.notifications.push,
            },
          }),
        },
      }),
      ...(settings.appearance && {
        appearance: { ...currentSettings.appearance, ...settings.appearance },
      }),
      ...(settings.localization && {
        localization: {
          ...currentSettings.localization,
          ...settings.localization,
        },
      }),
    };
    this.userSettings.set(userId, updatedSettings);
    return updatedSettings;
  },
};

// Define schemas for settings
const accountSchema = t.Object({
  firstName: t.Optional(t.String()),
  lastName: t.Optional(t.String()),
  email: t.Optional(t.String()),
  bio: t.Optional(t.String()),
  jobTitle: t.Optional(t.String()),
});

const securitySchema = t.Object({
  twoFactorEnabled: t.Optional(t.Boolean()),
});

const notificationsEmailSchema = t.Object({
  marketing: t.Optional(t.Boolean()),
  security: t.Optional(t.Boolean()),
  account: t.Optional(t.Boolean()),
  updates: t.Optional(t.Boolean()),
});

const notificationsPushSchema = t.Object({
  marketing: t.Optional(t.Boolean()),
  security: t.Optional(t.Boolean()),
  account: t.Optional(t.Boolean()),
  updates: t.Optional(t.Boolean()),
});

const notificationsSchema = t.Object({
  email: t.Optional(notificationsEmailSchema),
  push: t.Optional(notificationsPushSchema),
});

const appearanceSchema = t.Object({
  theme: t.Optional(
    t.Union([t.Literal("light"), t.Literal("dark"), t.Literal("system")])
  ),
  fontSize: t.Optional(
    t.Union([t.Literal("sm"), t.Literal("md"), t.Literal("lg")])
  ),
  layout: t.Optional(t.Union([t.Literal("comfortable"), t.Literal("compact")])),
});

const localizationSchema = t.Object({
  language: t.Optional(t.String()),
  timezone: t.Optional(t.String()),
  dateFormat: t.Optional(t.String()),
  timeFormat: t.Optional(t.String()),
});

const paymentsSchema = t.Object({
  currency: t.Optional(t.String()),
});

const settingsSchema = t.Object({
  account: t.Optional(accountSchema),
  security: t.Optional(securitySchema),
  notifications: t.Optional(notificationsSchema),
  appearance: t.Optional(appearanceSchema),
  localization: t.Optional(localizationSchema),
  payments: t.Optional(paymentsSchema),
});

// Settings routes
const settingsRoutes = new Elysia({ prefix: "/api/v1/settings" })
  // Admin settings routes
  .group("/admin", (app) =>
    app
      .derive(requireAdmin)
      .guard({
        detail: {
          description: "Admin settings endpoints",
          tags: ["Settings"],
          security: [{ bearerAuth: [] }],
        },
      })
      .get(
        "",
        async ({ set, jwt_auth }) => {
          // Get admin ID from the JWT auth context
          const admin = await jwt_auth.verify();
          if (!admin || !admin.id) {
            set.status = 401;
            return { success: false, message: "Unauthorized" };
          }

          return settingsStore.getAdminSettings(admin.id);
        },
        {
          detail: {
            summary: "Get admin settings",
          },
        }
      )
      .put(
        "",
        async ({ body, set, jwt_auth }) => {
          // Get admin ID from the JWT auth context
          const admin = await jwt_auth.verify();
          if (!admin || !admin.id) {
            set.status = 401;
            return { success: false, message: "Unauthorized" };
          }

          return settingsStore.updateAdminSettings(admin.id, body);
        },
        {
          body: settingsSchema,
          detail: {
            summary: "Update admin settings",
          },
        }
      )
  )
  // User settings routes
  .group("/user", (app) =>
    app
      .derive(requireAuth)
      .guard({
        detail: {
          description: "User settings endpoints",
          tags: ["Settings"],
          security: [{ bearerAuth: [] }],
        },
      })
      .get(
        "",
        async ({ set, jwt_auth }) => {
          // Get user ID from the JWT auth context
          const user = await jwt_auth.verify();
          if (!user || !user.id) {
            set.status = 401;
            return { success: false, message: "Unauthorized" };
          }

          return settingsStore.getUserSettings(user.id);
        },
        {
          detail: {
            summary: "Get user settings",
          },
        }
      )
      .put(
        "",
        async ({ body, set, jwt_auth }) => {
          // Get user ID from the JWT auth context
          const user = await jwt_auth.verify();
          if (!user || !user.id) {
            set.status = 401;
            return { success: false, message: "Unauthorized" };
          }

          return settingsStore.updateUserSettings(user.id, body);
        },
        {
          body: settingsSchema,
          detail: {
            summary: "Update user settings",
          },
        }
      )
  );

export default settingsRoutes;
