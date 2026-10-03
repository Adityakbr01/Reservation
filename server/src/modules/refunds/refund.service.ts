import type { Paginated } from "../../utils/pagination";
import { listRefunds } from "./refund.model";
import type { ListRefundsFilter } from "./refund.model";
import type { Refund } from "./refund.model";

export async function listAllRefunds(filter: ListRefundsFilter): Promise<Paginated<Refund>> {
  return listRefunds(filter);
}
