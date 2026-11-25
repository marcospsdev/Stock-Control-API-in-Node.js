import { Request, Response } from "express";
import { InvoiceExtractionService } from "../../services/ai/InvoiceExtractionService";

class InvoiceExtractionController {
  async handle(request: Request, response: Response) {
    const invoiceExtractionService = new InvoiceExtractionService();
    const invoice = await invoiceExtractionService.execute({
      buffer: request.file?.buffer,
      mimetype: request.file?.mimetype,
    });

    return response.json(invoice);
  }
}

export { InvoiceExtractionController };
