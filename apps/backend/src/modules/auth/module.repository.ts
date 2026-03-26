import { BaseRepository } from "../../shared/base-repository";

export interface RetailerRecord {
  id: string;
  phone: string;
  name: string;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  owner_name?: string | null;
  credit_line_status: string;
  created_at: string;
  updated_at: string;
}

export class RetailerRepository extends BaseRepository {
  async findByPhone(phone: string): Promise<RetailerRecord | null> {
    const retailer = await this.db("retailers").where({ phone }).first();
    return retailer ?? null;
  }

  async findById(id: string): Promise<RetailerRecord | null> {
    const retailer = await this.db("retailers").where({ id }).first();
    return retailer ?? null;
  }

  async create(input: Pick<RetailerRecord, "phone" | "name" | "credit_line_status">): Promise<RetailerRecord> {
    const [id] = await this.db("retailers").insert(input);
    return this.findById(String(id)) as Promise<RetailerRecord>;
  }

  async update(id: string, input: Partial<RetailerRecord>): Promise<RetailerRecord> {
    await this.db("retailers").where({ id }).update({
      ...input,
      updated_at: this.db.fn.now(),
    });

    return this.findById(id) as Promise<RetailerRecord>;
  }
}
