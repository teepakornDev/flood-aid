import { randomUUID, timingSafeEqual } from "node:crypto";
import type { CreateSosRequest, SosPrivateStatus, SosReceipt } from "@floodaid/contracts";
import {
  BadRequestException, ConflictException, GoneException, Injectable, NotFoundException, ServiceUnavailableException,
} from "@nestjs/common";
import {
  createSosTrackingToken, encryptSosText, fingerprintSosRequest, hashSosKey, hashSosTrackingToken, parseSosSecret,
} from "./sos-crypto";
import { SosRepository } from "./sos.repository";

@Injectable()
export class SosService {
  constructor(private readonly cases: SosRepository) {}

  submit(body: CreateSosRequest, idempotencyKey: string | undefined): Promise<{ receipt: SosReceipt; replayed: boolean }> {
    const key = parseSosSecret(idempotencyKey);
    if (!key) throw new BadRequestException("Idempotency-Key must be a 32-byte base64url credential.");
    const dataKey = parseSosSecret(process.env.SOS_DATA_KEY);
    if (!dataKey) throw new ServiceUnavailableException("Local SOS simulation is unavailable.");

    const description = body.description?.trim() || undefined;
    const contact = body.contact?.trim() || undefined;
    const { longitude, latitude, accuracyMeters } = body.location;
    const canonical = JSON.stringify([
      longitude, latitude, accuracyMeters ?? null, body.assistanceType, body.peopleCount, description ?? null, contact ?? null,
    ]);
    const keyHash = hashSosKey(key);
    const requestHash = fingerprintSosRequest(key, canonical);
    const candidateId = randomUUID();

    return this.cases.transaction(async (manager) => {
      if (await this.cases.reserve(manager, candidateId, keyHash, requestHash)) {
        const trackingToken = createSosTrackingToken(key, candidateId);
        const createdAt = await this.cases.create(manager, {
          id: candidateId, request: body, trackingTokenHash: hashSosTrackingToken(trackingToken),
          description: encryptSosText(dataKey, candidateId, "description", description),
          contact: encryptSosText(dataKey, candidateId, "contact", contact),
        });
        return { receipt: { id: candidateId, status: "SUBMITTED", createdAt: createdAt.toISOString(), trackingToken }, replayed: false };
      }

      // A new statement in READ COMMITTED sees the competing transaction's committed case.
      const saved = await this.cases.retry(manager, keyHash);
      if (!saved) throw new ServiceUnavailableException("SOS is temporarily unavailable.");
      if (!timingSafeEqual(saved.requestHash, requestHash)) {
        throw new ConflictException("Idempotency-Key was already used for a different request.");
      }
      const trackingToken = createSosTrackingToken(key, saved.id);
      if (!saved.canReplay || hashSosTrackingToken(trackingToken) !== saved.trackingTokenHash) {
        throw new GoneException({ code: "SOS_RECEIPT_EXPIRED", message: "The saved SOS receipt can no longer be recovered." });
      }

      return { receipt: { id: saved.id, status: "SUBMITTED", createdAt: saved.createdAt.toISOString(), trackingToken }, replayed: true };
    });
  }

  async status(id: string, authorization: string | undefined): Promise<SosPrivateStatus> {
    const token = authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/i)?.[1];
    if (!token || !parseSosSecret(token)) throw new NotFoundException("SOS case not found.");
    const status = await this.cases.status(id, hashSosTrackingToken(token));
    if (!status) throw new NotFoundException("SOS case not found.");
    return status;
  }
}
