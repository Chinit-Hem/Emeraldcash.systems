export type SomeDB = {
  id: number;
  name?: string;
  value?: string;
  updated_at?: string;
};

type ServiceResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

class SomeService {
  private readonly store = new Map<number, SomeDB>();

  async getById(id: number): Promise<ServiceResult<SomeDB>> {
    const data = this.store.get(id);
    return data ? { success: true, data } : { success: false, error: "Resource not found" };
  }

  async update(id: number, data: Partial<SomeDB>): Promise<ServiceResult<SomeDB>> {
    const next = {
      ...this.store.get(id),
      ...data,
      id,
      updated_at: new Date().toISOString(),
    };
    this.store.set(id, next);
    return { success: true, data: next };
  }

  async delete(id: number): Promise<ServiceResult<boolean>> {
    return { success: this.store.delete(id), data: true };
  }
}

export const someService = new SomeService();
