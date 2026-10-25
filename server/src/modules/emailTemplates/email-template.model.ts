import { prisma } from "../../config/database";
import type { EmailTemplateCategory } from "../../emails/registry";

export interface EmailTemplateOverride {
  key: string;
  name: string;
  category: EmailTemplateCategory;
  subject: string;
  htmlBody: string;
  textBody: string;
  isEnabled: boolean;
  updatedBy: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export type EmailTemplateDocument = {
  id: string;
  key: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  isEnabled: boolean;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  _id: { toString: () => string };
};

export function toOverride(doc: any): {
  key: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  isEnabled: boolean;
  updatedBy: string | null;
  updatedAt: Date;
  createdAt: Date;
} {
  return {
    key: doc.key,
    subject: doc.subject,
    htmlBody: doc.htmlBody,
    textBody: doc.textBody,
    isEnabled: Boolean(doc.isEnabled),
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
  };
}

export const EmailTemplateModel = {
  find: (_query?: any) => ({
    exec: async () => {
      const docs = await prisma.emailTemplate.findMany();
      return docs.map((d) => ({
        ...d,
        _id: { toString: () => d.id },
      }));
    },
  }),
  findOne: (query: { key: string }) => ({
    exec: async () => {
      const doc = await prisma.emailTemplate.findUnique({ where: { key: query.key } });
      if (!doc) return null;
      return {
        ...doc,
        _id: { toString: () => doc.id },
      };
    },
  }),
  findOneAndDelete: (query: { key: string }) => ({
    exec: async () => {
      try {
        const deleted = await prisma.emailTemplate.delete({ where: { key: query.key } });
        return {
          ...deleted,
          _id: { toString: () => deleted.id },
        };
      } catch {
        return null;
      }
    },
  }),
  findOneAndUpdate: (query: { key: string }, update: any, _options?: any) => ({
    exec: async () => {
      const patch = update.$set ?? update;
      const doc = await prisma.emailTemplate.upsert({
        where: { key: query.key },
        create: {
          key: query.key,
          subject: patch.subject,
          htmlBody: patch.htmlBody,
          textBody: patch.textBody,
          isEnabled: patch.isEnabled ?? true,
          updatedBy: patch.updatedBy ? String(patch.updatedBy) : null,
        },
        update: {
          ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
          ...(patch.htmlBody !== undefined ? { htmlBody: patch.htmlBody } : {}),
          ...(patch.textBody !== undefined ? { textBody: patch.textBody } : {}),
          ...(patch.isEnabled !== undefined ? { isEnabled: patch.isEnabled } : {}),
          ...(patch.updatedBy !== undefined ? { updatedBy: patch.updatedBy ? String(patch.updatedBy) : null } : {}),
        },
      });
      return {
        ...doc,
        _id: { toString: () => doc.id },
      };
    },
  }),
};
