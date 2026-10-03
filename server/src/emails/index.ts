/**
 * Email package: templates, provider, and senders.
 * Domain modules queue via `notifications`; nobody sends ad-hoc mail.
 */
export * from "./shared";
export * from "./email.provider";
export * from "./password-reset";
export * from "./templates/admin";
export * from "./templates/auth";
export * from "./templates/booking";
export * from "./templates/payment";
