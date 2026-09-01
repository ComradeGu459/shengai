import type { CreateDeliveryBody, DeliveryListQuery, RecoverDeliveryBody, UpdateDeliveryMetadataBody } from '@qimao-terms-cloud/contracts';

import { deliveryNotFound } from './deliveries.errors.js';
import { DeliveryRepository } from './deliveries.repository.js';

export class DeliveryService {
  constructor(private readonly repository: DeliveryRepository) {}

  confirmation(projectId: string, sessionId: string) { return this.repository.getConfirmation(projectId, sessionId); }
  list(projectId: string | null, query: DeliveryListQuery) { return this.repository.list(projectId, query); }

  async detail(projectId: string, deliveryId: string) {
    const detail = await this.repository.getDetail(projectId, deliveryId);
    if (!detail) throw deliveryNotFound('DELIVERY_NOT_FOUND', '交付产品不存在。');
    return detail;
  }

  async detailGlobal(deliveryId: string) {
    const projectId = await this.repository.getProjectId(deliveryId);
    if (!projectId) throw deliveryNotFound('DELIVERY_NOT_FOUND', '交付产品不存在。');
    return this.detail(projectId, deliveryId);
  }

  create(projectId: string, body: CreateDeliveryBody, key: string, requestId: string) {
    return this.repository.create(projectId, body, key, requestId);
  }

  recover(projectId: string, deliveryId: string, body: RecoverDeliveryBody, key: string, requestId: string) {
    return this.repository.recover(projectId, deliveryId, body, key, requestId);
  }

  updateMetadata(projectId: string, deliveryId: string, body: UpdateDeliveryMetadataBody, key: string, requestId: string) {
    return this.repository.updateMetadata(projectId, deliveryId, body, key, requestId);
  }

  async updateMetadataGlobal(deliveryId: string, body: UpdateDeliveryMetadataBody, key: string, requestId: string) {
    const projectId = await this.repository.getProjectId(deliveryId);
    if (!projectId) throw deliveryNotFound('DELIVERY_NOT_FOUND', '交付产品不存在。');
    return this.repository.updateMetadata(projectId, deliveryId, body, key, requestId);
  }

  readFile(projectId: string | null, deliveryId: string, fileId: string) { return this.repository.readFile(projectId, deliveryId, fileId); }
}
