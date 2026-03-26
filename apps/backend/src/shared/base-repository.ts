import type { Knex } from "knex";

export abstract class BaseRepository {
  constructor(protected readonly db: Knex) {}
}
