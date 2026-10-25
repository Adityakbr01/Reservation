import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { newId } from "../../utils/id";
import { getRatePlan } from "./rate-plan.service";
import type { UpsertDailyPricesInput } from "./daily-price.schema";

function parseDay(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new AppError(`Invalid date ${value}`, 400, "INVALID_DATE");
  return date;
}

export async function listDailyPrices(ratePlanId: string, from: string, to: string) {
  const plan = await getRatePlan(ratePlanId);
  const fromDate = parseDay(from);
  const toDate = parseDay(to);
  const span = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  if (span < 1 || span > 62) throw new AppError("Range must be 1–62 days", 400, "INVALID_RANGE");
  const endExclusive = new Date(toDate.getTime() + 86_400_000);
  const docs = await prisma.dailyPrice.findMany({
    where: {
      ratePlanId: plan.id,
      date: { gte: fromDate, lt: endExclusive },
    },
    orderBy: { date: "asc" },
  });
  return docs.map((d) => ({
    date: d.date.toISOString().slice(0, 10),
    price: d.price,
    currency: d.currency,
  }));
}

export async function upsertDailyPrices(ratePlanId: string, input: UpsertDailyPricesInput) {
  const plan = await getRatePlan(ratePlanId);
  const currency = (input.currency ?? plan.pricing.currency ?? "GBP").toUpperCase();
  if (input.prices.length > 0) {
    await prisma.$transaction(
      input.prices.map((p) => {
        const d = parseDay(p.date);
        return prisma.dailyPrice.upsert({
          where: {
            ratePlanId_date: {
              ratePlanId: plan.id,
              date: d,
            },
          },
          create: {
            id: newId(),
            propertyId: plan.propertyId,
            ratePlanId: plan.id,
            date: d,
            price: Math.round(p.price),
            currency,
          },
          update: {
            price: Math.round(p.price),
            currency,
          },
        });
      }),
    );
  }
  return listDailyPrices(plan.id, input.prices[0]?.date as string, input.prices[input.prices.length - 1]?.date as string);
}

export async function deleteDailyPrice(ratePlanId: string, date: string) {
  const plan = await getRatePlan(ratePlanId);
  await prisma.dailyPrice.deleteMany({
    where: { ratePlanId: plan.id, date: parseDay(date) },
  });
  return { deleted: true };
}
