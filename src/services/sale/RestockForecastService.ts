import prismaClient from "../../prisma";

export type RestockStatus = "out" | "critical" | "low";

export interface RestockItem {
  product_id: string;
  name: string;
  category: string | null;
  stock: number;
  unitsSold: number;
  dailyRate: number;
  daysLeft: number | null;
  suggestedRestock: number;
  status: RestockStatus;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CRITICAL_DAYS = 7;
const ALLOWED_PERIODS = [7, 30, 90];

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

const periodTotals = async (from: Date, to: Date) => {
  const totals = await prismaClient.sale.aggregate({
    where: { created_at: { gte: from, lt: to } },
    _count: true,
    _sum: { total: true, amount: true },
  });
  return {
    sales: totals._count,
    units: totals._sum.amount ?? 0,
    revenue: round(totals._sum.total ?? 0),
  };
};

class RestockForecastService {
  async execute(days = 30, coverageDays = 30) {
    const periodDays = ALLOWED_PERIODS.includes(days) ? days : 30;
    const coverage = Math.min(Math.max(coverageDays, 7), 90);
    const now = new Date();
    const since = new Date(now.getTime() - periodDays * DAY_MS);
    const previousSince = new Date(since.getTime() - periodDays * DAY_MS);

    const [products, grouped, current, previous] = await Promise.all([
      prismaClient.product.findMany({ include: { category: { select: { name: true } } } }),
      prismaClient.sale.groupBy({
        by: ["product_id"],
        where: { created_at: { gte: since }, product_id: { not: null } },
        _sum: { amount: true, total: true },
      }),
      periodTotals(since, now),
      periodTotals(previousSince, since),
    ]);

    const soldByProduct = new Map(grouped.map((group) => [group.product_id, group._sum.amount ?? 0]));

    const items: RestockItem[] = [];
    for (const product of products) {
      const unitsSold = soldByProduct.get(product.id) ?? 0;
      const dailyRate = unitsSold / periodDays;
      const daysLeft = dailyRate > 0 ? product.amount / dailyRate : null;
      const suggestedRestock = Math.max(0, Math.ceil(dailyRate * coverage - product.amount));

      let status: RestockStatus | null = null;
      if (product.amount === 0) status = "out";
      else if (daysLeft !== null && daysLeft <= CRITICAL_DAYS) status = "critical";
      else if (daysLeft !== null && daysLeft < coverage && suggestedRestock > 0) status = "low";
      if (!status) continue;

      items.push({
        product_id: product.id,
        name: product.name,
        category: product.category?.name ?? null,
        stock: product.amount,
        unitsSold,
        dailyRate: round(dailyRate),
        daysLeft: daysLeft === null ? null : round(daysLeft, 1),
        suggestedRestock,
        status,
      });
    }

    const priority: Record<RestockStatus, number> = { out: 0, critical: 1, low: 2 };
    items.sort(
      (a, b) =>
        priority[a.status] - priority[b.status] ||
        (a.daysLeft ?? -1) - (b.daysLeft ?? -1) ||
        b.unitsSold - a.unitsSold,
    );

    return {
      periodDays,
      coverageDays: coverage,
      since: since.toISOString(),
      current,
      previous,
      counts: {
        out: items.filter((item) => item.status === "out").length,
        critical: items.filter((item) => item.status === "critical").length,
        low: items.filter((item) => item.status === "low").length,
      },
      items,
    };
  }
}

export { RestockForecastService };
