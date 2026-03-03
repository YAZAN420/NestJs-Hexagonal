export interface UpdateProductPayload {
  name?: string;
  description?: string;
  price?: number;
}
export class Product {
  constructor(
    public id: string,
    private name: string,
    private description: string,
    private price: number,
    private _createdBy: string,
    private createdAt: Date,
    private updatedAt: Date,
  ) {}
  public getId(): string {
    return this.id;
  }
  public getName(): string {
    return this.name;
  }
  public getDescription(): string {
    return this.description;
  }
  public getPrice(): number {
    return this.price;
  }
  get createdBy(): string {
    return this._createdBy;
  }
  public getCreatedAt(): Date {
    return this.createdAt;
  }
  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  public updateDetails(payload: UpdateProductPayload): void {
    if (payload.name !== undefined) {
      this.name = payload.name;
    }

    if (payload.description !== undefined) {
      this.description = payload.description;
    }

    if (payload.price !== undefined) {
      this.price = payload.price;
    }

    this.updatedAt = new Date();
  }
}
