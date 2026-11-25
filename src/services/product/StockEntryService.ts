import prismaClient from "../../prisma";

interface StockEntryItemRequest {
  product_id?: unknown;
  amount?: unknown;
}

interface StockEntryRequest {
  items?: unknown;
  source?: unknown;
  reference?: unknown;
}

const SOURCES = ["manual", "invoice"];
const MAX_ITEMS = 100;
const MAX_AMOUNT = 100_000;

class StockEntryService {
  async execute({ items, source, reference }: StockEntryRequest) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Send at least one item with product_id and amount.");
    }
    if (items.length > MAX_ITEMS) {
      throw new Error(`Send at most ${MAX_ITEMS} items per entry.`);
    }

    const totals = new Map<string, number>();
    for (const item of items as StockEntryItemRequest[]) {
      const productId = typeof item?.product_id === "string" ? item.product_id : "";
      const amount = Number(item?.amount);
      if (!productId || !Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
        throw new Error(`Each item needs a product_id and an integer amount between 1 and ${MAX_AMOUNT}.`);
      }
      totals.set(productId, (totals.get(productId) ?? 0) + amount);
    }

    const products = await prismaClient.product.findMany({
      where: { id: { in: [...totals.keys()] } },
      select: { id: true, name: true },
    });
    if (products.length !== totals.size) {
      throw new Error("One or more products were not found.");
    }

    const entrySource = typeof source === "string" && SOURCES.includes(source) ? source : "manual";
    const entryReference = typeof reference === "string" && reference.trim() ? reference.trim().slice(0, 100) : null;

    const productsAfter = await prismaClient.$transaction(async (tx) => {
      const result: { id: string; name: string; amount: number }[] = [];
      for (const product of products) {
        const amount = totals.get(product.id) as number;
        result.push(
          await tx.product.update({
            where: { id: product.id },
            data: { amount: { increment: amount } },
            select: { id: true, name: true, amount: true },
          }),
        );
        await tx.stockEntry.create({
          data: {
            product_id: product.id,
            product_name: product.name,
            amount,
            source: entrySource,
            reference: entryReference,
          },
        });
      }
      return result;
    });

    return {
      source: entrySource,
      reference: entryReference,
      totalUnits: [...totals.values()].reduce((sum, amount) => sum + amount, 0),
      products: productsAfter.map((product) => ({ ...product, added: totals.get(product.id) })),
    };
  }
}

export { StockEntryService };
