import { Request, Response } from "express";
import { RestockForecastService } from "../../services/sale/RestockForecastService";

class RestockForecastController {
  async handle(request: Request, response: Response) {
    const restockForecastService = new RestockForecastService();
    const forecast = await restockForecastService.execute(
      Number(request.query.days) || 30,
      Number(request.query.coverage_days) || 30,
    );

    return response.json(forecast);
  }
}

export { RestockForecastController };
