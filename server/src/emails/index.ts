/**
 * Email package: design system, registry, templates, provider, and senders.
 * Domain modules queue via `notifications`; nobody sends ad-hoc mail,
 * except account emails (password reset / changed / welcome), which send
 * directly and never throw into auth flows.
 */
export * from "./shared";
export * from "./registry";
export * from "./email.provider";
export * from "./password-reset";
export * from "./account";
export * from "./templates/admin";
export * from "./templates/auth";
export * from "./templates/booking";
export * from "./templates/payment";
export * from "./templates/welcome";
